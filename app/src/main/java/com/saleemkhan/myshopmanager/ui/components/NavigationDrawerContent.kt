package com.saleemkhan.myshopmanager.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saleemkhan.myshopmanager.model.Screen
import com.saleemkhan.myshopmanager.ui.theme.*

data class NavItem(
    val screen: Screen,
    val labelEn: String,
    val labelUr: String,
    val icon: ImageVector
)

val NAV_ITEMS = listOf(
    NavItem(Screen.DASHBOARD, "Home", "ہوم", Icons.Default.Home),
    NavItem(Screen.TRANSACTIONS, "Recent Journal", "روزنامچہ (اینٹریز)", Icons.Default.Receipt),
    NavItem(Screen.KHATA, "Khata", "کھاتہ", Icons.Default.MenuBook),
    NavItem(Screen.INVENTORY, "Stock", "اسٹاک", Icons.Default.Inventory2),
    NavItem(Screen.ASSETS_LOANS, "Assets & Loans", "اثاثے و قرضے", Icons.Default.AccountBalance),
    NavItem(Screen.FBR_TAX, "FBR Tax", "ٹیکس تیاری", Icons.Default.AssignmentTurnedIn),
    NavItem(Screen.REPORTS, "Reports", "رپورٹس", Icons.Default.Assessment),
    NavItem(Screen.ANALYTICS, "Analytics", "گراف و تجزیہ", Icons.Default.BarChart),
    NavItem(Screen.BACKUP_SYNC, "Backup & Sync", "بیک اپ اور سنک", Icons.Default.CloudSync),
    NavItem(Screen.NOTIFICATIONS, "Notifications", "اطلاعات", Icons.Default.Notifications),
    NavItem(Screen.SETTINGS, "Settings", "سیٹنگز", Icons.Default.Settings)
)

@Composable
fun NavigationDrawerContent(
    currentScreen: Screen,
    onSelectScreen: (Screen) -> Unit,
    isUrdu: Boolean,
    onClose: () -> Unit
) {
    ModalDrawerSheet(
        drawerContainerColor = Color.White,
        modifier = Modifier.width(280.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "MyShop",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = DukanGreenHover
                    )
                    Text(
                        text = "Manager",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = Slate900
                    )
                }

                IconButton(onClick = onClose) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close Menu",
                        tint = Slate600
                    )
                }
            }

            Divider(color = Slate100, modifier = Modifier.padding(vertical = 12.dp))

            // Navigation List
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                NAV_ITEMS.forEach { item ->
                    val isSelected = currentScreen == item.screen
                    val label = if (isUrdu) item.labelUr else item.labelEn

                    Surface(
                        color = if (isSelected) DukanGreenLight else Color.Transparent,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                onSelectScreen(item.screen)
                                onClose()
                            }
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = item.icon,
                                contentDescription = label,
                                tint = if (isSelected) DukanGreenHover else Slate600,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = label,
                                fontSize = 14.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                color = if (isSelected) DukanGreenHover else Slate800
                            )
                        }
                    }
                }
            }

            Divider(color = Slate100, modifier = Modifier.padding(vertical = 12.dp))

            Text(
                text = "v2.5 (100% Native Jetpack Compose)",
                fontSize = 10.sp,
                color = Slate400,
                modifier = Modifier.align(Alignment.CenterHorizontally)
            )
        }
    }
}
