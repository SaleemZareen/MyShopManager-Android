package com.saleemkhan.myshopmanager.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.saleemkhan.myshopmanager.data.AppStateRepository
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.components.*
import com.saleemkhan.myshopmanager.ui.screens.*
import com.saleemkhan.myshopmanager.ui.theme.MyShopManagerTheme
import com.saleemkhan.myshopmanager.utils.FormatUtils
import kotlinx.coroutines.launch

@Composable
fun MyShopManagerApp() {
    val context = LocalContext.current
    val repository = remember { AppStateRepository.getInstance(context) }
    val appState by repository.appState.collectAsState()

    var currentScreen by remember { mutableStateOf(Screen.DASHBOARD) }
    var screenHistory by remember { mutableStateOf(listOf(Screen.DASHBOARD)) }

    val isUrdu = appState.profile.activeLanguage == "ur"
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()

    var quickEntryType by remember { mutableStateOf<TransactionType?>(null) }
    var isQuickEntryOpen by remember { mutableStateOf(false) }

    // Dialog & Overlay states
    var isLocked by remember { mutableStateOf(appState.profile.securityPin.isNotBlank()) }
    var isVoiceEntryOpen by remember { mutableStateOf(false) }
    var isBarcodeScannerOpen by remember { mutableStateOf(false) }
    var isCashAccountsOpen by remember { mutableStateOf(false) }
    var isCalendarOpen by remember { mutableStateOf(false) }
    var isAiOpen by remember { mutableStateOf(false) }

    fun navigateTo(screen: Screen) {
        if (screen != currentScreen) {
            screenHistory = screenHistory + screen
            currentScreen = screen
        }
    }

    fun handleBack() {
        if (screenHistory.size > 1) {
            screenHistory = screenHistory.dropLast(1)
            currentScreen = screenHistory.last()
        } else if (currentScreen != Screen.DASHBOARD) {
            currentScreen = Screen.DASHBOARD
            screenHistory = listOf(Screen.DASHBOARD)
        }
    }

    MyShopManagerTheme(isUrdu = isUrdu) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
        ) {
            // Reserved Mobile Status Bar Area across entire app so status bar icons never overlap content
            Spacer(
                modifier = Modifier
                    .fillMaxWidth()
                    .windowInsetsTopHeight(WindowInsets.statusBars)
                    .background(Color.White)
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                if (isLocked && appState.profile.securityPin.isNotBlank()) {
                    SecurityLockScreen(
                        expectedPin = appState.profile.securityPin,
                        isUrdu = isUrdu,
                        onUnlockSuccess = { isLocked = false }
                    )
                } else {
                    ModalNavigationDrawer(
                        drawerState = drawerState,
                        drawerContent = {
                            NavigationDrawerContent(
                                currentScreen = currentScreen,
                                onSelectScreen = { screen ->
                                    navigateTo(screen)
                                },
                                isUrdu = isUrdu,
                                onClose = {
                                    coroutineScope.launch { drawerState.close() }
                                }
                            )
                        }
                    ) {
                        Scaffold(
                            contentWindowInsets = WindowInsets(0, 0, 0, 0),
                            topBar = {
                                if (currentScreen != Screen.DASHBOARD) {
                                    AppHeader(
                                        profile = appState.profile,
                                        otherShops = appState.otherShops,
                                        inventory = appState.inventory,
                                        customers = appState.customers,
                                        suppliers = appState.suppliers,
                                        loans = appState.loans,
                                        isUrdu = isUrdu,
                                        currentScreen = currentScreen,
                                        onBack = if (screenHistory.size > 1 || currentScreen != Screen.DASHBOARD) {
                                            { handleBack() }
                                        } else null,
                                        onToggleUrdu = {
                                            val newLang = if (isUrdu) "en" else "ur"
                                            repository.updateState { it.copy(profile = it.profile.copy(activeLanguage = newLang)) }
                                        },
                                        onSwitchShop = { shopId ->
                                            repository.updateState { it.copy(activeShopId = shopId) }
                                        },
                                        onLockApp = {
                                            if (appState.profile.securityPin.isNotBlank()) {
                                                isLocked = true
                                            }
                                        },
                                        onOpenScanner = { isBarcodeScannerOpen = true },
                                        onOpenVoiceEntry = { isVoiceEntryOpen = true },
                                        onOpenCalendar = { isCalendarOpen = true },
                                        onToggleStoreMode = {
                                            val nextMode = if (appState.profile.storeMode == StoreMode.SIMPLE) StoreMode.SPECIALIZED else StoreMode.SIMPLE
                                            repository.updateState { it.copy(profile = it.profile.copy(storeMode = nextMode)) }
                                        },
                                        onOpenQuickEntry = { type ->
                                            quickEntryType = type
                                            isQuickEntryOpen = true
                                        },
                                        onNavigateScreen = { screen ->
                                            navigateTo(screen)
                                        },
                                        onToggleMenu = {
                                            coroutineScope.launch {
                                                if (drawerState.isOpen) drawerState.close() else drawerState.open()
                                            }
                                        }
                                    )
                                }
                            }
                        ) { paddingValues ->
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(paddingValues)
                            ) {
                                when (currentScreen) {
                                    Screen.DASHBOARD -> {
                                        DashboardScreen(
                                            state = appState,
                                            isUrdu = isUrdu,
                                            header = {
                                                AppHeader(
                                                    profile = appState.profile,
                                                    otherShops = appState.otherShops,
                                                    inventory = appState.inventory,
                                                    customers = appState.customers,
                                                    suppliers = appState.suppliers,
                                                    loans = appState.loans,
                                                    isUrdu = isUrdu,
                                                    currentScreen = currentScreen,
                                                    onBack = null,
                                                    onToggleUrdu = {
                                                        val newLang = if (isUrdu) "en" else "ur"
                                                        repository.updateState { it.copy(profile = it.profile.copy(activeLanguage = newLang)) }
                                                    },
                                                    onSwitchShop = { shopId ->
                                                        repository.updateState { it.copy(activeShopId = shopId) }
                                                    },
                                                    onLockApp = {
                                                        if (appState.profile.securityPin.isNotBlank()) {
                                                            isLocked = true
                                                        }
                                                    },
                                                    onOpenScanner = { isBarcodeScannerOpen = true },
                                                    onOpenVoiceEntry = { isVoiceEntryOpen = true },
                                                    onOpenCalendar = { isCalendarOpen = true },
                                                    onToggleStoreMode = {
                                                        val nextMode = if (appState.profile.storeMode == StoreMode.SIMPLE) StoreMode.SPECIALIZED else StoreMode.SIMPLE
                                                        repository.updateState { it.copy(profile = it.profile.copy(storeMode = nextMode)) }
                                                    },
                                                    onOpenQuickEntry = { type ->
                                                        quickEntryType = type
                                                        isQuickEntryOpen = true
                                                    },
                                                    onNavigateScreen = { screen ->
                                                        navigateTo(screen)
                                                    },
                                                    onToggleMenu = {
                                                        coroutineScope.launch {
                                                            if (drawerState.isOpen) drawerState.close() else drawerState.open()
                                                        }
                                                    }
                                                )
                                            },
                                            onOpenQuickEntry = { type ->
                                                quickEntryType = type
                                                isQuickEntryOpen = true
                                            },
                                            onOpenVoiceEntry = { isVoiceEntryOpen = true },
                                            onNavigateScreen = { screen -> navigateTo(screen) },
                                            onOpenCalendar = { isCalendarOpen = true },
                                            onOpenGraphs = { navigateTo(Screen.ANALYTICS) },
                                            onOpenAi = { isAiOpen = true },
                                            onOpenCashAccounts = { isCashAccountsOpen = true }
                                        )
                                    }
                            Screen.TRANSACTIONS -> {
                                TransactionsScreen(
                                    state = appState,
                                    isUrdu = isUrdu,
                                    onOpenQuickEntry = { type ->
                                        quickEntryType = type
                                        isQuickEntryOpen = true
                                    },
                                    onDeleteTransaction = { id ->
                                        repository.updateState { it.copy(transactions = it.transactions.filter { tx -> tx.id != id }) }
                                    }
                                )
                            }
                            Screen.KHATA -> {
                                KhataScreen(
                                    state = appState,
                                    isUrdu = isUrdu,
                                    onAddCustomer = { cust ->
                                        repository.updateState { it.copy(customers = it.customers + cust) }
                                    },
                                    onAddSupplier = { sup ->
                                        repository.updateState { it.copy(suppliers = it.suppliers + sup) }
                                    },
                                    onRecordPayment = { txType, partyName, amt ->
                                        val newTx = Transaction(
                                            id = "tx_${System.currentTimeMillis()}",
                                            type = txType,
                                            amount = amt,
                                            category = if (txType == TransactionType.RECEIPT) "Customer Udhaar" else "Supplier Payment",
                                            paymentMethod = PaymentMethod.CASH,
                                            partyName = partyName,
                                            date = FormatUtils.getTodayIsoDate()
                                        )
                                        repository.updateState { current ->
                                            val updatedTx = listOf(newTx) + current.transactions
                                            val updatedCust = if (txType == TransactionType.RECEIPT) {
                                                current.customers.map { c -> if (c.name.equals(partyName, true)) c.copy(totalCredit = (c.totalCredit - amt).coerceAtLeast(0.0)) else c }
                                            } else current.customers
                                            val updatedSup = if (txType == TransactionType.PAYMENT) {
                                                current.suppliers.map { s -> if (s.name.equals(partyName, true)) s.copy(totalPayable = (s.totalPayable - amt).coerceAtLeast(0.0)) else s }
                                            } else current.suppliers
                                            current.copy(transactions = updatedTx, customers = updatedCust, suppliers = updatedSup)
                                        }
                                    }
                                )
                            }
                            Screen.INVENTORY -> {
                                InventoryScreen(
                                    state = appState,
                                    isUrdu = isUrdu,
                                    onAddItem = { item ->
                                        repository.updateState { it.copy(inventory = it.inventory + item) }
                                    },
                                    onUpdateQty = { id, qty ->
                                        repository.updateState { it.copy(inventory = it.inventory.map { item -> if (item.id == id) item.copy(quantity = qty) else item }) }
                                    },
                                    onDeleteItem = { id ->
                                        repository.updateState { it.copy(inventory = it.inventory.filter { item -> item.id != id }) }
                                    }
                                )
                            }
                            Screen.ASSETS_LOANS -> {
                                AssetsAndLoansScreen(
                                    state = appState,
                                    isUrdu = isUrdu,
                                    onAddBusinessAsset = { ba ->
                                        repository.updateState { it.copy(businessAssets = it.businessAssets + ba) }
                                    },
                                    onAddPersonalAsset = { pa ->
                                        repository.updateState { it.copy(personalAssets = it.personalAssets + pa) }
                                    },
                                    onAddLoan = { loan ->
                                        repository.updateState { it.copy(loans = it.loans + loan) }
                                    },
                                    onDeleteBusinessAsset = { id ->
                                        repository.updateState { it.copy(businessAssets = it.businessAssets.filter { it.id != id }) }
                                    },
                                    onDeleteLoan = { id ->
                                        repository.updateState { it.copy(loans = it.loans.filter { it.id != id }) }
                                    }
                                )
                            }
                            Screen.FBR_TAX -> {
                                FbrTaxScreen(state = appState, isUrdu = isUrdu)
                            }
                            Screen.REPORTS -> {
                                ReportsScreen(state = appState, isUrdu = isUrdu)
                            }
                            Screen.ANALYTICS -> {
                                AnalyticsScreen(state = appState, isUrdu = isUrdu)
                            }
                            Screen.NOTIFICATIONS -> {
                                NotificationsScreen(state = appState, isUrdu = isUrdu)
                            }
                            Screen.BACKUP_SYNC -> {
                                BackupSyncScreen(state = appState, isUrdu = isUrdu)
                            }
                            Screen.SETTINGS -> {
                                SettingsScreen(
                                    state = appState,
                                    isUrdu = isUrdu,
                                    onUpdateProfile = { newProfile ->
                                        repository.updateState { it.copy(profile = newProfile) }
                                    }
                                )
                            }
                        }

                        // Quick Entry Dialog
                        if (isQuickEntryOpen && quickEntryType != null) {
                            QuickEntryDialog(
                                initialType = quickEntryType!!,
                                isOpen = isQuickEntryOpen,
                                onClose = { isQuickEntryOpen = false },
                                onSubmit = { newTx ->
                                    repository.updateState { current ->
                                        val updatedTxList = listOf(newTx) + current.transactions
                                        val updatedAccounts = current.bankAccounts.map { acc ->
                                            if (acc.type == "CASH") {
                                                when (newTx.type) {
                                                    TransactionType.SALE, TransactionType.RECEIPT -> acc.copy(balance = acc.balance + newTx.amount)
                                                    TransactionType.PURCHASE, TransactionType.EXPENSE, TransactionType.PAYMENT -> acc.copy(balance = acc.balance - newTx.amount)
                                                    else -> acc
                                                }
                                            } else acc
                                        }
                                        current.copy(
                                            transactions = updatedTxList,
                                            bankAccounts = updatedAccounts
                                        )
                                    }
                                },
                                isUrdu = isUrdu,
                                state = appState
                            )
                        }

                        // Voice Entry Dialog
                        if (isVoiceEntryOpen) {
                            VoiceEntryDialog(
                                isOpen = isVoiceEntryOpen,
                                onClose = { isVoiceEntryOpen = false },
                                onSubmit = { newTx ->
                                    repository.updateState { current ->
                                        val updatedTxList = listOf(newTx) + current.transactions
                                        current.copy(transactions = updatedTxList)
                                    }
                                },
                                isUrdu = isUrdu
                            )
                        }

                        // Barcode Scanner Dialog
                        if (isBarcodeScannerOpen) {
                            BarcodeScannerDialog(
                                isOpen = isBarcodeScannerOpen,
                                onClose = { isBarcodeScannerOpen = false },
                                inventory = appState.inventory,
                                onItemScanned = { /* Scanned item */ },
                                onManualCodeEntered = { /* Lookup */ },
                                isUrdu = isUrdu
                            )
                        }

                        // Cash & Bank Accounts Dialog
                        if (isCashAccountsOpen) {
                            CashAccountsDialog(
                                isOpen = isCashAccountsOpen,
                                onClose = { isCashAccountsOpen = false },
                                accounts = appState.bankAccounts,
                                onAddAccount = { acc ->
                                    repository.updateState { it.copy(bankAccounts = it.bankAccounts + acc) }
                                },
                                onTransferFunds = { fromId, toId, amt ->
                                    repository.updateState { current ->
                                        val updated = current.bankAccounts.map { acc ->
                                            when (acc.id) {
                                                fromId -> acc.copy(balance = acc.balance - amt)
                                                toId -> acc.copy(balance = acc.balance + amt)
                                                else -> acc
                                            }
                                        }
                                        current.copy(bankAccounts = updated)
                                    }
                                },
                                isUrdu = isUrdu
                            )
                        }

                        // Calendar & Reminders Dialog
                        if (isCalendarOpen) {
                            CalendarRemindersDialog(
                                isOpen = isCalendarOpen,
                                onClose = { isCalendarOpen = false },
                                suppliers = appState.suppliers,
                                loans = appState.loans,
                                isUrdu = isUrdu
                            )
                        }

                        // AI Assistant Dialog
                        if (isAiOpen) {
                            AiAssistantDialog(
                                isOpen = isAiOpen,
                                onClose = { isAiOpen = false },
                                state = appState,
                                isUrdu = isUrdu
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

