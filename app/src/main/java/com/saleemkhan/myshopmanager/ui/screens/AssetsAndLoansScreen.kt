package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssetsAndLoansScreen(
    state: AppState,
    isUrdu: Boolean,
    onAddBusinessAsset: (BusinessAsset) -> Unit,
    onAddPersonalAsset: (PersonalAsset) -> Unit,
    onAddLoan: (LoanRecord) -> Unit,
    onDeleteBusinessAsset: (String) -> Unit,
    onDeleteLoan: (String) -> Unit
) {
    var selectedTab by remember { mutableStateOf("BUSINESS_ASSETS") }
    var showAddDialog by remember { mutableStateOf(false) }

    val totalBusinessAssets = remember(state.businessAssets) {
        state.businessAssets.sumOf { it.currentValue }
    }
    val totalLoans = remember(state.loans) {
        state.loans.sumOf { it.outstandingAmount }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        // KPI strip
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFDBEAFE)),
                border = BorderStroke(1.dp, Color(0xFF93C5FD))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "دکان کے اثاثے" else "Business Assets",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E40AF)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalBusinessAssets),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2563EB)
                    )
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEE2E2)),
                border = BorderStroke(1.dp, Color(0xFFFCA5A5))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "قرضے و واجبات" else "Total Loans",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF991B1B)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalLoans),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = RedDanger
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Tabs
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf(
                "BUSINESS_ASSETS" to (if (isUrdu) "دکان کے اثاثے" else "Assets"),
                "LOANS" to (if (isUrdu) "قرضے" else "Loans"),
                "PERSONAL_ASSETS" to (if (isUrdu) "ذاتی اثاثے" else "Personal")
            ).forEach { (tabId, label) ->
                val isSelected = selectedTab == tabId
                Button(
                    onClick = { selectedTab = tabId },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isSelected) DukanGreenPrimary else Color.White,
                        contentColor = if (isSelected) Color.White else Slate700
                    ),
                    border = BorderStroke(1.dp, if (isSelected) DukanGreenPrimary else Slate200),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                    modifier = Modifier.weight(1f).height(36.dp)
                ) {
                    Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Add Button
        Button(
            onClick = { showAddDialog = true },
            colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().height(42.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add", modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = when (selectedTab) {
                    "BUSINESS_ASSETS" -> if (isUrdu) "نیا کاروباری اثاثہ شامل کریں" else "Add Business Asset"
                    "LOANS" -> if (isUrdu) "نیا قرضہ ریکارڈ کریں" else "Record New Loan"
                    else -> if (isUrdu) "نیا ذاتی اثاثہ شامل کریں" else "Add Personal Asset"
                },
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Content
        when (selectedTab) {
            "BUSINESS_ASSETS" -> {
                if (state.businessAssets.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(text = if (isUrdu) "کوئی کاروباری اثاثہ ریکارڈ نہیں" else "No business assets found", color = Slate500, fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.businessAssets, key = { it.id }) { asset ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = BorderStroke(1.dp, Slate200),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(modifier = Modifier.size(36.dp).background(Color(0xFFDBEAFE), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.Storefront, contentDescription = "Asset", tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(text = asset.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate900)
                                            Text(text = asset.category, fontSize = 10.sp, color = Slate500)
                                        }
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(text = FormatUtils.formatCurrency(asset.currentValue), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
                                        IconButton(onClick = { onDeleteBusinessAsset(asset.id) }, modifier = Modifier.size(28.dp)) {
                                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = Slate400, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            "LOANS" -> {
                if (state.loans.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(text = if (isUrdu) "کوئی قرضہ ریکارڈ نہیں" else "No loan records found", color = Slate500, fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.loans, key = { it.id }) { loan ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = BorderStroke(1.dp, Slate200),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(modifier = Modifier.size(36.dp).background(Color(0xFFFEE2E2), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.AccountBalance, contentDescription = "Loan", tint = RedDanger, modifier = Modifier.size(18.dp))
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(text = loan.lenderName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate900)
                                            Text(text = "Initial: ${FormatUtils.formatCurrency(loan.amount)}", fontSize = 10.sp, color = Slate500)
                                        }
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(text = FormatUtils.formatCurrency(loan.outstandingAmount), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = RedDanger)
                                            Text(text = if (isUrdu) "بقایا قرضہ" else "Outstanding", fontSize = 9.sp, color = Slate500)
                                        }
                                        IconButton(onClick = { onDeleteLoan(loan.id) }, modifier = Modifier.size(28.dp)) {
                                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = Slate400, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else -> {
                if (state.personalAssets.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(text = if (isUrdu) "کوئی ذاتی اثاثہ ریکارڈ نہیں" else "No personal assets found", color = Slate500, fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(state.personalAssets, key = { it.id }) { pAsset ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                border = BorderStroke(1.dp, Slate200),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(text = pAsset.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate900)
                                        Text(text = pAsset.category, fontSize = 10.sp, color = Slate500)
                                    }
                                    Text(text = FormatUtils.formatCurrency(pAsset.value), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = DukanGreenHover)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Add Asset / Loan Dialog
        if (showAddDialog) {
            var name by remember { mutableStateOf("") }
            var amountStr by remember { mutableStateOf("") }
            var category by remember { mutableStateOf("Furniture & Equipment") }

            Dialog(onDismissRequest = { showAddDialog = false }) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = if (selectedTab == "LOANS") (if (isUrdu) "نیا قرضہ ریکارڈ کریں" else "Record Loan") else (if (isUrdu) "نیا اثاثہ شامل کریں" else "Add Asset"),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Slate900
                        )

                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text(if (selectedTab == "LOANS") (if (isUrdu) "قرض خواہ کا نام" else "Lender Name") else (if (isUrdu) "اثاثے کا نام" else "Asset Name")) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = amountStr,
                            onValueChange = { amountStr = it },
                            label = { Text(if (isUrdu) "رقم / مالیت (روپے)" else "Amount / Value (Rs.)") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                val amt = amountStr.toDoubleOrNull() ?: 0.0
                                if (name.isNotBlank() && amt > 0) {
                                    if (selectedTab == "LOANS") {
                                        onAddLoan(
                                            LoanRecord(
                                                id = "loan_${System.currentTimeMillis()}",
                                                lenderName = name,
                                                amount = amt,
                                                outstandingAmount = amt,
                                                startDate = FormatUtils.getTodayIsoDate()
                                            )
                                        )
                                    } else if (selectedTab == "BUSINESS_ASSETS") {
                                        onAddBusinessAsset(
                                            BusinessAsset(
                                                id = "ba_${System.currentTimeMillis()}",
                                                name = name,
                                                category = category,
                                                purchasePrice = amt,
                                                currentValue = amt,
                                                purchaseDate = FormatUtils.getTodayIsoDate()
                                            )
                                        )
                                    } else {
                                        onAddPersonalAsset(
                                            PersonalAsset(
                                                id = "pa_${System.currentTimeMillis()}",
                                                name = name,
                                                category = category,
                                                value = amt
                                            )
                                        )
                                    }
                                    showAddDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(42.dp)
                        ) {
                            Text(text = if (isUrdu) "محفوظ کریں" else "Save Record", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
