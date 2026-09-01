package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import com.saleemkhan.myshopmanager.utils.Translations

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickEntryDialog(
    initialType: TransactionType,
    isOpen: Boolean,
    onClose: () -> Unit,
    onSubmit: (Transaction) -> Unit,
    isUrdu: Boolean,
    state: AppState
) {
    if (!isOpen) return

    var type by remember { mutableStateOf(initialType) }
    var amount by remember { mutableStateOf("") }
    var partyName by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(if (initialType == TransactionType.EXPENSE) "ELECTRICITY" else "General") }
    var paymentMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var notes by remember { mutableStateOf("") }

    val typeTabs = listOf(
        Triple(TransactionType.SALE, if (isUrdu) "فروخت" else "Sale", DukanGreenPrimary),
        Triple(TransactionType.PURCHASE, if (isUrdu) "خریداری" else "Purchase", Color(0xFF2563EB)),
        Triple(TransactionType.EXPENSE, if (isUrdu) "اخراجات" else "Expense", Color(0xFFDC2626)),
        Triple(TransactionType.RECEIPT, if (isUrdu) "ادھار وصولی" else "Receipt", Color(0xFFD97706)),
        Triple(TransactionType.PAYMENT, if (isUrdu) "ادائیگی" else "Payment", Color(0xFF7C3AED))
    )

    Dialog(onDismissRequest = onClose) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUrdu) "کوئیک اینٹری" else "Quick Transaction Entry",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Slate900
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Slate500
                        )
                    }
                }

                // Type selector tabs
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    typeTabs.forEach { (tabType, label, color) ->
                        val isSelected = type == tabType
                        Surface(
                            onClick = { type = tabType },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) color else Slate100,
                            modifier = Modifier
                                .weight(1f)
                                .height(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else Slate700
                                )
                            }
                        }
                    }
                }

                // Amount Field
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text(if (isUrdu) "رقم (روپے)" else "Amount (Rs.)") },
                    placeholder = { Text("0") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DukanGreenPrimary,
                        unfocusedBorderColor = Slate300
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Party Name Field (Customer / Supplier / Payee)
                val partyLabel = when (type) {
                    TransactionType.SALE, TransactionType.RECEIPT -> if (isUrdu) "کسٹمر کا نام" else "Customer Name"
                    TransactionType.PURCHASE, TransactionType.PAYMENT -> if (isUrdu) "سپلائر کا نام" else "Supplier Name"
                    TransactionType.EXPENSE -> if (isUrdu) "وصول کنندہ / تفصیل" else "Paid To / Recipient"
                    else -> if (isUrdu) "نام" else "Party Name"
                }

                OutlinedTextField(
                    value = partyName,
                    onValueChange = { partyName = it },
                    label = { Text(partyLabel) },
                    placeholder = { Text(if (isUrdu) "نام درج کریں" else "e.g. Walk-in Customer") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DukanGreenPrimary,
                        unfocusedBorderColor = Slate300
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Category selector if expense
                if (type == TransactionType.EXPENSE) {
                    Text(
                        text = if (isUrdu) "خرچے کی قسم" else "Expense Category",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Slate700
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Translations.EXPENSE_CATEGORIES_TRANSLATED.take(8).forEach { cat ->
                            val isSelected = category == cat.id
                            Surface(
                                onClick = { category = cat.id },
                                shape = RoundedCornerShape(8.dp),
                                color = if (isSelected) RedDangerLight else Slate100,
                                border = BorderStroke(1.dp, if (isSelected) RedDanger else Slate200)
                            ) {
                                Text(
                                    text = if (isUrdu) cat.ur else cat.en,
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) RedDanger else Slate700,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                )
                            }
                        }
                    }
                }

                // Payment Method
                Text(
                    text = if (isUrdu) "طریقہ ادائیگی" else "Payment Method",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Slate700
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        PaymentMethod.CASH to (if (isUrdu) "نقد" else "Cash"),
                        PaymentMethod.BANK to (if (isUrdu) "بینک" else "Bank"),
                        PaymentMethod.EASYPAISA to "EasyPaisa",
                        PaymentMethod.JAZZCASH to "JazzCash",
                        PaymentMethod.CREDIT to (if (isUrdu) "ادھار" else "Udhaar")
                    ).forEach { (method, label) ->
                        val isSelected = paymentMethod == method
                        Surface(
                            onClick = { paymentMethod = method },
                            shape = RoundedCornerShape(8.dp),
                            color = if (isSelected) DukanGreenLight else Slate100,
                            border = BorderStroke(1.dp, if (isSelected) DukanGreenPrimary else Slate200),
                            modifier = Modifier.weight(1f)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.padding(vertical = 6.dp)
                            ) {
                                Text(
                                    text = label,
                                    fontSize = 9.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) DukanGreenHover else Slate700
                                )
                            }
                        }
                    }
                }

                // Notes Field
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text(if (isUrdu) "تفصیل / نوٹ" else "Notes / Description") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = DukanGreenPrimary,
                        unfocusedBorderColor = Slate300
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Save button
                Button(
                    onClick = {
                        val parsedAmount = amount.toDoubleOrNull() ?: 0.0
                        if (parsedAmount > 0) {
                            val newTx = Transaction(
                                id = "tx_${System.currentTimeMillis()}",
                                type = type,
                                amount = parsedAmount,
                                category = category,
                                paymentMethod = paymentMethod,
                                partyName = partyName.ifBlank { null },
                                date = FormatUtils.getTodayIsoDate(),
                                notes = notes.ifBlank { null }
                            )
                            onSubmit(newTx)
                            onClose()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Text(
                        text = if (isUrdu) "اینٹری محفوظ کریں" else "Save Transaction",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}
