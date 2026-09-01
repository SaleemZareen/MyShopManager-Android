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
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import com.saleemkhan.myshopmanager.utils.TaxEngine

@Composable
fun FbrTaxScreen(
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
                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Verified,
                            contentDescription = "FBR",
                            tint = DukanGreenPrimary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isUrdu) "ایف بی آر ٹیکس ریٹرن تیاری و خلاصہ" else "FBR Tax Return Preparation",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = DukanGreenHover
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (isUrdu) "انکم ٹیکس اور ویلتھ اسٹیٹمنٹ کا مکمل آڈٹ و حساب کتاب" else "Income Tax & Wealth Statement Reconciliation",
                        fontSize = 11.sp,
                        color = Slate600
                    )
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
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = if (isUrdu) "کاروباری آمدن و منافع (Income Statement)" else "Business Profit & Loss (P&L)",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Slate900
                    )

                    TaxRow(
                        title = if (isUrdu) "کل فروخت (Revenue / Sales)" else "Total Sales (Gross Turnover)",
                        code = "Code 7000",
                        amount = summary.totalSales,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "فروخت شدہ مال کی لاگت (COGS)" else "Cost of Goods Sold (COGS)",
                        code = "Code 7010",
                        amount = summary.cogs,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "مجموعی منافع (Gross Profit)" else "Gross Profit",
                        code = "Code 7020",
                        amount = summary.grossProfit ?: 0.0,
                        isUrdu = isUrdu,
                        highlight = true
                    )

                    TaxRow(
                        title = if (isUrdu) "براہ راست کاروباری اخراجات (Deductions)" else "Operating Expenses (Admin & Selling)",
                        code = "Code 7030",
                        amount = summary.directExpenses,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "خالص قابل ٹیکس کاروباری منافع (Net Taxable Profit)" else "Net Taxable Profit",
                        code = "Code 7040",
                        amount = summary.netProfit ?: 0.0,
                        isUrdu = isUrdu,
                        highlight = true
                    )
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
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = if (isUrdu) "دکان کے مجموعی اثاثے (Balance Sheet Summary)" else "Business Wealth & Equity",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Slate900
                    )

                    TaxRow(
                        title = if (isUrdu) "نقدی اور بینک بیلنس" else "Cash & Bank Balances",
                        code = "Code 7001",
                        amount = summary.cashAndBank,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "اسٹاک کی مالیت (Closing Stock)" else "Closing Inventory Valuation",
                        code = "Code 7002",
                        amount = summary.closingStockValue,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "کسٹمرز کے ذمہ واجب الادا رقم (Receivables)" else "Trade Debtors (Udhaar Receivables)",
                        code = "Code 7003",
                        amount = summary.totalReceivables,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "دکان کے فکسڈ اثاثے (Fixed Assets)" else "Business Fixed Assets",
                        code = "Code 7004",
                        amount = summary.totalBusinessAssets,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "سپلائرز کے واجبات (Payables)" else "Trade Creditors (Payables)",
                        code = "Code 7005",
                        amount = summary.totalSupplierPayables,
                        isUrdu = isUrdu
                    )

                    TaxRow(
                        title = if (isUrdu) "دکان کا مجموعی اصل سرمایہ (Owner's Net Equity)" else "Owner's Net Capital / Equity",
                        code = "Code 7009",
                        amount = summary.ownerCapital ?: 0.0,
                        isUrdu = isUrdu,
                        highlight = true
                    )
                }
            }
        }
    }
}

@Composable
fun TaxRow(
    title: String,
    code: String,
    amount: Double,
    isUrdu: Boolean,
    highlight: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (highlight) Color(0xFFF0FDF4) else Color.Transparent, RoundedCornerShape(8.dp))
            .padding(horizontal = 6.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = if (highlight) FontWeight.Bold else FontWeight.Medium,
                color = if (highlight) DukanGreenHover else Slate800
            )
            Text(
                text = code,
                fontSize = 10.sp,
                color = Slate400
            )
        }
        Text(
            text = FormatUtils.formatCurrency(amount),
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = if (highlight) DukanGreenHover else Slate900
        )
    }
}
