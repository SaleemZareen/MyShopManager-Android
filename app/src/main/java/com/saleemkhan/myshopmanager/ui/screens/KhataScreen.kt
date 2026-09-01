package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KhataScreen(
    state: AppState,
    isUrdu: Boolean,
    onAddCustomer: (CustomerParty) -> Unit,
    onAddSupplier: (SupplierParty) -> Unit,
    onRecordPayment: (TransactionType, String, Double) -> Unit
) {
    var selectedTab by remember { mutableStateOf("CUSTOMERS") }
    var search by remember { mutableStateOf("") }
    var showAddPartyDialog by remember { mutableStateOf(false) }

    // Quick payment state
    var selectedPartyForPayment by remember { mutableStateOf<Pair<String, Boolean>?>(null) } // name, isCustomer
    var paymentAmountInput by remember { mutableStateOf("") }

    val totalCustomerUdhaar = remember(state.customers) {
        state.customers.sumOf { it.totalCredit }
    }

    val totalSupplierPayable = remember(state.suppliers) {
        state.suppliers.sumOf { it.totalPayable }
    }

    val filteredCustomers = remember(state.customers, search) {
        state.customers.filter {
            search.isBlank() || it.name.contains(search, ignoreCase = true) || it.phone.contains(search)
        }
    }

    val filteredSuppliers = remember(state.suppliers, search) {
        state.suppliers.filter {
            search.isBlank() || it.name.contains(search, ignoreCase = true) || it.phone.contains(search)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        // Top KPI Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                border = BorderStroke(1.dp, Color(0xFFFCD34D))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "کل کسٹمر ادھار" else "Customer Udhaar",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF92400E)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalCustomerUdhaar),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFB45309)
                    )
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF3E8FF)),
                border = BorderStroke(1.dp, Color(0xFFD8B4FE))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "واجب الادا سپلائر" else "Supplier Payables",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF6B21A8)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalSupplierPayable),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF7C3AED)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Customers vs Suppliers Toggle Tab
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { selectedTab = "CUSTOMERS" },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (selectedTab == "CUSTOMERS") DukanGreenPrimary else Color.White,
                    contentColor = if (selectedTab == "CUSTOMERS") Color.White else Slate700
                ),
                border = BorderStroke(1.dp, if (selectedTab == "CUSTOMERS") DukanGreenPrimary else Slate200),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = if (isUrdu) "کسٹمرز کھاتہ (${state.customers.size})" else "Customers (${state.customers.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }

            Button(
                onClick = { selectedTab = "SUPPLIERS" },
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (selectedTab == "SUPPLIERS") DukanGreenPrimary else Color.White,
                    contentColor = if (selectedTab == "SUPPLIERS") Color.White else Slate700
                ),
                border = BorderStroke(1.dp, if (selectedTab == "SUPPLIERS") DukanGreenPrimary else Slate200),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = if (isUrdu) "سپلائرز کھاتہ (${state.suppliers.size})" else "Suppliers (${state.suppliers.size})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Search & Add Party Button
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                placeholder = { Text(if (isUrdu) "کھاتہ دار تلاش کریں..." else "Search party...", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = Slate400) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White,
                    focusedBorderColor = DukanGreenPrimary,
                    unfocusedBorderColor = Slate200
                ),
                modifier = Modifier.weight(1f)
            )

            Button(
                onClick = { showAddPartyDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                shape = RoundedCornerShape(14.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                modifier = Modifier.height(52.dp)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = "Add", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(text = if (isUrdu) "نیا کھاتہ" else "Add", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // List
        if (selectedTab == "CUSTOMERS") {
            if (filteredCustomers.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(text = if (isUrdu) "کوئی کسٹمر کھاتہ موجود نہیں" else "No customers found", color = Slate500, fontSize = 13.sp)
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(filteredCustomers, key = { it.id }) { cust ->
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
                                    Box(
                                        modifier = Modifier.size(38.dp).background(Color(0xFFFEF3C7), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(text = cust.name.take(1), fontWeight = FontWeight.Bold, color = Color(0xFFB45309), fontSize = 15.sp)
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(text = cust.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate900)
                                        Text(text = cust.phone.ifBlank { "No phone" }, fontSize = 10.sp, color = Slate500)
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(text = FormatUtils.formatCurrency(cust.totalCredit), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (cust.totalCredit > 0) AmberWarning else DukanGreenPrimary)
                                        Text(text = if (cust.totalCredit > 0) (if (isUrdu) "بقایا ادھار" else "Due") else (if (isUrdu) "کلیئر" else "Clear"), fontSize = 9.sp, color = Slate500)
                                    }
                                    Button(
                                        onClick = { selectedPartyForPayment = Pair(cust.name, true) },
                                        colors = ButtonDefaults.buttonColors(containerColor = DukanGreenLight, contentColor = DukanGreenHover),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        modifier = Modifier.height(30.dp)
                                    ) {
                                        Text(text = if (isUrdu) "وصول کریں" else "Collect", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            if (filteredSuppliers.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(text = if (isUrdu) "کوئی سپلائر کھاتہ موجود نہیں" else "No suppliers found", color = Slate500, fontSize = 13.sp)
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(filteredSuppliers, key = { it.id }) { sup ->
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
                                    Box(
                                        modifier = Modifier.size(38.dp).background(Color(0xFFF3E8FF), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(text = sup.name.take(1), fontWeight = FontWeight.Bold, color = Color(0xFF7C3AED), fontSize = 15.sp)
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(text = sup.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Slate900)
                                        Text(text = sup.phone.ifBlank { "No phone" }, fontSize = 10.sp, color = Slate500)
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(text = FormatUtils.formatCurrency(sup.totalPayable), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = if (sup.totalPayable > 0) Color(0xFF7C3AED) else DukanGreenPrimary)
                                        Text(text = if (sup.totalPayable > 0) (if (isUrdu) "واجب الادا" else "Payable") else (if (isUrdu) "کلیئر" else "Clear"), fontSize = 9.sp, color = Slate500)
                                    }
                                    Button(
                                        onClick = { selectedPartyForPayment = Pair(sup.name, false) },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF3E8FF), contentColor = Color(0xFF7C3AED)),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        modifier = Modifier.height(30.dp)
                                    ) {
                                        Text(text = if (isUrdu) "ادائیگی کریں" else "Pay", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Add Party Dialog
        if (showAddPartyDialog) {
            var name by remember { mutableStateOf("") }
            var phone by remember { mutableStateOf("") }
            var initialBal by remember { mutableStateOf("") }

            Dialog(onDismissRequest = { showAddPartyDialog = false }) {
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
                            text = if (selectedTab == "CUSTOMERS") (if (isUrdu) "نیا کسٹمر کھاتہ شامل کریں" else "Add New Customer") else (if (isUrdu) "نیا سپلائر کھاتہ شامل کریں" else "Add New Supplier"),
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Slate900
                        )

                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text(if (isUrdu) "نام" else "Name") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            label = { Text(if (isUrdu) "فون نمبر" else "Phone Number") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        OutlinedTextField(
                            value = initialBal,
                            onValueChange = { initialBal = it },
                            label = { Text(if (isUrdu) "ابتدائی بیلنس (روپے)" else "Initial Balance (Rs.)") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                if (name.isNotBlank()) {
                                    val bal = initialBal.toDoubleOrNull() ?: 0.0
                                    if (selectedTab == "CUSTOMERS") {
                                        onAddCustomer(CustomerParty("cust_${System.currentTimeMillis()}", name, phone, bal))
                                    } else {
                                        onAddSupplier(SupplierParty("sup_${System.currentTimeMillis()}", name, phone, bal))
                                    }
                                    showAddPartyDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(42.dp)
                        ) {
                            Text(text = if (isUrdu) "کھاتہ محفوظ کریں" else "Save Party", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Quick Payment Dialog
        selectedPartyForPayment?.let { (partyName, isCustomer) ->
            Dialog(onDismissRequest = { selectedPartyForPayment = null }) {
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
                            text = if (isCustomer) (if (isUrdu) "ادھار وصولی: $partyName" else "Collect from $partyName") else (if (isUrdu) "ادائیگی برائے: $partyName" else "Pay to $partyName"),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = Slate900
                        )

                        OutlinedTextField(
                            value = paymentAmountInput,
                            onValueChange = { paymentAmountInput = it },
                            label = { Text(if (isUrdu) "رقم (روپے)" else "Amount (Rs.)") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                val amt = paymentAmountInput.toDoubleOrNull() ?: 0.0
                                if (amt > 0) {
                                    val txType = if (isCustomer) TransactionType.RECEIPT else TransactionType.PAYMENT
                                    onRecordPayment(txType, partyName, amt)
                                    selectedPartyForPayment = null
                                    paymentAmountInput = ""
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = if (isCustomer) DukanGreenPrimary else Color(0xFF7C3AED)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(42.dp)
                        ) {
                            Text(text = if (isUrdu) "اینٹری محفوظ کریں" else "Confirm Transaction", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
