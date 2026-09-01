package com.saleemkhan.myshopmanager

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.signin.GoogleSignIn
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.OutputStreamWriter
import java.io.PrintWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class BackupSyncWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val prefs = context.getSharedPreferences("backup_sync_prefs", Context.MODE_PRIVATE)
            val interval = prefs.getInt("auto_sync_interval", 0)
            if (interval <= 0) {
                return@withContext Result.success()
            }

            val destination = prefs.getString("sync_destination", "DRIVE") ?: "DRIVE"
            val appStateJson = prefs.getString("latest_app_state_json", null)
                ?: return@withContext Result.success()

            val nowIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            var localSuccess = true
            var driveSuccess = true

            // 1. Local Sync
            if (destination.contains("LOCAL", ignoreCase = true) || destination.equals("BOTH", ignoreCase = true)) {
                try {
                    val treeUriString = prefs.getString("backup_tree_uri", null)
                    val fileName = "myshopmanager_backup.json"
                    var written = false

                    if (treeUriString != null) {
                        val treeUri = Uri.parse(treeUriString)
                        val pickedDir = DocumentFile.fromTreeUri(context, treeUri)
                        if (pickedDir != null && pickedDir.canWrite()) {
                            var existing = pickedDir.findFile(fileName)
                            if (existing == null) {
                                existing = pickedDir.createFile("application/json", fileName)
                            }
                            if (existing != null) {
                                context.contentResolver.openOutputStream(existing.uri, "wt")?.use { os ->
                                    os.write(appStateJson.toByteArray(Charsets.UTF_8))
                                    os.flush()
                                }
                                written = true
                            }
                        }
                    }

                    if (!written) {
                        val fallbackDir = context.getExternalFilesDir("MyShopBackups") ?: context.filesDir
                        fallbackDir.mkdirs()
                        val targetFile = File(fallbackDir, fileName)
                        targetFile.writeText(appStateJson, Charsets.UTF_8)
                    }

                    prefs.edit().putString("last_local_backup", nowIso).apply()
                } catch (e: Exception) {
                    e.printStackTrace()
                    localSuccess = false
                }
            }

            // 2. Google Drive Sync
            if (destination.contains("DRIVE", ignoreCase = true) || destination.equals("BOTH", ignoreCase = true)) {
                try {
                    val account = GoogleSignIn.getLastSignedInAccount(context)
                    if (account != null && account.account != null) {
                        val token = GoogleAuthUtil.getToken(
                            context,
                            account.account!!,
                            "oauth2:https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file"
                        )

                        // Search existing in appDataFolder
                        val searchUrl = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D'myshopmanager_backup.json'+and+trashed%3Dfalse&fields=files(id,name)"
                        val searchConn = URL(searchUrl).openConnection() as HttpURLConnection
                        searchConn.requestMethod = "GET"
                        searchConn.setRequestProperty("Authorization", "Bearer $token")
                        searchConn.connect()

                        var fileId: String? = null
                        if (searchConn.responseCode in 200..299) {
                            val searchResponse = searchConn.inputStream.bufferedReader().use { it.readText() }
                            val jsonObj = JSONObject(searchResponse)
                            val filesArray = jsonObj.optJSONArray("files")
                            if (filesArray != null && filesArray.length() > 0) {
                                fileId = filesArray.getJSONObject(0).optString("id")
                            }
                        }
                        searchConn.disconnect()

                        if (fileId != null && fileId.isNotEmpty()) {
                            val updateUrl = "https://www.googleapis.com/upload/drive/v3/files/$fileId?uploadType=media"
                            val updateConn = URL(updateUrl).openConnection() as HttpURLConnection
                            updateConn.requestMethod = "PATCH"
                            updateConn.doOutput = true
                            updateConn.setRequestProperty("Authorization", "Bearer $token")
                            updateConn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                            updateConn.outputStream.use { os ->
                                os.write(appStateJson.toByteArray(Charsets.UTF_8))
                                os.flush()
                            }
                            updateConn.disconnect()
                        } else {
                            val boundary = "==MyShopManagerBoundary" + System.currentTimeMillis() + "=="
                            val createUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
                            val createConn = URL(createUrl).openConnection() as HttpURLConnection
                            createConn.requestMethod = "POST"
                            createConn.doOutput = true
                            createConn.setRequestProperty("Authorization", "Bearer $token")
                            createConn.setRequestProperty("Content-Type", "multipart/related; boundary=$boundary")

                            val metadataJson = "{\"name\": \"myshopmanager_backup.json\", \"parents\": [\"appDataFolder\"]}"
                            createConn.outputStream.use { os ->
                                val writer = PrintWriter(OutputStreamWriter(os, "UTF-8"), true)
                                writer.append("--").append(boundary).append("\r\n")
                                writer.append("Content-Type: application/json; charset=UTF-8\r\n\r\n")
                                writer.append(metadataJson).append("\r\n")
                                writer.append("--").append(boundary).append("\r\n")
                                writer.append("Content-Type: application/json; charset=UTF-8\r\n\r\n")
                                writer.append(appStateJson).append("\r\n")
                                writer.append("--").append(boundary).append("--\r\n")
                                writer.flush()
                            }
                            createConn.disconnect()
                        }

                        prefs.edit().putString("last_cloud_backup", nowIso).apply()
                    } else {
                        driveSuccess = false
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    driveSuccess = false
                }
            }

            if (localSuccess || driveSuccess) {
                prefs.edit().putString("last_sync_time", nowIso).apply()
            }

            Result.success()
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }
}
