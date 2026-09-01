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
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.model.InventoryItem
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryScreen(
    state: AppState,
    isUrdu: Boolean,
    onAddItem: (InventoryItem) -> Unit,
    onUpdateQty: (String, Double) -> Unit,
    onDeleteItem: (String) -> Unit
) {
    var search by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }

    val totalValuation = remember(state.inventory) {
        state.inventory.sumOf { it.quantity * it.purchasePrice }
    }

    val lowStockCount = remember(state.inventory) {
        state.inventory.count { it.quantity <= it.minStockAlert }
    }

    val filteredItems = remember(state.inventory, search) {
        state.inventory.filter {
            search.isBlank() ||
                    it.name.contains(search, ignoreCase = true) ||
                    it.category.contains(search, ignoreCase = true) ||
                    (it.barcode?.contains(search) == true)
        }
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
                colors = CardDefaults.cardColors(containerColor = Color(0xFFECFDF5)),
                border = BorderStroke(1.dp, Color(0xFFA7F3D0))
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "کل مالیت اسٹاک" else "Stock Valuation",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF065F46)
                    )
                    Text(
                        text = FormatUtils.formatCurrency(totalValuation),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = DukanGreenHover
                    )
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = if (lowStockCount > 0) Color(0xFFFEF3C7) else Color(0xFFF1F5F9)),
                border = BorderStroke(1.dp, if (lowStockCount > 0) Color(0xFFFCD34D) else Slate200)
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = if (isUrdu) "کم اسٹاک الرٹس" else "Low Stock Alerts",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (lowStockCount > 0) AmberWarning else Slate600
                    )
                    Text(
                        text = "$lowStockCount ${if (isUrdu) "آئٹمز" else "items"}",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (lowStockCount > 0) AmberWarning else Slate700
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Search & Add Item
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                placeholder = { Text(if (isUrdu) "اسٹاک آئٹم یا بارکوڈ تلاش کریں..." else "Search stock or barcode...", fontSize = 12.sp) },
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
                onClick = { showAddDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                shape = RoundedCornerShape(14.dp),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                modifier = Modifier.height(52.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add", modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = if (isUrdu) "نیا آئٹم" else "Add Item", fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Items List
        if (filteredItems.isEmpty()) {
            Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = if (isUrdu) "کوئی اسٹاک آئٹم نہیں ملا" else "No inventory items found", color = Slate500, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredItems, key = { it.id }) { item ->
                    val isLowStock = item.quantity <= item.minStockAlert

                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, if (isLowStock) Color(0xFFFCD34D) else Slate200),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .background(if (isLowStock) Color(0xFFFEF3C7) else DukanGreenLight, RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = if (isLowStock) Icons.Default.WarningAmber else Icons.Default.Inventory2,
                                        contentDescription = "Stock",
                                        tint = if (isLowStock) AmberWarning else DukanGreenHover,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.width(10.dp))

                                Column {
                                    Text(
                                        text = item.name,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Slate900,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "${item.category} • Sale: ${FormatUtils.formatCurrency(item.salePrice)} • Buy: ${FormatUtils.formatCurrency(item.purchasePrice)}",
                                        fontSize = 10.sp,
                                        color = Slate500
                                    )
                                    if (!item.barcode.isNullOrBlank()) {
                                        Text(
                                            text = "Barcode: ${item.barcode}",
                                            fontSize = 9.sp,
                                            color = Slate400
                                        )
                                    }
                                }
                            }

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "${item.quantity.toInt()} ${item.unit}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = if (isLowStock) AmberWarning else DukanGreenPrimary
                                    )
                                    Text(
                                        text = if (isLowStock) (if (isUrdu) "کم اسٹاک!" else "Low Stock!") else (if (isUrdu) "دستیاب" else "In Stock"),
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isLowStock) RedDanger else Slate500
                                    )
                                }

                                IconButton(
                                    onClick = { onDeleteItem(item.id) },
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

        // Add Product Dialog
        if (showAddDialog) {
            var name by remember { mutableStateOf("") }
            var category by remember { mutableStateOf("General") }
            var qty by remember { mutableStateOf("1") }
            var unit by remember { mutableStateOf("pcs") }
            var purchasePrice by remember { mutableStateOf("") }
            var salePrice by remember { mutableStateOf("") }
            var minAlert by remember { mutableStateOf("5") }
            var barcode by remember { mutableStateOf("") }

            Dialog(onDismissRequest = { showAddDialog = false }) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    modifier = Modifier.fillMaxWidth().padding(16.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = if (isUrdu) "نیا پروڈکٹ / اسٹاک شامل کریں" else "Add New Stock Product",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = Slate900
                        )

                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text(if (isUrdu) "پروڈکٹ کا نام" else "Product Name") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = purchasePrice,
                                onValueChange = { purchasePrice = it },
                                label = { Text(if (isUrdu) "خرید قیمت" else "Cost Price") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = salePrice,
                                onValueChange = { salePrice = it },
                                label = { Text(if (isUrdu) "فروخت قیمت" else "Sale Price") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = qty,
                                onValueChange = { qty = it },
                                label = { Text(if (isUrdu) "تعداد" else "Qty") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = unit,
                                onValueChange = { unit = it },
                                label = { Text(if (isUrdu) "یونٹ" else "Unit") },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f)
                            )
                        }

                        OutlinedTextField(
                            value = barcode,
                            onValueChange = { barcode = it },
                            label = { Text(if (isUrdu) "بارکوڈ (اختیاری)" else "Barcode (Optional)") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Button(
                            onClick = {
                                if (name.isNotBlank()) {
                                    val cost = purchasePrice.toDoubleOrNull() ?: 0.0
                                    val sale = salePrice.toDoubleOrNull() ?: 0.0
                                    val quantity = qty.toDoubleOrNull() ?: 1.0
                                    val alert = minAlert.toDoubleOrNull() ?: 5.0

                                    onAddItem(
                                        InventoryItem(
                                            id = "item_${System.currentTimeMillis()}",
                                            name = name,
                                            category = category,
                                            quantity = quantity,
                                            unit = unit,
                                            purchasePrice = cost,
                                            salePrice = sale,
                                            minStockAlert = alert,
                                            barcode = barcode.ifBlank { null }
                                        )
                                    )
                                    showAddDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(44.dp)
                        ) {
                            Text(text = if (isUrdu) "پروڈکٹ محفوظ کریں" else "Save Product", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
