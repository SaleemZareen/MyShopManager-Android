package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import java.text.SimpleDateFormat
import java.util.*

data class ReminderItem(
    val title: String,
    val subtitle: String,
    val date: String,
    val amount: Double,
    val type: String // "SUPPLIER", "LOAN", "NOTE"
)

@Composable
fun CalendarRemindersDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    suppliers: List<SupplierParty>,
    loans: List<LoanRecord>,
    isUrdu: Boolean
) {
    if (!isOpen) return

    val reminders = remember(suppliers, loans) {
        val list = mutableListOf<ReminderItem>()
        suppliers.filter { it.totalPayable > 0 && !it.dueDate.isNullOrBlank() }.forEach { s ->
            list.add(
                ReminderItem(
                    title = "${if (isUrdu) "سپلائر ادائیگی:" else "Supplier Due:"} ${s.name}",
                    subtitle = if (isUrdu) "آخری تاریخ پر واجب الادا رقم" else "Due payment to vendor",
                    date = s.dueDate ?: "",
                    amount = s.totalPayable,
                    type = "SUPPLIER"
                )
            )
        }
        loans.filter { it.dueDate.isNotBlank() }.forEach { l ->
            list.add(
                ReminderItem(
                    title = "${if (isUrdu) "قرض ادائیگی:" else "Loan Due:"} ${l.partyName}",
                    subtitle = "${l.loanType} - ${l.purpose}",
                    date = l.dueDate,
                    amount = l.amount,
                    type = "LOAN"
                )
            )
        }
        list.sortedBy { it.date }
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
                    .padding(18.dp),
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
                            imageVector = Icons.Default.CalendarMonth,
                            contentDescription = "Calendar",
                            tint = DukanGreenPrimary,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isUrdu) "کیلنڈر و ریمائنڈرز" else "Calendar & Reminders",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate900
                        )
                    }
                    IconButton(onClick = onClose, modifier = Modifier.size(28.dp)) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close", tint = Slate500)
                    }
                }

                if (reminders.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (isUrdu) "کوئی شیڈول شدہ ادائیگیاں یا ریمائنڈر نہیں ہیں!" else "No scheduled dues or reminders found!",
                            color = Slate500,
                            fontSize = 13.sp
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 300.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(reminders) { rem ->
                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (rem.type == "SUPPLIER") RedDangerLight else Color(0xFFFEF3C7)
                                ),
                                border = BorderStroke(
                                    1.dp,
                                    if (rem.type == "SUPPLIER") RedDangerBorder else Color(0xFFFDE68A)
                                )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = rem.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Slate900
                                        )
                                        Text(
                                            text = "${rem.subtitle} • ${rem.date}",
                                            fontSize = 11.sp,
                                            color = Slate600
                                        )
                                    }
                                    Text(
                                        text = "Rs. ${rem.amount.toInt()}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = if (rem.type == "SUPPLIER") RedDanger else Color(0xFFD97706)
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
