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
import com.saleemkhan.myshopmanager.model.StoreCategory
import com.saleemkhan.myshopmanager.model.StoreMode
import com.saleemkhan.myshopmanager.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    state: AppState,
    isUrdu: Boolean,
    onUpdateProfile: (ShopProfile) -> Unit
) {
    var shopName by remember(state.profile) { mutableStateOf(state.profile.shopName) }
    var shopNameUrdu by remember(state.profile) { mutableStateOf(state.profile.shopNameUrdu ?: "") }
    var ownerName by remember(state.profile) { mutableStateOf(state.profile.ownerName) }
    var phone by remember(state.profile) { mutableStateOf(state.profile.phone) }
    var cnic by remember(state.profile) { mutableStateOf(state.profile.cnic) }
    var ntn by remember(state.profile) { mutableStateOf(state.profile.ntn) }
    var address by remember(state.profile) { mutableStateOf(state.profile.address) }
    var pinCode by remember(state.profile) { mutableStateOf(state.profile.securityPin) }
    var selectedCategory by remember(state.profile) { mutableStateOf(state.profile.storeCategory) }
    var showSavedToast by remember { mutableStateOf(false) }

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
                        label = { Text(if (isUrdu) "دکان کا نام (انگریزی)" else "Shop Name (English)") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = shopNameUrdu,
                        onValueChange = { shopNameUrdu = it },
                        label = { Text(if (isUrdu) "دکان کا نام (اردو)" else "Shop Name (Urdu)") },
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

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            label = { Text(if (isUrdu) "فون نمبر" else "Phone Number") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        )

                        OutlinedTextField(
                            value = cnic,
                            onValueChange = { cnic = it },
                            label = { Text(if (isUrdu) "شناختی کارڈ نمبر" else "CNIC") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = ntn,
                        onValueChange = { ntn = it },
                        label = { Text(if (isUrdu) "این ٹی این نمبر (NTN)" else "NTN Number") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text(if (isUrdu) "شہر / پتہ" else "City / Address") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = pinCode,
                        onValueChange = { if (it.length <= 6) pinCode = it },
                        label = { Text(if (isUrdu) "سیکیورٹی پن لاک (4 ہندسے)" else "Security PIN Lock (4 Digits)") },
                        placeholder = { Text("Leave empty to disable PIN") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            onUpdateProfile(
                                state.profile.copy(
                                    shopName = shopName,
                                    shopNameUrdu = shopNameUrdu.ifBlank { null },
                                    ownerName = ownerName,
                                    phone = phone,
                                    cnic = cnic,
                                    ntn = ntn,
                                    address = address,
                                    pinCode = pinCode.ifBlank { null },
                                    passwordCode = pinCode.ifBlank { null },
                                    storeCategory = selectedCategory
                                )
                            )
                            showSavedToast = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = DukanGreenPrimary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(46.dp)
                    ) {
                        Text(text = if (isUrdu) "تبدیلیاں محفوظ کریں" else "Save Changes", fontWeight = FontWeight.Bold)
                    }

                    if (showSavedToast) {
                        Text(
                            text = if (isUrdu) "✓ تبدیلیاں کامیابی سے محفوظ ہو گئیں!" else "✓ Settings saved successfully!",
                            color = DukanGreenHover,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}
