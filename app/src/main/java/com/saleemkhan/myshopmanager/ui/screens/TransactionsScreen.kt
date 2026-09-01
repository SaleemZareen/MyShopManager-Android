package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    state: AppState,
    isUrdu: Boolean,
    onOpenQuickEntry: (TransactionType) -> Unit,
    onDeleteTransaction: (String) -> Unit
) {
    var search by remember { mutableStateOf("") }
    var filterType by remember { mutableStateOf<TransactionType?>(null) }

    val filteredTransactions = remember(state.transactions, search, filterType) {
        state.transactions.filter { tx ->
            val matchesType = filterType == null || tx.type == filterType
            val matchesSearch = search.isBlank() ||
                    tx.category.contains(search, ignoreCase = true) ||
                    (tx.partyName?.contains(search, ignoreCase = true) == true) ||
                    (tx.notes?.contains(search, ignoreCase = true) == true)
            matchesType && matchesSearch
        }
    }

    val totalInflow = remember(filteredTransactions) {
        filteredTransactions
            .filter { it.type == TransactionType.SALE || it.type == TransactionType.RECEIPT }
            .sumOf { it.amount }
    }

    val totalOutflow = remember(filteredTransactions) {
        filteredTransactions
            .filter { it.type == TransactionType.PURCHASE || it.type == TransactionType.EXPENSE || it.type == TransactionType.PAYMENT }
            .sumOf { it.amount }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        // Top KPI summary strip
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                border = BorderStroke(1.dp, Color(0xFFA7F3D0))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "آمدن (Inflow)" else "Total Inflow",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF065F46)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalInflow),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = DukanGreenHover
                    )
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                border = BorderStroke(1.dp, Color(0xFFFECACA))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "اخراجات (Outflow)" else "Total Outflow",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF991B1B)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalOutflow),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = RedDanger
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Search and Quick Filter strip
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            placeholder = { Text(if (isUrdu) "روزنامچہ میں تلاش کریں..." else "Search transactions...", fontSize = 12.sp) },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = Slate400) },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedBorderColor = DukanGreenPrimary,
                unfocusedBorderColor = Slate200
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Type filter pills
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val filterOptions = listOf(
                null to (if (isUrdu) "تمام" else "All"),
                TransactionType.SALE to (if (isUrdu) "فروخت" else "Sales"),
                TransactionType.PURCHASE to (if (isUrdu) "خریداری" else "Purchases"),
                TransactionType.EXPENSE to (if (isUrdu) "اخراجات" else "Expenses"),
                TransactionType.RECEIPT to (if (isUrdu) "وصولی" else "Receipts"),
                TransactionType.PAYMENT to (if (isUrdu) "ادائیگی" else "Payments")
            )

            filterOptions.forEach { (type, label) ->
                val isSelected = filterType == type
                Surface(
                    onClick = { filterType = type },
                    shape = RoundedCornerShape(10.dp),
                    color = if (isSelected) DukanGreenPrimary else Color.White,
                    border = BorderStroke(1.dp, if (isSelected) DukanGreenPrimary else Slate200)
                ) {
                    Text(
                        text = label,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) Color.White else Slate700,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Transactions List
        if (filteredTransactions.isEmpty()) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.ReceiptLong,
                        contentDescription = "Empty",
                        tint = Slate300,
                        modifier = Modifier.size(48.dp)
                    )
                    Text(
                        text = if (isUrdu) "کوئی اینٹری نہیں ملی" else "No transactions found",
                        fontSize = 13.sp,
                        color = Slate500,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                items(filteredTransactions, key = { it.id }) { tx ->
                    val (typeColor, typeBg, typeLabel) = when (tx.type) {
                        TransactionType.SALE -> Triple(DukanGreenHover, DukanGreenLight, if (isUrdu) "فروخت" else "Sale")
                        TransactionType.PURCHASE -> Triple(Color(0xFF1E40AF), Color(0xFFDBEAFE), if (isUrdu) "خریداری" else "Purchase")
                        TransactionType.EXPENSE -> Triple(RedDanger, RedDangerLight, if (isUrdu) "خرچہ" else "Expense")
                        TransactionType.RECEIPT -> Triple(AmberWarning, AmberWarningLight, if (isUrdu) "وصولی" else "Receipt")
                        TransactionType.PAYMENT -> Triple(Color(0xFF6B21A8), Color(0xFFF3E8FF), if (isUrdu) "ادائیگی" else "Payment")
                        else -> Triple(Slate700, Slate100, tx.type.name)
                    }

                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Slate200),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(typeBg, RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = typeLabel.take(1),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = typeColor
                                    )
                                }

                                Spacer(modifier = Modifier.width(10.dp))

                                Column {
                                    Text(
                                        text = tx.partyName ?: tx.category,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Slate900,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = FormatUtils.formatDisplayDate(tx.date),
                                            fontSize = 10.sp,
                                            color = Slate500
                                        )
                                        Text(
                                            text = "• ${tx.paymentMethod.name}",
                                            fontSize = 10.sp,
                                            color = Slate400
                                        )
                                    }
                                    if (!tx.notes.isNullOrBlank()) {
                                        Text(
                                            text = tx.notes,
                                            fontSize = 10.sp,
                                            color = Slate600,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = FormatUtils.formatCurrency(tx.amount),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = typeColor
                                )

                                IconButton(
                                    onClick = { onDeleteTransaction(tx.id) },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DeleteOutline,
                                        contentDescription = "Delete",
                                        tint = Slate400,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
