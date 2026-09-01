package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Popup
import com.saleemkhan.myshopmanager.R
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils

data class HeaderNotification(
    val id: String,
    val textEn: String,
    val textUr: String,
    val emoji: String,
    val bgColor: Color,
    val borderColor: Color,
    val emojiColor: Color
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppHeader(
    profile: ShopProfile,
    otherShops: List<ShopInfo>,
    inventory: List<InventoryItem>,
    customers: List<CustomerParty>,
    suppliers: List<SupplierParty>,
    loans: List<LoanRecord>,
    isUrdu: Boolean,
    currentScreen: Screen,
    onBack: (() -> Unit)?,
    onToggleUrdu: () -> Unit,
    onSwitchShop: (String) -> Unit,
    onLockApp: () -> Unit,
    onOpenScanner: (() -> Unit)?,
    onOpenVoiceEntry: (() -> Unit)?,
    onOpenCalendar: (() -> Unit)?,
    onToggleStoreMode: (() -> Unit)?,
    onOpenQuickEntry: ((TransactionType) -> Unit)?,
    onNavigateScreen: (Screen) -> Unit,
    onToggleMenu: () -> Unit
) {
    var showShopDropdown by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var showNotifMsg by remember { mutableStateOf(false) }

    // Live notifications computation
    val lowStockNotifs = remember(inventory) {
        inventory.filter { it.quantity <= it.minStockAlert }.map { item ->
            HeaderNotification(
                id = "low_stock_${item.id}",
                textEn = "Low Stock: ${item.name} (${item.quantity} ${item.unit} remaining, alert limit ${item.minStockAlert})",
                textUr = "کم اسٹاک الرٹ: ${item.name} (${item.quantity} ${item.unit} باقی، حد ${item.minStockAlert} ہے)",
                emoji = "⚠️",
                bgColor = AmberWarningLight,
                borderColor = AmberWarningBorder,
                emojiColor = AmberWarning
            )
        }
    }

    val highCreditNotifs = remember(customers) {
        customers.filter { it.totalCredit > 10000 }.map { cust ->
            HeaderNotification(
                id = "high_credit_${cust.id}",
                textEn = "High Udhaar Notice: ${cust.name} owes Rs. ${cust.totalCredit.toInt()}",
                textUr = "زیادہ بقایا ادھار: ${cust.name} کے ذمے Rs. ${cust.totalCredit.toInt()} ہیں",
                emoji = "💰",
                bgColor = GreenSuccessLight,
                borderColor = GreenSuccessBorder,
                emojiColor = GreenSuccess
            )
        }
    }

    val supplierDueNotifs = remember(suppliers) {
        suppliers.filter { it.totalPayable > 0 && !it.dueDate.isNullOrBlank() }.map { sup ->
            HeaderNotification(
                id = "supplier_due_${sup.id}",
                textEn = "Due Supplier Payment: Rs. ${sup.totalPayable.toInt()} to ${sup.name}",
                textUr = "واجب الادا سپلائر ادائیگی: Rs. ${sup.totalPayable.toInt()} برائے ${sup.name}",
                emoji = "🚚",
                bgColor = RedDangerLight,
                borderColor = RedDangerBorder,
                emojiColor = RedDanger
            )
        }
    }

    val allNotifs = remember(lowStockNotifs, highCreditNotifs, supplierDueNotifs) {
        val list = lowStockNotifs + highCreditNotifs + supplierDueNotifs
        if (list.isEmpty()) {
            listOf(
                HeaderNotification(
                    id = "default_safe",
                    textEn = "Your shop is running perfectly! Low stock, pending udhaar, and loans are all clear.",
                    textUr = "آپ کی دکان کا نظام بہترین چل رہا ہے! کم اسٹاک، بقایا ادھار اور قرضے سب کلیئر ہیں۔",
                    emoji = "✨",
                    bgColor = DukanGreenLight,
                    borderColor = GreenSuccessBorder,
                    emojiColor = DukanGreenPrimary
                )
            )
        } else {
            list
        }
    }
    val hasUnreadNotifs = lowStockNotifs.isNotEmpty() || highCreditNotifs.isNotEmpty() || supplierDueNotifs.isNotEmpty()

    Surface(
        color = Slate50,
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 1.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 6.dp)
        ) {
            // TOP ROW: Sleek App Title & Navigation controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    IconButton(
                        onClick = onToggleMenu,
                        modifier = Modifier
                            .size(34.dp)
                            .background(DukanGreenPrimary.copy(alpha = 0.1f), RoundedCornerShape(10.dp))
                    ) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = if (isUrdu) "مینو" else "Menu",
                            tint = DukanGreenPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    if (currentScreen != Screen.DASHBOARD && onBack != null) {
                        Button(
                            onClick = onBack,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = DukanGreenLight,
                                contentColor = DukanGreenHover
                            ),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.ArrowBack,
                                contentDescription = "Back",
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isUrdu) "واپس" else "Back",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "MyShop",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = DukanGreenHover
                        )
                        Text(
                            text = "Manager",
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp,
                            color = Slate900
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "مائی شاپ منیجر",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = DukanGreenHover
                    )

                    if (!profile.pinCode.isNullOrBlank()) {
                        IconButton(
                            onClick = onLockApp,
                            modifier = Modifier
                                .size(30.dp)
                                .background(Color.White, RoundedCornerShape(8.dp))
                                .border(1.dp, Slate200, RoundedCornerShape(8.dp))
                        ) {
                            Icon(
                                imageVector = Icons.Default.Lock,
                                contentDescription = "Lock App",
                                tint = Slate600,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // 1. SHOP SECTION - 3D Shop Illustration, Name & Subtitle, Quick Buttons & Bell
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.shop_logo),
                        contentDescription = "Shop Icon",
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(16.dp))
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.clickable { showShopDropdown = !showShopDropdown }
                        ) {
                            val shopDisplayName = if (isUrdu && (profile.shopName.isBlank() || profile.shopName == "Bismillah General Store" || profile.shopName == "My Shop")) {
                                profile.shopNameUrdu ?: "بسم اللہ جنرل اسٹور"
                            } else {
                                profile.shopName.ifBlank { "My Shop" }
                            }
                            Text(
                                text = shopDisplayName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Slate900,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowDown,
                                contentDescription = "Switch Shop",
                                tint = Slate800,
                                modifier = Modifier.size(18.dp)
                            )
                        }

                        val subtitle = if (isUrdu) {
                            "دکان کا انتظام اور حساب کتاب"
                        } else {
                            profile.subtitle.ifBlank { "Dukan Management" }
                        }
                        Text(
                            text = subtitle,
                            fontWeight = FontWeight.Normal,
                            fontSize = 11.sp,
                            color = Slate600,
                            maxLines = 1
                        )
                    }
                }

                // Quick Home, Voice Entry & Notification Bell
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Home Button
                    Button(
                        onClick = { onNavigateScreen(Screen.DASHBOARD) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = DukanGreenHover
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DukanGreenPrimary.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.height(34.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Home,
                            contentDescription = "Home",
                            tint = DukanGreenHover,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isUrdu) "ہوم" else "Home",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }

                    // Urdu Voice Entry
                    if (onOpenVoiceEntry != null) {
                        Button(
                            onClick = onOpenVoiceEntry,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = DukanGreenPrimary,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                            modifier = Modifier.height(34.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Mic,
                                contentDescription = "Voice",
                                tint = Color(0xFFFCA5A5),
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isUrdu) "وائس اینٹری" else "Voice",
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }

                    // Bell Icon
                    Box {
                        IconButton(
                            onClick = { showNotifMsg = !showNotifMsg },
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(
                                imageVector = if (hasUnreadNotifs) Icons.Default.Notifications else Icons.Outlined.Notifications,
                                contentDescription = "Notifications",
                                tint = if (hasUnreadNotifs) Slate900 else DukanGreenPrimary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        if (hasUnreadNotifs) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(RedDanger, CircleShape)
                                    .align(Alignment.TopEnd)
                            )
                        }

                        // Notification Popover Dropdown
                        if (showNotifMsg) {
                            Popup(
                                alignment = Alignment.TopEnd,
                                onDismissRequest = { showNotifMsg = false }
                            ) {
                                Card(
                                    modifier = Modifier
                                        .width(280.dp)
                                        .padding(top = 40.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = if (isUrdu) "اطلاعات" else "Notifications",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = Slate900
                                            )
                                            TextButton(
                                                onClick = {
                                                    onNavigateScreen(Screen.NOTIFICATIONS)
                                                    showNotifMsg = false
                                                },
                                                contentPadding = PaddingValues(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = if (isUrdu) "تمام دیکھیں" else "View All",
                                                    fontSize = 11.sp,
                                                    color = DukanGreenHover,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }

                                        Divider(color = Slate100, modifier = Modifier.padding(vertical = 4.dp))

                                        Column(
                                            verticalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.heightIn(max = 240.dp)
                                        ) {
                                            allNotifs.forEach { notif ->
                                                Card(
                                                    colors = CardDefaults.cardColors(containerColor = notif.bgColor),
                                                    shape = RoundedCornerShape(10.dp),
                                                    border = androidx.compose.foundation.BorderStroke(1.dp, notif.borderColor)
                                                ) {
                                                    Row(
                                                        modifier = Modifier.padding(8.dp),
                                                        verticalAlignment = Alignment.Top
                                                    ) {
                                                        Text(text = notif.emoji, fontSize = 14.sp)
                                                        Spacer(modifier = Modifier.width(6.dp))
                                                        Text(
                                                            text = if (isUrdu) notif.textUr else notif.textEn,
                                                            fontSize = 11.sp,
                                                            color = Slate700,
                                                            lineHeight = 15.sp
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
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 2. SEARCH INPUT BAR
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White, RoundedCornerShape(24.dp))
                    .border(1.dp, Slate200, RoundedCornerShape(24.dp))
                    .padding(horizontal = 12.dp, vertical = 4.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Slate400,
                        modifier = Modifier.size(18.dp)
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    TextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = {
                            Text(
                                text = if (isUrdu) "کوئیک ایکشنز یا تلاش کریں..." else "Quick Actions...",
                                color = Slate400,
                                fontSize = 12.sp
                            )
                        },
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )

                    if (searchQuery.isNotBlank()) {
                        IconButton(
                            onClick = { searchQuery = "" },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = Slate400,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    if (onOpenScanner != null) {
                        IconButton(
                            onClick = onOpenScanner,
                            modifier = Modifier
                                .size(28.dp)
                                .background(Slate100, RoundedCornerShape(8.dp))
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = "Barcode Scanner",
                                tint = Slate700,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 3. UTILITY STRIP (Language Toggle, Barcode/QR Scanner, Retail Mode Switcher)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // Language Toggle
                Button(
                    onClick = onToggleUrdu,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Slate700
                    ),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate200),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 6.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Language,
                        contentDescription = "Language",
                        tint = Color(0xFF6366F1),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isUrdu) "اردو / English" else "English / اردو",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Barcode / QR
                if (onOpenScanner != null) {
                    Button(
                        onClick = onOpenScanner,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Slate700
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate200),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 6.dp, vertical = 6.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(34.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = "Scanner",
                            tint = DukanGreenPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isUrdu) "بارکوڈ اسکینر" else "Barcode / QR",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Retail / Wholesale Mode Switcher
                Button(
                    onClick = { onToggleStoreMode?.invoke() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (profile.storeMode == StoreMode.SIMPLE) DukanGreenLight else Color(0xFFEEF2FF),
                        contentColor = if (profile.storeMode == StoreMode.SIMPLE) DukanGreenHover else Color(0xFF3730A3)
                    ),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (profile.storeMode == StoreMode.SIMPLE) GreenSuccessBorder else Color(0xFFA5B4FC)
                    ),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 6.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(34.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Layers,
                        contentDescription = "Store Mode",
                        tint = if (profile.storeMode == StoreMode.SIMPLE) DukanGreenHover else Color(0xFF4F46E5),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (profile.storeMode == StoreMode.SIMPLE) {
                            if (isUrdu) "ریٹیل موڈ" else "Retail Mode"
                        } else {
                            if (isUrdu) "ہول سیل موڈ" else "Wholesale Mode"
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
