package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NotificationsActive
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

@Composable
fun NotificationsScreen(
    state: AppState,
    isUrdu: Boolean
) {
    val lowStockAlerts = remember(state.inventory) {
        state.inventory.filter { it.quantity <= it.minStockAlert }
    }
    val highUdhaarAlerts = remember(state.customers) {
        state.customers.filter { it.totalCredit > 5000 }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        item {
            Text(
                text = if (isUrdu) "دکان کے الرٹس اور اہم اطلاعات" else "Shop Alerts & Notifications",
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                color = Slate900
            )
        }

        if (lowStockAlerts.isEmpty() && highUdhaarAlerts.isEmpty()) {
            item {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = BorderStroke(1.dp, Slate200),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(modifier = Modifier.padding(24.dp).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (isUrdu) "تمام معاملات کلیئر ہیں، کوئی الرٹ موجود نہیں!" else "All clear! No alerts currently pending.",
                            fontSize = 13.sp,
                            color = DukanGreenHover,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        items(lowStockAlerts, key = { "stock_${it.id}" }) { item ->
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                border = BorderStroke(1.dp, Color(0xFFFCD34D)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "⚠️", fontSize = 18.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = if (isUrdu) "کم اسٹاک الرٹ: ${item.name}" else "Low Stock Alert: ${item.name}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF92400E)
                        )
                        Text(
                            text = if (isUrdu) "${item.quantity.toInt()} ${item.unit} باقی (حد ${item.minStockAlert.toInt()})" else "Only ${item.quantity.toInt()} ${item.unit} remaining (alert limit ${item.minStockAlert.toInt()})",
                            fontSize = 11.sp,
                            color = Color(0xFFB45309)
                        )
                    }
                }
            }
        }

        items(highUdhaarAlerts, key = { "udhaar_${it.id}" }) { cust ->
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "💰", fontSize = 18.sp)
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = if (isUrdu) "بقایا ادھار: ${cust.name}" else "Udhaar Pending: ${cust.name}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF065F46)
                        )
                        Text(
                            text = if (isUrdu) "کل واجب الادا رقم: Rs. ${cust.totalCredit.toInt()}" else "Total Due: Rs. ${cust.totalCredit.toInt()}",
                            fontSize = 11.sp,
                            color = DukanGreenHover
                        )
                    }
                }
            }
        }
    }
}
