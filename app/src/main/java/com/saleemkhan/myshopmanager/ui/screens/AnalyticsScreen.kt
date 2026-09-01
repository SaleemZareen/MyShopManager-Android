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
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.model.TransactionType
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@Composable
fun AnalyticsScreen(
    state: AppState,
    isUrdu: Boolean
) {
    val totalSales = remember(state.transactions) {
        state.transactions.filter { it.type == TransactionType.SALE }.sumOf { it.amount }
    }
    val totalPurchases = remember(state.transactions) {
        state.transactions.filter { it.type == TransactionType.PURCHASE }.sumOf { it.amount }
    }
    val totalExpenses = remember(state.transactions) {
        state.transactions.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amount }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
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
                        text = if (isUrdu) "کاروباری رجحانات اور گرافکس" else "Business Trends & Distribution",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Slate900
                    )

                    // Analytics Distribution Bars
                    val totalVolume = (totalSales + totalPurchases + totalExpenses).coerceAtLeast(1.0)
                    val salesPercent = ((totalSales / totalVolume) * 100).toInt()
                    val purchasesPercent = ((totalPurchases / totalVolume) * 100).toInt()
                    val expensesPercent = ((totalExpenses / totalVolume) * 100).toInt()

                    AnalyticsBarRow(if (isUrdu) "فروخت (Sales)" else "Sales", totalSales, salesPercent, DukanGreenPrimary)
                    AnalyticsBarRow(if (isUrdu) "خریداری (Purchases)" else "Purchases", totalPurchases, purchasesPercent, Color(0xFF2563EB))
                    AnalyticsBarRow(if (isUrdu) "اخراجات (Expenses)" else "Expenses", totalExpenses, expensesPercent, RedDanger)
                }
            }
        }
    }
}

@Composable
fun AnalyticsBarRow(
    label: String,
    amount: Double,
    percent: Int,
    barColor: Color
) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Slate800)
            Text(text = "${FormatUtils.formatCurrency(amount)} ($percent%)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = barColor)
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .background(Slate100, RoundedCornerShape(5.dp))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(fraction = (percent / 100f).coerceIn(0.02f, 1f))
                    .background(barColor, RoundedCornerShape(5.dp))
            )
        }
    }
}
