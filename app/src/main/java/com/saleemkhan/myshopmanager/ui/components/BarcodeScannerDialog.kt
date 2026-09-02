package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.model.InventoryItem
import com.saleemkhan.myshopmanager.ui.theme.*

@Composable
fun BarcodeScannerDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    inventory: List<InventoryItem>,
    onItemScanned: (InventoryItem) -> Unit,
    onManualCodeEntered: (String) -> Unit,
    isUrdu: Boolean
) {
    if (!isOpen) return

    var manualBarcode by remember { mutableStateOf("") }
    var matchedItem by remember { mutableStateOf<InventoryItem?>(null) }
    var scanStatusMessage by remember { mutableStateOf<String?>(null) }

    fun processBarcode(code: String) {
        val trimmed = code.trim()
        val found = inventory.find { it.barcode == trimmed || it.sku == trimmed }
        if (found != null) {
            matchedItem = found
            scanStatusMessage = null
            onItemScanned(found)
        } else {
            matchedItem = null
            scanStatusMessage = if (isUrdu) "یہ بارکوڈ اسٹاک میں موجود نہیں!" else "Barcode not found in inventory!"
            onManualCodeEntered(trimmed)
        }
    }

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
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUrdu) "بارکوڈ و کیو آر اسکینر" else "Barcode / QR Scanner",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                // Camera Scanner Viewport Simulation Box
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Slate900),
                    contentAlignment = Alignment.Center
                ) {
                    // Reticle
                    Box(
                        modifier = Modifier
                            .size(130.dp)
                            .border(BorderStroke(2.dp, DukanGreenPrimary), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = "Scanner Frame",
                            tint = Color.White.copy(alpha = 0.5f),
                            modifier = Modifier.size(48.dp)
                        )
                    }

                    Text(
                        text = if (isUrdu) "کیمرہ بارکوڈ کے سامنے رکھیں" else "Point camera at barcode/QR",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 11.sp,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 8.dp)
                    )
                }

                // Manual Barcode Input
                OutlinedTextField(
                    value = manualBarcode,
                    onValueChange = { manualBarcode = it },
                    label = { Text(if (isUrdu) "بارکوڈ نمبر درج کریں" else "Or Enter Barcode Number") },
                    placeholder = { Text("e.g. 896400012345") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DukanGreenPrimary,
                        unfocusedBorderColor = Slate300
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                if (scanStatusMessage != null) {
                    Text(
                        text = scanStatusMessage!!,
                        fontSize = 12.sp,
                        color = AmberWarning,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Match result card
                if (matchedItem != null) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = DukanGreenLight),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, GreenSuccessBorder)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = matchedItem!!.name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = Slate900
                                )
                                Text(
                                    text = "${if (isUrdu) "دستیاب مقدار:" else "Stock:"} ${matchedItem!!.quantity} ${matchedItem!!.unit}",
                                    fontSize = 11.sp,
                                    color = Slate600
                                )
                            }
                            Text(
                                text = "Rs. ${matchedItem!!.sellingPrice.toInt()}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = DukanGreenHover
                            )
                        }
                    }
                }

                // Search / Scan Button
                Button(
                    onClick = {
                        if (manualBarcode.isNotBlank()) {
                            processBarcode(manualBarcode)
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Icon(imageVector = Icons.Default.Search, contentDescription = "Search", modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isUrdu) "آئٹم تلاش کریں" else "Lookup Item",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
