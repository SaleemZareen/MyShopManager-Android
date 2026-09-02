package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@Composable
fun GraphsDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    state: AppState,
    isUrdu: Boolean
) {
    if (!isOpen) return

    val salesTotal = remember(state.transactions) {
        state.transactions.filter { it.type == com.saleemkhan.myshopmanager.model.TransactionType.SALE }.sumOf { it.amount }
    }
    val purchaseTotal = remember(state.transactions) {
        state.transactions.filter { it.type == com.saleemkhan.myshopmanager.model.TransactionType.PURCHASE }.sumOf { it.amount }
    }
    val expenseTotal = remember(state.transactions) {
        state.transactions.filter { it.type == com.saleemkhan.myshopmanager.model.TransactionType.EXPENSE }.sumOf { it.amount }
    }

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
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.BarChart,
                            contentDescription = "Graphs",
                            tint = Color(0xFF4F46E5),
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isUrdu) "کاروباری گراف و تقابل" else "Business Visual Analytics",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                // Bar Comparison Visualizer
                val maxVal = maxOf(salesTotal, purchaseTotal, expenseTotal, 1.0)

                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Sales Bar
                    BarItem(
                        label = if (isUrdu) "فروخت (Sales)" else "Total Sales",
                        value = salesTotal,
                        color = DukanGreenPrimary,
                        ratio = (salesTotal / maxVal).toFloat()
                    )

                    // Purchase Bar
                    BarItem(
                        label = if (isUrdu) "خریداری (Purchases)" else "Total Purchases",
                        value = purchaseTotal,
                        color = Color(0xFF2563EB),
                        ratio = (purchaseTotal / maxVal).toFloat()
                    )

                    // Expense Bar
                    BarItem(
                        label = if (isUrdu) "اخراجات (Expenses)" else "Total Expenses",
                        value = expenseTotal,
                        color = Color(0xFFDC2626),
                        ratio = (expenseTotal / maxVal).toFloat()
                    )
                }

                Divider(color = Slate200, modifier = Modifier.padding(vertical = 4.dp))

                // Ratio & Health
                val grossMargin = if (salesTotal > 0) ((salesTotal - purchaseTotal) / salesTotal) * 100 else 0.0
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate50),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Slate200)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = if (isUrdu) "مجموعی مارجن:" else "Gross Profit Margin:",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            color = Slate700
                        )
                        Text(
                            text = "${"%.1f".format(grossMargin)}%",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = if (grossMargin >= 0) DukanGreenHover else RedDanger
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BarItem(
    label: String,
    value: Double,
    color: Color,
    ratio: Float
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate700)
            Text(text = FormatUtils.formatCurrency(value), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(14.dp)
                .background(Slate100, RoundedCornerShape(7.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(ratio.coerceIn(0.05f, 1f))
                    .background(color, RoundedCornerShape(7.dp))
            )
        }
    }
}
