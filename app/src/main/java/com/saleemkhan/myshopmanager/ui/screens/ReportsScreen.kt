package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.model.TransactionType
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import com.saleemkhan.myshopmanager.utils.TaxEngine

@Composable
fun ReportsScreen(
    state: AppState,
    isUrdu: Boolean
) {
    val summary = remember(state) { TaxEngine.calculateFbrSummary(state) }

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
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = if (isUrdu) "نفع و نقصان کا گوشوارہ (Profit & Loss)" else "Profit & Loss Statement",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Slate900
                    )

                    Divider(color = Slate100)

                    ReportMetricRow(if (isUrdu) "کل فروخت (Sales)" else "Total Sales", summary.totalSales, DukanGreenHover)
                    ReportMetricRow(if (isUrdu) "مال کی لاگت (COGS)" else "Cost of Goods Sold", summary.cogs, Slate700)
                    ReportMetricRow(if (isUrdu) "مجموعی منافع (Gross Profit)" else "Gross Profit", summary.grossProfit ?: 0.0, DukanGreenHover, isBold = true)
                    ReportMetricRow(if (isUrdu) "دکان کے اخراجات (Expenses)" else "Direct Expenses", summary.directExpenses, RedDanger)
                    ReportMetricRow(if (isUrdu) "خالص منافع (Net Profit)" else "Net Profit", summary.netProfit ?: 0.0, DukanGreenHover, isBold = true, isHighlight = true)
                }
            }
        }

        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Slate200),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = if (isUrdu) "مالی صورتحال (Balance Sheet)" else "Balance Sheet Overview",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Slate900
                    )

                    Divider(color = Slate100)

                    ReportMetricRow(if (isUrdu) "نقدی و بینک" else "Cash & Bank", summary.cashAndBank, Slate800)
                    ReportMetricRow(if (isUrdu) "اسٹاک کی مالیت" else "Inventory Value", summary.closingStockValue, Slate800)
                    ReportMetricRow(if (isUrdu) "کسٹمرز سے وصول طلب ادھار" else "Receivables (Debtors)", summary.totalReceivables, AmberWarning)
                    ReportMetricRow(if (isUrdu) "دکان کے اثاثے" else "Fixed Assets", summary.totalBusinessAssets, Slate800)
                    ReportMetricRow(if (isUrdu) "مجموعی اثاثہ جات" else "Total Assets", summary.totalAssets, DukanGreenHover, isBold = true)
                    ReportMetricRow(if (isUrdu) "سپلائرز کے واجبات" else "Payables (Creditors)", summary.totalSupplierPayables, RedDanger)
                    ReportMetricRow(if (isUrdu) "قرضے" else "Loans", summary.totalLoans, RedDanger)
                    ReportMetricRow(if (isUrdu) "اصل سرمایہ (Net Capital)" else "Owner's Net Capital", summary.ownerCapital ?: 0.0, DukanGreenHover, isBold = true, isHighlight = true)
                }
            }
        }
    }
}

@Composable
fun ReportMetricRow(
    label: String,
    amount: Double,
    amountColor: Color,
    isBold: Boolean = false,
    isHighlight: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isHighlight) Color(0xFFF0FDF4) else Color.Transparent, RoundedCornerShape(6.dp))
            .padding(horizontal = 6.dp, vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = Slate800
        )
        Text(
            text = FormatUtils.formatCurrency(amount),
            fontSize = 13.sp,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.SemiBold,
            color = amountColor
        )
    }
}
