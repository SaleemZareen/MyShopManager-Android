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
fun RestoreConfirmDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    backupDate: String,
    recordCount: Int,
    onConfirmRestore: () -> Unit,
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
                // Warning Icon Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.WarningAmber,
                        contentDescription = "Warning",
                        tint = AmberWarning,
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = if (isUrdu) "بیک اپ بحالی کی تصدیق" else "Confirm Backup Restore",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                }

                Text(
                    text = if (isUrdu) 
                        "کیا آپ واقعی پچھلا بیک اپ بحال کرنا چاہتے ہیں؟ اس سے موجودہ تمام ڈیٹا اس بیک اپ فائل سے تبدیل ہو جائے گا۔"
                    else 
                        "Are you sure you want to restore this backup? This will replace your current store data with the selected snapshot.",
                    fontSize = 12.sp,
                    color = Slate600
                )

                // Backup Snapshot Details
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFFDE68A))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = "${if (isUrdu) "بیک اپ تاریخ:" else "Backup Timestamp:"} $backupDate",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate800
                        )
                        Text(
                            text = "${if (isUrdu) "کل محفوظ ریکارڈز:" else "Total Records:"} $recordCount entries",
                            fontSize = 11.sp,
                            color = Slate700
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onClose,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(text = if (isUrdu) "منسوخ کریں" else "Cancel")
                    }

                    Button(
                        onClick = {
                            onConfirmRestore()
                            onClose()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = AmberWarning),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = if (isUrdu) "بحال کریں" else "Restore",
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }
                }
            }
        }
    }
}
