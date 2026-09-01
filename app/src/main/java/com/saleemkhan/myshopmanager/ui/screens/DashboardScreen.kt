package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saleemkhan.myshopmanager.R
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.components.AutoScrollText
import com.saleemkhan.myshopmanager.ui.theme.*
import com.saleemkhan.myshopmanager.utils.FormatUtils
import com.saleemkhan.myshopmanager.utils.TaxEngine
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DashboardScreen(
    state: AppState,
    isUrdu: Boolean,
    onOpenQuickEntry: (TransactionType) -> Unit,
    onOpenVoiceEntry: () -> Unit,
    onNavigateScreen: (Screen) -> Unit,
    onOpenCalendar: () -> Unit,
    onOpenGraphs: () -> Unit,
    onOpenAi: () -> Unit,
    onOpenCashAccounts: () -> Unit
) {
    val taxSummary = remember(state) { TaxEngine.calculateFbrSummary(state) }

    // Today's metrics
    val todayIso = remember { FormatUtils.getTodayIsoDate() }
    val todayTransactions = remember(state.transactions, todayIso) {
        state.transactions.filter { t ->
            t.date.startsWith(todayIso)
        }
    }

    val todaySales = remember(todayTransactions) {
        todayTransactions.filter { it.type == TransactionType.SALE }.sumOf { it.amount }
    }
    val todayPurchases = remember(todayTransactions) {
        todayTransactions.filter { it.type == TransactionType.PURCHASE }.sumOf { it.amount }
    }
    val todayExpenses = remember(todayTransactions) {
        todayTransactions.filter { it.type == TransactionType.EXPENSE }.sumOf { it.amount }
    }

    val cashBalance = remember(state.bankAccounts) {
        state.bankAccounts.find { it.type == "CASH" }?.balance ?: 0.0
    }

    val dateDisplay = remember {
        val sdf = SimpleDateFormat("EEE, dd MMM yyyy", Locale.US)
        sdf.format(Date())
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(horizontal = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 10.dp, bottom = 32.dp)
    ) {
        // 1. HERO WELCOME BANNER CARD
        item {
            Card(
                shape = RoundedCornerShape(28.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                border = BorderStroke(1.dp, Color(0xFFD1FAE5)),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color.White, Color(0xFFF0FDF4), Color(0xFFD1FAE5))
                            )
                        )
                ) {
                    // 3D Store Asset in background / side
                    Image(
                        painter = painterResource(id = R.drawable.shop_logo),
                        contentDescription = "Store Illustration",
                        modifier = Modifier
                            .size(170.dp)
                            .align(Alignment.BottomEnd)
                            .offset(x = 10.dp, y = 15.dp),
                        contentScale = ContentScale.Fit
                    )

                    // Date Pill Top Right
                    Surface(
                        color = Color(0xFFECFDF5),
                        shape = RoundedCornerShape(20.dp),
                        border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(top = 12.dp, end = 12.dp)
                            .clickable { onOpenCalendar() }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(18.dp)
                                    .background(DukanGreenPrimary, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CalendarToday,
                                    contentDescription = "Date",
                                    tint = Color.White,
                                    modifier = Modifier.size(10.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = dateDisplay,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = DukanGreenHover
                            )
                        }
                    }

                    // Welcome Text
                    Column(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(0.65f)
                            .padding(start = 18.dp, top = 16.dp, bottom = 48.dp),
                        verticalArrangement = Arrangement.Top
                    ) {
                        Text(
                            text = if (isUrdu) "السلام علیکم،" else "Assalam o Alaikum,",
                            fontSize = if (isUrdu) 18.sp else 15.sp,
                            fontWeight = FontWeight.Normal,
                            color = Slate800
                        )
                        Text(
                            text = (state.profile.ownerName.ifBlank { "Muhammad Saleem" }) + "!",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            color = DukanGreenPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (isUrdu) "یہاں آپ کے بزنس کا پورا کنٹرول،\nایک جگہ، آسان اور اسمارٹ طریقے سے۔" else "Complete control of your business here,\nin one place, simple and smart.",
                            fontSize = 11.sp,
                            color = Slate700,
                            lineHeight = 15.sp
                        )
                    }

                    // Bottom Pill: "Get Help from AI Assistant"
                    Surface(
                        onClick = onOpenAi,
                        color = Color.Transparent,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 10.dp)
                            .shadow(2.dp, RoundedCornerShape(14.dp))
                    ) {
                        Box(
                            modifier = Modifier
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(DukanGreenPrimary, DukanGreenHover)
                                    )
                                )
                                .padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.SmartToy,
                                    contentDescription = "AI",
                                    tint = Color(0xFFA7F3D0),
                                    modifier = Modifier.size(16.dp)
                                )
                                Text(
                                    text = if (isUrdu) "اے آئی اسسٹنٹ سے مدد لیں" else "Get Help from AI Assistant",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Icon(
                                    imageVector = Icons.Default.AutoAwesome,
                                    contentDescription = "Stars",
                                    tint = Color(0xFFFDE047),
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. TOP QUICK ACTION BUTTONS ROW
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    QuickActionButton(
                        title = if (isUrdu) "فروخت" else "Sales",
                        subtitle = if (isUrdu) "سیلز کا جائزہ" else "Track sales",
                        icon = Icons.Default.ShoppingBag,
                        iconTint = DukanGreenPrimary,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenQuickEntry(TransactionType.SALE) }
                    )
                    QuickActionButton(
                        title = if (isUrdu) "خریداری" else "Purchases",
                        subtitle = if (isUrdu) "مال کا جائزہ" else "Track purchases",
                        icon = Icons.Default.LocalShipping,
                        iconTint = Color(0xFF2563EB),
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenQuickEntry(TransactionType.PURCHASE) }
                    )
                    QuickActionButton(
                        title = if (isUrdu) "اخراجات" else "Expenses",
                        subtitle = if (isUrdu) "اخراجات کا حساب" else "Track expenses",
                        icon = Icons.Default.Receipt,
                        iconTint = Color(0xFFDC2626),
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenQuickEntry(TransactionType.EXPENSE) }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    QuickActionButton(
                        title = if (isUrdu) "ادھار وصولی" else "Collect Udhaar",
                        subtitle = if (isUrdu) "وصولی کا ریکارڈ" else "Collect dues",
                        icon = Icons.Default.Paid,
                        iconTint = Color(0xFFD97706),
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenQuickEntry(TransactionType.RECEIPT) }
                    )
                    QuickActionButton(
                        title = if (isUrdu) "سپلائر ادائیگی" else "Pay Supplier",
                        subtitle = if (isUrdu) "سپلائرز کو ادائیگی" else "Pay suppliers",
                        icon = Icons.Default.Send,
                        iconTint = Color(0xFF7C3AED),
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenQuickEntry(TransactionType.PAYMENT) }
                    )
                    QuickActionButton(
                        title = if (isUrdu) "گراف و تجزیہ" else "Analytics",
                        subtitle = if (isUrdu) "کاروباری رپورٹ" else "View analytics",
                        icon = Icons.Default.BarChart,
                        iconTint = Color(0xFF4F46E5),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenGraphs
                    )
                }

                // Cash on Hand Button
                Surface(
                    onClick = onOpenCashAccounts,
                    shape = RoundedCornerShape(14.dp),
                    color = Color(0xFFECFDF5),
                    border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.AccountBalanceWallet,
                                contentDescription = "Cash",
                                tint = DukanGreenHover,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = if (isUrdu) "نقدی ہاتھ میں (Cash in Hand)" else "Cash on Hand",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = Slate800
                            )
                        }
                        Text(
                            text = FormatUtils.formatCurrency(cashBalance),
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = DukanGreenHover
                        )
                    }
                }
            }
        }

        // 3. TODAY'S OVERVIEW SECTION (Sales & Purchases Cards)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUrdu) "آج کا جائزہ" else "Today's Overview",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = Slate900
                    )
                    Text(
                        text = if (isUrdu) "تمام دیکھیں" else "View All",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = DukanGreenPrimary,
                        modifier = Modifier.clickable { onNavigateScreen(Screen.REPORTS) }
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Total Sales Card
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Slate200)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (isUrdu) "کل فروخت" else "Total Sales",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate500
                                )
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .background(Color(0xFFDCFCE7), RoundedCornerShape(6.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.NorthEast,
                                        contentDescription = "Up",
                                        tint = DukanGreenHover,
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = FormatUtils.formatCurrency(todaySales),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = DukanGreenPrimary
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Surface(
                                color = Color(0xFFDCFCE7),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (isUrdu) "▲ 12٪ بمقابلہ کل" else "▲ 12% vs yesterday",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF15803D),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    // Total Purchases Card
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = BorderStroke(1.dp, Slate200)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (isUrdu) "کل خریداری" else "Total Purchases",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Slate500
                                )
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .background(Color(0xFFEEF2FF), RoundedCornerShape(6.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.SouthWest,
                                        contentDescription = "Down",
                                        tint = Color(0xFF4F46E5),
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = FormatUtils.formatCurrency(todayPurchases),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF312E81)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Surface(
                                color = Slate100,
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = if (isUrdu) "— 0٪ بمقابلہ کل" else "— 0% vs yesterday",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Slate600,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 4. FINANCIAL SUMMARY CARDS GRID (Net Profit, Total Capital, Total Expenses, Total Liabilities)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetricMiniCard(
                        title = if (isUrdu) "کل منافع" else "Net Profit",
                        value = if (taxSummary.isStockUnavailable) (if (isUrdu) "نامکمل" else "Incomplete") else FormatUtils.formatCurrency(taxSummary.netProfit ?: 0.0),
                        icon = Icons.Default.MonetizationOn,
                        iconBg = Color(0xFFDCFCE7),
                        iconTint = DukanGreenPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    MetricMiniCard(
                        title = if (isUrdu) "مجموعہ اصل" else "Total Capital",
                        value = if (taxSummary.ownerCapital == null) (if (isUrdu) "نامکمل" else "Incomplete") else FormatUtils.formatCurrency(taxSummary.ownerCapital),
                        icon = Icons.Default.AccountBalanceWallet,
                        iconBg = Color(0xFFDBEAFE),
                        iconTint = Color(0xFF2563EB),
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetricMiniCard(
                        title = if (isUrdu) "کل خرچہ" else "Total Expenses",
                        value = FormatUtils.formatCurrency(taxSummary.directExpenses),
                        icon = Icons.Default.ReceiptLong,
                        iconBg = Color(0xFFFEE2E2),
                        iconTint = Color(0xFFDC2626),
                        modifier = Modifier.weight(1f)
                    )
                    MetricMiniCard(
                        title = if (isUrdu) "مجموعہ قرضہ" else "Total Liabilities",
                        value = FormatUtils.formatCurrency(taxSummary.totalLiabilities),
                        icon = Icons.Default.Group,
                        iconBg = Color(0xFFF3E8FF),
                        iconTint = Color(0xFF7C3AED),
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }

        // 5. RECEIVABLES (TOTAL UDHAAR) DARK AMBER CARD
        item {
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(Color(0xFF0F172A), Color(0xFF451A03), Color(0xFF0F172A))
                            )
                        )
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.MonetizationOn,
                                    contentDescription = "Udhaar",
                                    tint = Color(0xFFFBBF24),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isUrdu) "کل بقایا ادھار (Total Udhaar)" else "Total Receivables (Udhaar)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFFDE68A)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = FormatUtils.formatCurrency(taxSummary.totalReceivables),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFFFFBEB)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (isUrdu) "کسٹمرز کے ذمہ واجب الادا رقم" else "Pending Customer Dues",
                                fontSize = 11.sp,
                                color = Color(0xFFFDE68A).copy(alpha = 0.8f)
                            )
                        }

                        Button(
                            onClick = { onNavigateScreen(Screen.KHATA) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFF59E0B),
                                contentColor = Slate900
                            ),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = if (isUrdu) "تفصیلات دیکھیں" else "View Details",
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                imageVector = Icons.Default.ArrowForward,
                                contentDescription = "View",
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun QuickActionButton(
    title: String,
    subtitle: String,
    icon: ImageVector,
    iconTint: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Slate200),
        modifier = modifier.height(52.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 6.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = iconTint,
                modifier = Modifier.size(18.dp)
            )

            Spacer(modifier = Modifier.width(4.dp))

            // Vertical divider
            Box(
                modifier = Modifier
                    .width(1.dp)
                    .height(24.dp)
                    .background(Slate200)
            )

            Spacer(modifier = Modifier.width(4.dp))

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 10.sp,
                    color = Slate900,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    fontWeight = FontWeight.Normal,
                    fontSize = 8.sp,
                    color = Slate500,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun MetricMiniCard(
    title: String,
    value: String,
    icon: ImageVector,
    iconBg: Color,
    iconTint: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Slate200)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .background(iconBg, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = iconTint,
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = title,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate500
                )
                Text(
                    text = value,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate900,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
