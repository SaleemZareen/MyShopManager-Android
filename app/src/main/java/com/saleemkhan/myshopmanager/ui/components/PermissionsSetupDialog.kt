package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.ui.theme.*

@Composable
fun PermissionsSetupDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    onGrantPermissions: () -> Unit,
    isUrdu: Boolean
) {
    if (!isOpen) return

    Dialog(onDismissRequest = onClose) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUrdu) "ضروری پرمیشنز کی اجازت" else "Required Permissions Setup",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                Text(
                    text = if (isUrdu) 
                        "ایپ کی مکمل خصوصیات (کیمرہ بارکوڈ اسکینر، آڈیو وائس اینٹری، اور بیک اپ فائل ایکسپورٹ) کے لیے درج ذیل اجازتیں درکار ہیں:"
                    else 
                        "For full functionality (Camera barcode scanning, Audio voice recording, and local backup storage), please grant the following permissions:",
                    fontSize = 12.sp,
                    color = Slate600
                )

                // List of permissions
                listOf(
                    Triple(Icons.Default.CameraAlt, if (isUrdu) "کیمرہ پرمیشن (بارکوڈ)" else "Camera Permission", if (isUrdu) "بارکوڈ و کیو آر کوڈ اسکین کرنے کے لیے" else "For fast product barcode and QR scanning"),
                    Triple(Icons.Default.Mic, if (isUrdu) "مائیکروفون پرمیشن" else "Microphone Permission", if (isUrdu) "اردو وائس اسمارٹ اینٹری کے لیے" else "For smart Urdu/English speech-to-text entries"),
                    Triple(Icons.Default.Storage, if (isUrdu) "اسٹوریج اور بیک اپ" else "Storage & Backup", if (isUrdu) "پی ڈی ایف اور ایکسل بیک اپ محفوظ کرنے کے لیے" else "For PDF/Excel report exporting and local offline backups")
                ).forEach { (icon, title, desc) ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate50),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Slate200)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(imageVector = icon, contentDescription = title, tint = DukanGreenPrimary, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Slate900)
                                Text(text = desc, fontSize = 11.sp, color = Slate600)
                            }
                        }
                    }
                }

                Button(
                    onClick = {
                        onGrantPermissions()
                        onClose()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text(
                        text = if (isUrdu) "اجازت دیں اور جاری رکھیں" else "Grant Permissions & Continue",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
