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
                .padding(vertical = 4.dp)
        ) {
            // TOP ROW: Sleek App Title & Navigation controls
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp),
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

            // 1. SHOP SECTION - 3D Shop Illustration, Name & Subtitle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = if (isUrdu) 14.dp else 0.dp, end = if (isUrdu) 0.dp else 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.shop_logo),
                    contentDescription = "Shop Icon",
                    modifier = Modifier
                        .width(130.dp)
                        .height(88.dp)
                        .scale(scaleX = if (isUrdu) 1f else -1f, scaleY = 1f)
                        .clip(RoundedCornerShape(16.dp))
                )

                Spacer(modifier = Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    val rawShopName = if (isUrdu && (profile.shopName.isBlank() || profile.shopName == "Bismillah General Store" || profile.shopName == "My Shop")) {
                        profile.shopNameUrdu ?: "بسم اللہ جنرل اسٹور"
                    } else {
                        profile.shopName.ifBlank { "My Shop" }
                    }

                    // Extract text inside parentheses ( ), if any
                    val parenMatch = Regex("""\((.*?)\)""").find(rawShopName)
                    val mainShopName = if (parenMatch != null) {
                        rawShopName.replace(parenMatch.value, "").trim()
                    } else {
                        rawShopName.trim()
                    }
                    val parenText = parenMatch?.groupValues?.get(1)?.trim()

                    Column(
                        modifier = Modifier.clickable { showShopDropdown = !showShopDropdown }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = mainShopName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 17.sp,
                                color = Slate900,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowDown,
                                contentDescription = "Switch Shop",
                                tint = Slate800,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // If user entered (text), display it on the second line without bold
                        if (!parenText.isNullOrBlank()) {
                            Text(
                                text = "($parenText)",
                                fontWeight = FontWeight.Normal,
                                fontSize = 13.sp,
                                color = Slate700,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    val subtitle = if (isUrdu) {
                        "دکان کا انتظام اور حساب کتاب"
                    } else {
                        profile.subtitle.ifBlank { "Dukan Management" }
                    }
                    Text(
                        text = subtitle,
                        fontWeight = FontWeight.Normal,
                        fontSize = 12.sp,
                        color = Slate600,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(1.dp))

            // 1B. QUICK BAR ROW - Home, Voice Entry & Notification Bell (Uniform size, height & spacing)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Home Button (White background with app green icon and text, fully rounded)
                Button(
                    onClick = { onNavigateScreen(Screen.DASHBOARD) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = DukanGreenPrimary
                    ),
                    border = androidx.compose.foundation.BorderStroke(0.4.dp, GreenSuccessBorder),
                    shape = CircleShape,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Home,
                        contentDescription = "Home",
                        tint = DukanGreenPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isUrdu) "ہوم" else "Home",
                        color = DukanGreenPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        maxLines = 1
                    )
                }

                // Urdu Voice Entry (Fully rounded, same weight and height as Home button)
                if (onOpenVoiceEntry != null) {
                    Button(
                        onClick = onOpenVoiceEntry,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = DukanGreenPrimary,
                            contentColor = Color.White
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, DukanGreenPrimary),
                        shape = CircleShape,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Mic,
                            contentDescription = "Voice",
                            tint = Color(0xFFFCA5A5),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (isUrdu) "وائس اینٹری" else "Voice Entry",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            maxLines = 1
                        )
                    }
                }

                // Bell Icon with popover (Without box, prominent larger bell icon proportionate to 38.dp button height)
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .clickable { showNotifMsg = !showNotifMsg },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (hasUnreadNotifs) Icons.Outlined.NotificationsActive else Icons.Outlined.NotificationsNone,
                        contentDescription = "Notifications",
                        tint = if (hasUnreadNotifs) RedDanger else DukanGreenPrimary,
                        modifier = Modifier.size(32.dp)
                    )
                    if (hasUnreadNotifs) {
                        Box(
                            modifier = Modifier
                                .size(9.dp)
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
                                    .padding(top = 42.dp),
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

            Spacer(modifier = Modifier.height(6.dp))

            // 2. SEARCH INPUT BAR (Premium Full-Round & Sleek Height)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(38.dp)
                    .padding(horizontal = 14.dp),
                shape = CircleShape,
                color = Color.White,
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate200),
                shadowElevation = 0.5.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(start = 12.dp, end = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Slate400,
                        modifier = Modifier.size(17.dp)
                    )

                    Spacer(modifier = Modifier.width(6.dp))

                    androidx.compose.foundation.text.BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(
                            fontSize = 12.sp,
                            color = Slate800
                        ),
                        modifier = Modifier
                            .weight(1f)
                            .padding(vertical = 2.dp),
                        decorationBox = { innerTextField ->
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = if (isUrdu) "کوئیک ایکشنز یا تلاش کریں..." else "Quick Actions...",
                                    color = Slate400,
                                    fontSize = 12.sp
                                )
                            }
                            innerTextField()
                        }
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
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }

                    if (onOpenScanner != null) {
                        IconButton(
                            onClick = onOpenScanner,
                            modifier = Modifier.size(28.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = "Barcode Scanner",
                                tint = DukanGreenPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 3. UTILITY STRIP (Language Toggle, Barcode/QR Scanner, Retail Mode Switcher)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp),
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
