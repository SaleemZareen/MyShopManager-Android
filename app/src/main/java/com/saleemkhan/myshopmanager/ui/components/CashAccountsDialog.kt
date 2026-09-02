package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
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
import com.saleemkhan.myshopmanager.model.BankAccount
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@Composable
fun CashAccountsDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    accounts: List<BankAccount>,
    onAddAccount: (BankAccount) -> Unit,
    onTransferFunds: (fromId: String, toId: String, amount: Double) -> Unit,
    isUrdu: Boolean
) {
    if (!isOpen) return

    var activeTab by remember { mutableStateOf(0) } // 0: Balances, 1: Transfer, 2: New Account

    var fromAccountId by remember { mutableStateOf(accounts.firstOrNull()?.id ?: "") }
    var toAccountId by remember { mutableStateOf(accounts.getOrNull(1)?.id ?: "") }
    var transferAmount by remember { mutableStateOf("") }

    var newBankName by remember { mutableStateOf("") }
    var newAccountTitle by remember { mutableStateOf("") }
    var newAccountNumber by remember { mutableStateOf("") }
    var newInitialBalance by remember { mutableStateOf("") }
    var newAccountType by remember { mutableStateOf("BANK") }

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
                    Text(
                        text = if (isUrdu) "کیش و بینک اکاؤنٹس" else "Cash & Bank Accounts",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate900
                    )
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                // Tabs (Overview / Transfer / Add)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(
                        if (isUrdu) "بیلنس" else "Balances",
                        if (isUrdu) "منتقلی" else "Transfer",
                        if (isUrdu) "نیا اکاؤنٹ" else "New Account"
                    ).forEachIndexed { index, label ->
                        val isSelected = activeTab == index
                        Surface(
                            onClick = { activeTab = index },
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) DukanGreenPrimary else Slate100,
                            modifier = Modifier
                                .weight(1f)
                                .height(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = label,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) Color.White else Slate700
                                )
                            }
                        }
                    }
                }

                when (activeTab) {
                    0 -> {
                        // Accounts List
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            accounts.forEach { acc ->
                                Card(
                                    colors = CardDefaults.cardColors(
                                        containerColor = if (acc.type == "CASH") DukanGreenLight else Slate50
                                    ),
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, if (acc.type == "CASH") GreenSuccessBorder else Slate200)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = acc.bankName,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp,
                                                color = Slate900
                                            )
                                            Text(
                                                text = "${acc.accountTitle} (${acc.type})",
                                                fontSize = 11.sp,
                                                color = Slate600
                                            )
                                        }
                                        Text(
                                            text = FormatUtils.formatCurrency(acc.balance),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = if (acc.type == "CASH") DukanGreenHover else Color(0xFF2563EB)
                                        )
                                    }
                                }
                            }
                        }
                    }
                    1 -> {
                        // Funds Transfer Flow
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text(
                                text = if (isUrdu) "اکاؤنٹ سے رقم منتقل کریں" else "Transfer funds between accounts",
                                fontSize = 12.sp,
                                color = Slate600
                            )

                            OutlinedTextField(
                                value = transferAmount,
                                onValueChange = { transferAmount = it },
                                label = { Text(if (isUrdu) "منتقلی کی رقم" else "Transfer Amount (Rs.)") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Button(
                                onClick = {
                                    val amt = transferAmount.toDoubleOrNull() ?: 0.0
                                    if (amt > 0 && fromAccountId.isNotBlank() && toAccountId.isNotBlank()) {
                                        onTransferFunds(fromAccountId, toAccountId, amt)
                                        transferAmount = ""
                                        activeTab = 0
                                    }
                                },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                            ) {
                                Text(
                                    text = if (isUrdu) "رقم منتقل کریں" else "Execute Transfer",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                    2 -> {
                        // Add New Account
                        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedTextField(
                                value = newBankName,
                                onValueChange = { newBankName = it },
                                label = { Text(if (isUrdu) "بینک یا والٹ کا نام" else "Bank / Wallet Name") },
                                placeholder = { Text("e.g. Meezan Bank, JazzCash") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            OutlinedTextField(
                                value = newAccountTitle,
                                onValueChange = { newAccountTitle = it },
                                label = { Text(if (isUrdu) "اکاؤنٹ ٹائٹل" else "Account Title") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            OutlinedTextField(
                                value = newAccountNumber,
                                onValueChange = { newAccountNumber = it },
                                label = { Text(if (isUrdu) "اکاؤنٹ / موبائل نمبر" else "Account / Mobile Number") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            OutlinedTextField(
                                value = newInitialBalance,
                                onValueChange = { newInitialBalance = it },
                                label = { Text(if (isUrdu) "ابتدائی رقم" else "Initial Balance (Rs.)") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Button(
                                onClick = {
                                    if (newBankName.isNotBlank()) {
                                        val account = BankAccount(
                                            id = "acc_${System.currentTimeMillis()}",
                                            bankName = newBankName,
                                            accountTitle = newAccountTitle.ifBlank { "Account" },
                                            accountNumber = newAccountNumber,
                                            balance = newInitialBalance.toDoubleOrNull() ?: 0.0,
                                            type = newAccountType
                                        )
                                        onAddAccount(account)
                                        newBankName = ""
                                        newAccountTitle = ""
                                        newAccountNumber = ""
                                        newInitialBalance = ""
                                        activeTab = 0
                                    }
                                },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                            ) {
                                Text(
                                    text = if (isUrdu) "اکاؤنٹ شامل کریں" else "Save Account",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
