package com.saleemkhan.myshopmanager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.saleemkhan.myshopmanager.model.AppState
import com.saleemkhan.myshopmanager.model.ShopProfile
import com.saleemkhan.myshopmanager.model.StoreMode
import com.saleemkhan.myshopmanager.ui.theme.*

@Composable
fun SettingsScreen(
    state: AppState,
    isUrdu: Boolean,
    onUpdateProfile: (ShopProfile) -> Unit
) {
    var shopName by remember(state.profile) { mutableStateOf(state.profile.shopName) }
    var ownerName by remember(state.profile) { mutableStateOf(state.profile.ownerName) }
    var city by remember(state.profile) { mutableStateOf(state.profile.city) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Slate200),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = if (isUrdu) "دکان کی پروفائل اور تفصیلات" else "Shop Profile & Details",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Slate900
                    )

                    OutlinedTextField(
                        value = shopName,
                        onValueChange = { shopName = it },
                        label = { Text(if (isUrdu) "دکان کا نام" else "Shop Name") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = ownerName,
                        onValueChange = { ownerName = it },
                        label = { Text(if (isUrdu) "مالک کا نام" else "Owner Name") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = city,
                        onValueChange = { city = it },
                        label = { Text(if (isUrdu) "شہر / پتہ" else "City / Address") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            onUpdateProfile(
                                state.profile.copy(
                                    shopName = shopName,
                                    ownerName = ownerName,
                                    city = city
                                )
                            )
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(44.dp)
                    ) {
                        Text(text = if (isUrdu) "تبدیلیاں محفوظ کریں" else "Save Changes", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
