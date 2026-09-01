package com.saleemkhan.myshopmanager.utils

import com.saleemkhan.myshopmanager.model.*
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.text.SimpleDateFormat
import java.util.*

object FormatUtils {
    val DEFAULT_APP_STATE = AppState(
        profile = ShopProfile(
            id = "shop_01",
            shopName = "My Shop",
            shopNameUrdu = "میری دکان",
            subtitle = "Dukan Management",
            ownerName = "",
            phone = "",
            cnic = "",
            ntn = "",
            address = "",
            storeMode = StoreMode.SIMPLE,
            storeCategory = StoreCategory.KIRYANA_GENERAL,
            currencySymbol = "Rs.",
            pinCode = null,
            biometricsEnabled = false,
            activeLanguage = "en"
        ),
        transactions = emptyList(),
        deletedTransactions = emptyList(),
        inventory = emptyList(),
        customers = emptyList(),
        suppliers = emptyList(),
        bankAccounts = listOf(
            BankAccount(
                id = "acc_cash",
                accountTitle = "Cash in Dukan Counter",
                bankName = "Cash Counter",
                accountNumber = "N/A",
                type = "CASH",
                balance = 0.0
            ),
            BankAccount(
                id = "acc_meezan",
                accountTitle = "Bank Account",
                bankName = "Bank",
                accountNumber = "",
                type = "BANK",
                balance = 0.0
            ),
            BankAccount(
                id = "acc_easypaisa",
                accountTitle = "EasyPaisa Wallet",
                bankName = "EasyPaisa",
                accountNumber = "",
                type = "WALLET",
                balance = 0.0
            ),
            BankAccount(
                id = "acc_jazzcash",
                accountTitle = "JazzCash Wallet",
                bankName = "JazzCash",
                accountNumber = "",
                type = "WALLET",
                balance = 0.0
            )
        ),
        businessAssets = emptyList(),
        personalAssets = emptyList(),
        loans = emptyList(),
        householdExpenses = HouseholdExpenses(),
        otherIncome = OtherIncome(),
        taxRecord = TaxRecord(),
        activeShopId = "shop_01",
        otherShops = listOf(ShopInfo("shop_01", "My Shop"))
    )

    private val currencyFormat = DecimalFormat("#,##0", DecimalFormatSymbols(Locale.US))
    private val decimalCurrencyFormat = DecimalFormat("#,##0.##", DecimalFormatSymbols(Locale.US))

    fun formatCurrency(amount: Double, symbol: String = "Rs."): String {
        return "$symbol ${currencyFormat.format(amount)}"
    }

    fun formatNumber(amount: Double): String {
        return decimalCurrencyFormat.format(amount)
    }

    fun sanitizeQuantity(qty: Double?): Double {
        if (qty == null || qty.isNaN() || qty.isInfinite()) return 0.0
        return Math.max(0.0, qty)
    }

    fun getTodayIsoDate(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        return sdf.format(Date())
    }

    fun formatDisplayDate(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return ""
        return try {
            if (dateStr.length >= 10) {
                dateStr.substring(0, 10)
            } else {
                dateStr
            }
        } catch (e: Exception) {
            dateStr
        }
    }
}
