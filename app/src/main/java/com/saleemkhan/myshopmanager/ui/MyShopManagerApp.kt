package com.saleemkhan.myshopmanager.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.saleemkhan.myshopmanager.data.AppStateRepository
import com.saleemkhan.myshopmanager.model.*
import com.saleemkhan.myshopmanager.ui.components.AppHeader
import com.saleemkhan.myshopmanager.ui.components.NavigationDrawerContent
import com.saleemkhan.myshopmanager.ui.components.QuickEntryDialog
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
                topBar = {
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
                        onLockApp = {},
                        onOpenScanner = {},
                        onOpenVoiceEntry = {},
                        onOpenCalendar = {},
                        onToggleStoreMode = {
                            val nextMode = if (appState.profile.storeMode == StoreMode.SIMPLE) StoreMode.DETAILED else StoreMode.SIMPLE
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
                                onOpenQuickEntry = { type ->
                                    quickEntryType = type
                                    isQuickEntryOpen = true
                                },
                                onOpenVoiceEntry = {},
                                onNavigateScreen = { screen -> navigateTo(screen) },
                                onOpenCalendar = {},
                                onOpenGraphs = { navigateTo(Screen.ANALYTICS) },
                                onOpenAi = {},
                                onOpenCashAccounts = {}
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
                }
            }
        }
    }
}
