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
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@Composable
fun SaleInventoryItemDialog(
    item: InventoryItem?,
    isOpen: Boolean,
    onClose: () -> Unit,
    onConfirmSale: (item: InventoryItem, qty: Double, totalAmount: Double, customerName: String?) -> Unit,
    isUrdu: Boolean
) {
    if (!isOpen || item == null) return

    var sellQty by remember { mutableStateOf("1") }
    var customPrice by remember { mutableStateOf(item.sellingPrice.toString()) }
    var customerName by remember { mutableStateOf("") }

    val parsedQty = sellQty.toDoubleOrNull() ?: 0.0
    val parsedPrice = customPrice.toDoubleOrNull() ?: item.sellingPrice
    val totalAmount = parsedQty * parsedPrice

    Dialog(onDismissRequest = onClose) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUrdu) "کوئیک پی او ایس فروخت" else "Quick POS Sale",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                // Selected Item Details
                Card(
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
                            Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Slate900)
                            Text(text = "${if (isUrdu) "موجودہ اسٹاک:" else "In Stock:"} ${item.quantity} ${item.unit}", fontSize = 11.sp, color = Slate600)
                        }
                        Text(text = "Rs. ${item.sellingPrice.toInt()}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DukanGreenHover)
                    }
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = sellQty,
                        onValueChange = { sellQty = it },
                        label = { Text(if (isUrdu) "فروخت مقدار" else "Sell Quantity") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = customPrice,
                        onValueChange = { customPrice = it },
                        label = { Text(if (isUrdu) "فی یونٹ قیمت" else "Price / Unit") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = customerName,
                    onValueChange = { customerName = it },
                    label = { Text(if (isUrdu) "کسٹمر کا نام (اختیاری)" else "Customer Name (Optional)") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                // Total Summary Pill
                Surface(
                    color = Slate100,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = if (isUrdu) "کل بل:" else "Total Bill:", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate700)
                        Text(text = FormatUtils.formatCurrency(totalAmount), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = DukanGreenPrimary)
                    }
                }

                Button(
                    onClick = {
                        if (parsedQty > 0) {
                            onConfirmSale(item, parsedQty, totalAmount, customerName.ifBlank { null })
                            onClose()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text(
                        text = if (isUrdu) "فروخت مکمل کریں" else "Complete POS Sale",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
