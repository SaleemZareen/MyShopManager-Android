package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.ui.theme.*

@Composable
fun BackupSyncScreen(
    state: AppState,
    isUrdu: Boolean
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Slate200),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = if (isUrdu) "گوگل ڈرائیو اور لوکل بیک اپ" else "Google Drive & Local Backup",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Slate900
                    )

                    Text(
                        text = if (isUrdu) "اپنے تمام کھاتوں، اسٹاک اور روزنامچے کا ڈیٹا محفوظ رکھیں اور جب چاہیں بحال کریں۔" else "Secure all your ledger accounts, stock, and journal entries with auto cloud and local backup.",
                        fontSize = 12.sp,
                        color = Slate600
                    )

                    Button(
                        onClick = { /* Backup action */ },
                        colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Default.CloudUpload, contentDescription = "Backup", modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = if (isUrdu) "ابھی گوگل ڈرائیو پر بیک اپ لیں" else "Backup to Google Drive", fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = { /* Export action */ },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Icon(Icons.Default.FileDownload, contentDescription = "Export", modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(text = if (isUrdu) "لوکل فائل محفوظ کریں (JSON)" else "Export Local Backup (JSON)", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
