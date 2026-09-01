import React, { useState, useEffect } from 'react';
import { Screen, AppState, Transaction, TransactionType, InventoryItem, CustomerParty, SupplierParty, BusinessAsset, PersonalAsset, HouseholdExpenses, OtherIncome, ShopProfile, StoreMode } from './types';
import { loadAppState, saveAppState, DEFAULT_APP_STATE, sanitizeQuantity } from './utils/format';
import { Header, LeftSidebarNav } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { QuickEntryModal } from './components/QuickEntryModal';
import { VoiceEntryModal } from './components/VoiceEntryModal';
import { TransactionsModule } from './components/TransactionsModule';
import { KhataModule } from './components/KhataModule';
import { InventoryModule } from './components/InventoryModule';
import { AssetsAndLoansModule } from './components/AssetsAndLoansModule';
import { FbrTaxModule } from './components/FbrTaxModule';
import { ReportsModule } from './components/ReportsModule';
import { AnalyticsModule } from './components/AnalyticsModule';
import { SettingsModule } from './components/SettingsModule';
import { BackupSyncModule } from './components/BackupSyncModule';
import { SecurityLock } from './components/SecurityLock';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { CalendarRemindersModal } from './components/CalendarRemindersModal';
import { GraphsModal } from './components/GraphsModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { NotificationsScreen } from './components/NotificationsScreen';
import { CashAccountsModal } from './components/CashAccountsModal';
import { AddInventoryItemModal } from './components/AddInventoryItemModal';
import { SaleInventoryItemModal } from './components/SaleInventoryItemModal';
import { PermissionsSetupModal } from './components/PermissionsSetupModal';

import { useBackHandler } from './hooks/useBackHandler';

export function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [screen, setScreen] = useState<Screen>(Screen.DASHBOARD);
  const [screenHistory, setScreenHistory] = useState<Screen[]>([Screen.DASHBOARD]);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const loaded = loadAppState();
      return Boolean(loaded?.profile?.pinCode || loaded?.profile?.passwordCode);
    } catch {
      return false;
    }
  });
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);
  const [isNavPinned, setIsNavPinned] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigation handlers with stack history & browser history support
  const handleNavigate = (nextScreen: Screen) => {
    if (nextScreen === screen) return;
    setScreen(nextScreen);

    if (nextScreen === Screen.DASHBOARD) {
      setScreenHistory([Screen.DASHBOARD]);
      window.history.pushState({ screen: Screen.DASHBOARD }, '');
    } else {
      // If we are currently not on Dashboard, replace the top of the stack (peer tab behavior)
      if (screen !== Screen.DASHBOARD) {
        setScreenHistory([Screen.DASHBOARD, nextScreen]);
        window.history.replaceState({ screen: nextScreen }, '');
      } else {
        setScreenHistory([Screen.DASHBOARD, nextScreen]);
        window.history.pushState({ screen: nextScreen }, '');
      }
    }
  };

  const handleBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop(); // remove current screen
      const prevScreen = newHistory[newHistory.length - 1] || Screen.DASHBOARD;
      setScreenHistory(newHistory);
      setScreen(prevScreen);
      // Synchronize browser/hardware back stack
      window.history.back();
    } else {
      setScreen(Screen.DASHBOARD);
      setScreenHistory([Screen.DASHBOARD]);
    }
  };

  // Ensure initial history state is set correctly on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.history.state) {
      window.history.replaceState({ screen: Screen.DASHBOARD }, '');
    }
  }, []);

  // Browser/Hardware Back Button Listener
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        const targetScreen = e.state.screen;
        setScreen(targetScreen);
        setScreenHistory((prev) => {
          const idx = prev.lastIndexOf(targetScreen);
          if (idx !== -1) {
            return prev.slice(0, idx + 1);
          }
          return [...prev, targetScreen];
        });
      } else {
        setScreen(Screen.DASHBOARD);
        setScreenHistory([Screen.DASHBOARD]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Modals
  const [quickEntryType, setQuickEntryType] = useState<TransactionType | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [prefilledInventoryItem, setPrefilledInventoryItem] = useState<InventoryItem | null>(null);
  const [isVoiceEntryOpen, setIsVoiceEntryOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerContext, setScannerContext] = useState<'SALE' | 'PURCHASE' | 'API_URL' | null>(null);
  const [pendingScannedBarcode, setPendingScannedBarcode] = useState<string | null>(null);
  const [autoOpenInventoryAdd, setAutoOpenInventoryAdd] = useState<boolean>(false);
  const [isAddInventoryItemModalOpen, setIsAddInventoryItemModalOpen] = useState<boolean>(false);
  const [addModalPrefilledBarcode, setAddModalPrefilledBarcode] = useState<string | null>(null);
  const [purchaseModalPrefilledItem, setPurchaseModalPrefilledItem] = useState<InventoryItem | null>(null);
  const [addModalInitialMode, setAddModalInitialMode] = useState<'ADD' | 'PURCHASE'>('ADD');

  // Sale Inventory Modal state
  const [isSaleInventoryModalOpen, setIsSaleInventoryModalOpen] = useState<boolean>(false);
  const [saleModalPrefilledItem, setSaleModalPrefilledItem] = useState<InventoryItem | null>(null);

  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isGraphsOpen, setIsGraphsOpen] = useState<boolean>(false);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [isCashAccountsOpen, setIsCashAccountsOpen] = useState<boolean>(false);
  const [isPermissionsSetupOpen, setIsPermissionsSetupOpen] = useState<boolean>(false);

  // Centralized Back Navigation registers for all global overlays and modals
  useBackHandler(isPermissionsSetupOpen, () => setIsPermissionsSetupOpen(false), 'PermissionsSetup');
  useBackHandler(Boolean(quickEntryType), () => {
    setQuickEntryType(null);
    setPrefilledInventoryItem(null);
  }, 'QuickEntry');

  useBackHandler(Boolean(editingTransaction), () => {
    setEditingTransaction(null);
  }, 'EditingTransaction');

  useBackHandler(isVoiceEntryOpen, () => setIsVoiceEntryOpen(false), 'VoiceEntry');
  useBackHandler(isScannerOpen, () => {
    setIsScannerOpen(false);
    setScannerContext(null);
  }, 'BarcodeScanner');

  useBackHandler(isSaleInventoryModalOpen, () => {
    setIsSaleInventoryModalOpen(false);
    setSaleModalPrefilledItem(null);
  }, 'SaleInventory');

  useBackHandler(isCalendarOpen, () => setIsCalendarOpen(false), 'Calendar');
  useBackHandler(isGraphsOpen, () => setIsGraphsOpen(false), 'Graphs');
  useBackHandler(isAiOpen, () => setIsAiOpen(false), 'AiAssistant');
  useBackHandler(isCashAccountsOpen, () => setIsCashAccountsOpen(false), 'CashAccounts');
  useBackHandler(isAddInventoryItemModalOpen, () => {
    setIsAddInventoryItemModalOpen(false);
    setPurchaseModalPrefilledItem(null);
    setAddModalPrefilledBarcode(null);
    setAddModalInitialMode('ADD');
  }, 'AddInventoryItem');

  useEffect(() => {
    // Global OAuth token handler for Web and Android Deep Link callbacks
    if (typeof window !== 'undefined') {
      const handleToken = (token: string) => {
        if (!token) return;
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((info) => {
            if (info?.email) {
              const stored = localStorage.getItem('myshop_sync_config');
              const cfg = stored ? JSON.parse(stored) : {};
              cfg.connectedGoogleAccount = {
                email: info.email,
                name: info.name || '',
                photoUrl: info.picture || '',
                connectedAt: new Date().toISOString(),
                accessToken: token,
              };
              localStorage.setItem('myshop_sync_config', JSON.stringify(cfg));
            }
          })
          .catch((err) => console.warn('OAuth userinfo fetch error:', err));
      };

      (window as any).onNativeOAuthToken = (token: string) => handleToken(token);

      try {
        const hash = window.location.hash || '';
        if (hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          const token = params.get('access_token');
          if (token) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            handleToken(token);
          }
        }
      } catch (e) {
        console.warn('OAuth token parse error:', e);
      }
    }
  }, []);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const isUrdu = state.profile.activeLanguage === 'ur';

  const handleToggleUrdu = () => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        activeLanguage: prev.profile.activeLanguage === 'ur' ? 'en' : 'ur',
      },
    }));
  };

  // Add Transaction
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx_${Date.now()}`,
    };

    // 1. Loan repayment balance check
    if (tx.type === 'PAYMENT' && tx.category === 'LOAN_REPAYMENT') {
      const loanAccountId = tx.loanAccountId;
      if (loanAccountId) {
        const loan = state.loans.find(l => l.id === loanAccountId);
        if (loan) {
          const initialAmount = loan.amount;
          const takenAmount = state.transactions
            .filter(t => t.type === 'LOAN_TAKEN' && t.loanAccountId === loanAccountId)
            .reduce((sum, t) => sum + t.amount, 0);
          const repaidAmount = state.transactions
            .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.loanAccountId === loanAccountId)
            .reduce((sum, t) => sum + t.amount, 0);
          const outstanding = initialAmount + takenAmount - repaidAmount;
          if (tx.amount > outstanding) {
            alert(`Error: Repayment of Rs. ${tx.amount.toLocaleString()} exceeds the outstanding balance of Rs. ${outstanding.toLocaleString()} for this loan account.`);
            return;
          }
        }
      } else {
        const lender = tx.partyName;
        if (lender) {
          const opLoan = state.loans.find(l => l.lenderOrBorrower.toLowerCase() === lender.toLowerCase());
          const opAmount = opLoan ? opLoan.amount : 0;
          const takenAmount = state.transactions
            .filter(t => t.type === 'LOAN_TAKEN' && t.partyName?.toLowerCase() === lender.toLowerCase())
            .reduce((sum, t) => sum + t.amount, 0);
          const repaidAmount = state.transactions
            .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.partyName?.toLowerCase() === lender.toLowerCase())
            .reduce((sum, t) => sum + t.amount, 0);
          const outstanding = opAmount + takenAmount - repaidAmount;
          if (tx.amount > outstanding) {
            alert(`Error: Repayment of Rs. ${tx.amount.toLocaleString()} exceeds the outstanding balance of Rs. ${outstanding.toLocaleString()} for ${lender}.`);
            return;
          }
        } else {
          const baseLoans = state.loans.reduce((sum, l) => sum + l.amount, 0);
          const txLoansTaken = state.transactions.filter(t => t.type === 'LOAN_TAKEN').reduce((sum, t) => sum + t.amount, 0);
          const txLoansRepaid = state.transactions.filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT').reduce((sum, t) => sum + t.amount, 0);
          const totalOutstanding = baseLoans + txLoansTaken - txLoansRepaid;
          if (tx.amount > totalOutstanding) {
            alert(`Error: Repayment of Rs. ${tx.amount.toLocaleString()} exceeds the total outstanding loan balance of Rs. ${totalOutstanding.toLocaleString()}.`);
            return;
          }
        }
      }
    }

    // 2. Sale quantity check (Negative Stock Blocker)
    if (tx.type === 'SALE') {
      const isBarcodeSale = tx.notes?.startsWith('Barcode Sale:');
      if (isBarcodeSale) {
        const itemMatch = state.inventory.find(item => tx.notes?.includes(item.name));
        if (itemMatch) {
          const qtyMatch = tx.notes?.match(/\((\d+)\s+\w+\)/);
          const qtyToReduce = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          if (itemMatch.quantity < qtyToReduce) {
            alert(`Error: Cannot complete sale. Item "${itemMatch.name}" has only ${itemMatch.quantity} units in stock, but this sale requires ${qtyToReduce} units.`);
            return;
          }
        }
      } else {
        const mentionedItems = state.inventory.filter(item => 
          (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          tx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = tx.amount / mentionedItems.length;
          const insufficientStockItem = mentionedItems.find(item => {
            const qtyToReduce = item.salePrice > 0 ? (amountPerItem / item.salePrice) : 0;
            return item.quantity < qtyToReduce;
          });

          if (insufficientStockItem) {
            const qtyToReduce = insufficientStockItem.salePrice > 0 ? (amountPerItem / insufficientStockItem.salePrice) : 0;
            alert(`Error: Cannot complete sale. Item "${insufficientStockItem.name}" has only ${insufficientStockItem.quantity} units in stock, but this sale requires ${qtyToReduce.toFixed(1)} units.`);
            return;
          }
        }
      }
    }

    setState((prev) => {
      let updatedCustomers = [...prev.customers];
      let updatedSuppliers = [...prev.suppliers];
      let updatedBankAccounts = [...prev.bankAccounts];
      let updatedInventory = [...prev.inventory];

      // Automatically update customer udhaar or supplier payable if party specified
      if (tx.partyName) {
        if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit += tx.amount;
            updatedCustomers[custIdx].lastTransactionDate = tx.date;
          } else {
            updatedCustomers.push({
              id: `cust_${Date.now()}`,
              name: tx.partyName,
              phone: '03000000000',
              totalCredit: tx.amount,
              lastTransactionDate: tx.date,
            });
          }
        } else if (tx.type === 'RECEIPT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit = Math.max(0, updatedCustomers[custIdx].totalCredit - tx.amount);
            updatedCustomers[custIdx].lastTransactionDate = tx.date;
          }
        } else if (tx.type === 'PURCHASE' && tx.paymentMethod === 'CREDIT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable += tx.amount;
          } else {
            updatedSuppliers.push({
              id: `sup_${Date.now()}`,
              name: tx.partyName,
              phone: '03000000000',
              totalPayable: tx.amount,
            });
          }
        } else if (tx.type === 'PAYMENT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable = Math.max(0, updatedSuppliers[supIdx].totalPayable - tx.amount);
          }
        }
      }

      // Update bank account balance dynamically
      if (tx.paymentMethod !== 'CREDIT') {
        const isIncoming = tx.type === 'SALE' || tx.type === 'RECEIPT' || tx.type === 'LOAN_TAKEN';
        const isOutgoing = tx.type === 'PURCHASE' || tx.type === 'EXPENSE' || tx.type === 'PAYMENT' || tx.type === 'LOAN_GIVEN';

        let accountType: 'CASH' | 'BANK' | 'WALLET' = 'CASH';
        if (tx.paymentMethod === 'BANK') {
          accountType = 'BANK';
        } else if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(tx.paymentMethod)) {
          accountType = 'WALLET';
        }

        const accIdx = updatedBankAccounts.findIndex((a) => {
          if (tx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (tx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === tx.paymentMethod.toUpperCase();
        }) !== -1 ? updatedBankAccounts.findIndex((a) => {
          if (tx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (tx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === tx.paymentMethod.toUpperCase();
        }) : updatedBankAccounts.findIndex((a) => a.type === accountType);

        if (accIdx >= 0) {
          if (isIncoming) {
            updatedBankAccounts[accIdx] = {
              ...updatedBankAccounts[accIdx],
              balance: updatedBankAccounts[accIdx].balance + tx.amount,
            };
          } else if (isOutgoing) {
            updatedBankAccounts[accIdx] = {
              ...updatedBankAccounts[accIdx],
              balance: Math.max(0, updatedBankAccounts[accIdx].balance - tx.amount),
            };
          }
        }
      }

      // Update linked inventory quantity and cost/value if adding an inventory purchase
      if (tx.type === 'PURCHASE') {
        const isBarcodePurchase = tx.notes?.startsWith('Barcode Purchase:');
        if (isBarcodePurchase) {
          const itemMatch = updatedInventory.find(item => tx.notes?.includes(item.name));
          if (itemMatch) {
            const qtyMatch = tx.notes?.match(/\((\d+)\s+\w+\)/);
            const qtyToAdd = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            updatedInventory = updatedInventory.map(item => {
              if (item.id === itemMatch.id) {
                return {
                  ...item,
                  quantity: item.quantity + qtyToAdd,
                  purchasedQty: item.purchasedQty + qtyToAdd
                };
              }
              return item;
            });
          }
        } else {
          const mentionedItems = updatedInventory.filter(item => 
            (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
            tx.category?.toLowerCase() === item.category.toLowerCase()
          );

          if (mentionedItems.length > 0) {
            const amountPerItem = tx.amount / mentionedItems.length;
            updatedInventory = updatedInventory.map(item => {
              if (mentionedItems.some(mi => mi.id === item.id)) {
                const qtyToAdd = sanitizeQuantity(item.purchasePrice > 0 ? (amountPerItem / item.purchasePrice) : 0, item.unit);
                return {
                  ...item,
                  quantity: item.quantity + qtyToAdd,
                  purchasedQty: item.purchasedQty + qtyToAdd
                };
              }
              return item;
            });
          } else {
            // Distribute inventory addition proportionally based on stock value
            const currentTotalValue = updatedInventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
            if (currentTotalValue > 0) {
              updatedInventory = updatedInventory.map(item => {
                const itemValue = item.quantity * item.purchasePrice;
                const valueAddition = (itemValue / currentTotalValue) * tx.amount;
                const qtyAddition = sanitizeQuantity(item.purchasePrice > 0 ? (valueAddition / item.purchasePrice) : 0, item.unit);
                return {
                  ...item,
                  quantity: item.quantity + qtyAddition,
                  purchasedQty: item.purchasedQty + qtyAddition
                };
              });
            }
          }
        }
      } else if (tx.type === 'SALE') {
        const isBarcodeSale = tx.notes?.startsWith('Barcode Sale:');
        if (isBarcodeSale) {
          const itemMatch = updatedInventory.find(item => tx.notes?.includes(item.name));
          if (itemMatch) {
            const qtyMatch = tx.notes?.match(/\((\d+)\s+\w+\)/);
            const qtyToReduce = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
            updatedInventory = updatedInventory.map(item => {
              if (item.id === itemMatch.id) {
                return {
                  ...item,
                  quantity: Math.max(0, item.quantity - qtyToReduce),
                  soldQty: item.soldQty + qtyToReduce
                };
              }
              return item;
            });
          }
        } else {
          const mentionedItems = updatedInventory.filter(item => 
            (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
            tx.category?.toLowerCase() === item.category.toLowerCase()
          );

          if (mentionedItems.length > 0) {
            const amountPerItem = tx.amount / mentionedItems.length;
            updatedInventory = updatedInventory.map(item => {
              if (mentionedItems.some(mi => mi.id === item.id)) {
                const qtyToReduce = sanitizeQuantity(item.salePrice > 0 ? (amountPerItem / item.salePrice) : 0, item.unit);
                return {
                  ...item,
                  quantity: Math.max(0, item.quantity - qtyToReduce)
                };
              }
              return item;
            });
          }
        }
      }

      return {
        ...prev,
        transactions: [tx, ...prev.transactions],
        customers: updatedCustomers,
        suppliers: updatedSuppliers,
        bankAccounts: updatedBankAccounts,
        inventory: updatedInventory,
      };
    });
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;

    // Block deletion of a purchase if it would result in negative stock for any item
    if (tx.type === 'PURCHASE') {
      const mentionedItems = state.inventory.filter(item => 
        (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
        tx.category?.toLowerCase() === item.category.toLowerCase()
      );

      if (mentionedItems.length > 0) {
        const amountPerItem = tx.amount / mentionedItems.length;
        const insufficientStockItem = mentionedItems.find(item => {
          const qtyToReduce = item.purchasePrice > 0 ? (amountPerItem / item.purchasePrice) : 0;
          return item.quantity < qtyToReduce;
        });

        if (insufficientStockItem) {
          const qtyToReduce = insufficientStockItem.purchasePrice > 0 ? (amountPerItem / insufficientStockItem.purchasePrice) : 0;
          alert(`Error: Cannot delete purchase. Doing so would reduce stock of "${insufficientStockItem.name}" by ${qtyToReduce.toFixed(1)} units, but only ${insufficientStockItem.quantity} units are currently in stock. Please reverse sales first or log a stock adjustment.`);
          return;
        }
      } else {
        const currentTotalValue = state.inventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
        if (currentTotalValue > 0) {
          const insufficientStockItem = state.inventory.find(item => {
            const itemValue = item.quantity * item.purchasePrice;
            const valueReduction = (itemValue / currentTotalValue) * tx.amount;
            const qtyReduction = item.purchasePrice > 0 ? (valueReduction / item.purchasePrice) : 0;
            return item.quantity < qtyReduction;
          });

          if (insufficientStockItem) {
            const itemValue = insufficientStockItem.quantity * insufficientStockItem.purchasePrice;
            const valueReduction = (itemValue / currentTotalValue) * tx.amount;
            const qtyReduction = insufficientStockItem.purchasePrice > 0 ? (valueReduction / insufficientStockItem.purchasePrice) : 0;
            alert(`Error: Cannot delete purchase. Doing so would reduce stock of "${insufficientStockItem.name}" by ${qtyReduction.toFixed(1)} units, but only ${insufficientStockItem.quantity} units are currently in stock. Please reverse sales first or log a stock adjustment.`);
            return;
          }
        }
      }
    }

    setState((prev) => {
      let updatedCustomers = [...prev.customers];
      let updatedSuppliers = [...prev.suppliers];
      let updatedBankAccounts = [...prev.bankAccounts];

      // Revert customer credit or supplier payable
      if (tx.partyName) {
        if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit = Math.max(0, updatedCustomers[custIdx].totalCredit - tx.amount);
          }
        } else if (tx.type === 'RECEIPT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit += tx.amount;
          }
        } else if (tx.type === 'PURCHASE' && tx.paymentMethod === 'CREDIT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable = Math.max(0, updatedSuppliers[supIdx].totalPayable - tx.amount);
          }
        } else if (tx.type === 'PAYMENT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable += tx.amount;
          }
        }
      }

      // Revert bank account balance
      if (tx.paymentMethod !== 'CREDIT') {
        const isIncoming = tx.type === 'SALE' || tx.type === 'RECEIPT' || tx.type === 'LOAN_TAKEN';
        const isOutgoing = tx.type === 'PURCHASE' || tx.type === 'EXPENSE' || tx.type === 'PAYMENT' || tx.type === 'LOAN_GIVEN';

        let accountType: 'CASH' | 'BANK' | 'WALLET' = 'CASH';
        if (tx.paymentMethod === 'BANK') {
          accountType = 'BANK';
        } else if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(tx.paymentMethod)) {
          accountType = 'WALLET';
        }

        const accIdx = updatedBankAccounts.findIndex((a) => {
          if (tx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (tx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === tx.paymentMethod.toUpperCase();
        }) !== -1 ? updatedBankAccounts.findIndex((a) => {
          if (tx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (tx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === tx.paymentMethod.toUpperCase();
        }) : updatedBankAccounts.findIndex((a) => a.type === accountType);

        if (accIdx >= 0) {
          if (isIncoming) {
            updatedBankAccounts[accIdx] = {
              ...updatedBankAccounts[accIdx],
              balance: Math.max(0, updatedBankAccounts[accIdx].balance - tx.amount),
            };
          } else if (isOutgoing) {
            updatedBankAccounts[accIdx] = {
              ...updatedBankAccounts[accIdx],
              balance: updatedBankAccounts[accIdx].balance + tx.amount,
            };
          }
        }
      }

      // Reverse linked inventory quantity and cost/value if deleting an inventory purchase or sale
      let updatedInventory = [...prev.inventory];
      if (tx.category === 'STOCK_ADJUSTMENT') {
        const { itemId, qtyChange } = tx;
        if (itemId && qtyChange !== undefined) {
          updatedInventory = updatedInventory.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                quantity: item.quantity - qtyChange
              };
            }
            return item;
          });
        }
      } else if (tx.type === 'PURCHASE') {
        const mentionedItems = updatedInventory.filter(item => 
          (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          tx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = tx.amount / mentionedItems.length;
          updatedInventory = updatedInventory.map(item => {
            if (mentionedItems.some(mi => mi.id === item.id)) {
              const qtyToReduce = sanitizeQuantity(item.purchasePrice > 0 ? (amountPerItem / item.purchasePrice) : 0, item.unit);
              return {
                ...item,
                quantity: item.quantity - qtyToReduce,
                purchasedQty: Math.max(0, item.purchasedQty - qtyToReduce)
              };
            }
            return item;
          });
        } else {
          // Distribute inventory reduction proportionally based on stock value
          const currentTotalValue = updatedInventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
          if (currentTotalValue > 0) {
            updatedInventory = updatedInventory.map(item => {
              const itemValue = item.quantity * item.purchasePrice;
              const valueReduction = (itemValue / currentTotalValue) * tx.amount;
              const qtyReduction = sanitizeQuantity(item.purchasePrice > 0 ? (valueReduction / item.purchasePrice) : 0, item.unit);
              return {
                ...item,
                quantity: item.quantity - qtyReduction,
                purchasedQty: Math.max(0, item.purchasedQty - qtyReduction)
              };
            });
          }
        }
      } else if (tx.type === 'SALE' && !tx.notes?.startsWith('Barcode Sale:')) {
        const mentionedItems = updatedInventory.filter(item => 
          (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          tx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = tx.amount / mentionedItems.length;
          updatedInventory = updatedInventory.map(item => {
            if (mentionedItems.some(mi => mi.id === item.id)) {
              const qtyToRestore = sanitizeQuantity(item.salePrice > 0 ? (amountPerItem / item.salePrice) : 0, item.unit);
              return {
                ...item,
                quantity: item.quantity + qtyToRestore
              };
            }
            return item;
          });
        }
      } else if (tx.type === 'SALE' && tx.notes?.startsWith('Barcode Sale:')) {
        const itemMatch = updatedInventory.find(item => tx.notes?.includes(item.name));
        if (itemMatch) {
          const qtyMatch = tx.notes.match(/\((\d+)\s+\w+\)/);
          const qtyToRestore = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          updatedInventory = updatedInventory.map(item => {
            if (item.id === itemMatch.id) {
              return {
                ...item,
                quantity: item.quantity + qtyToRestore
              };
            }
            return item;
          });
        }
      }

      const nextTransactions = prev.transactions.filter((t) => t.id !== id);
      const finalBankAccounts = nextTransactions.length === 0
        ? updatedBankAccounts.map((a) => ({ ...a, balance: 0 }))
        : updatedBankAccounts;

      const nextDeletedTransactions = [tx, ...(prev.deletedTransactions || [])];

      return {
        ...prev,
        transactions: nextTransactions,
        deletedTransactions: nextDeletedTransactions,
        customers: updatedCustomers,
        suppliers: updatedSuppliers,
        bankAccounts: finalBankAccounts,
        inventory: updatedInventory,
      };
    });
  };

  const handleRestoreTransaction = (id: string) => {
    setState((prev) => {
      const deletedList = prev.deletedTransactions || [];
      const tx = deletedList.find((t) => t.id === id);
      if (!tx) return prev;

      let updatedCustomers = [...prev.customers];
      let updatedSuppliers = [...prev.suppliers];
      let updatedBankAccounts = [...prev.bankAccounts];
      let updatedInventory = [...prev.inventory];

      // Re-apply customer credit or supplier payable
      if (tx.partyName) {
        if (tx.type === 'SALE' && tx.paymentMethod === 'CREDIT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit += tx.amount;
          }
        } else if (tx.type === 'RECEIPT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit = Math.max(0, updatedCustomers[custIdx].totalCredit - tx.amount);
          }
        } else if (tx.type === 'PURCHASE' && tx.paymentMethod === 'CREDIT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable += tx.amount;
          }
        } else if (tx.type === 'PAYMENT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === tx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable = Math.max(0, updatedSuppliers[supIdx].totalPayable - tx.amount);
          }
        }
      }

      // Re-apply bank account balance
      if (tx.paymentMethod !== 'CREDIT') {
        const isIncoming = tx.type === 'SALE' || tx.type === 'RECEIPT' || tx.type === 'LOAN_TAKEN';
        const isOutgoing = tx.type === 'PURCHASE' || tx.type === 'EXPENSE' || tx.type === 'PAYMENT' || tx.type === 'LOAN_GIVEN';

        let accountType: 'CASH' | 'BANK' | 'WALLET' = 'CASH';
        if (tx.paymentMethod === 'BANK') {
          accountType = 'BANK';
        } else if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(tx.paymentMethod)) {
          accountType = 'WALLET';
        }

        const accIdx = updatedBankAccounts.findIndex((a) => {
          if (tx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (tx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === tx.paymentMethod.toUpperCase();
        }) !== -1 ? updatedBankAccounts.findIndex((a) => {
          if (tx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (tx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === tx.paymentMethod.toUpperCase();
        }) : updatedBankAccounts.findIndex((a) => a.type === accountType);

        if (accIdx >= 0) {
          if (isIncoming) {
            updatedBankAccounts[accIdx] = {
              ...updatedBankAccounts[accIdx],
              balance: updatedBankAccounts[accIdx].balance + tx.amount,
            };
          } else if (isOutgoing) {
            updatedBankAccounts[accIdx] = {
              ...updatedBankAccounts[accIdx],
              balance: Math.max(0, updatedBankAccounts[accIdx].balance - tx.amount),
            };
          }
        }
      }

      // Re-apply linked inventory
      if (tx.category === 'STOCK_ADJUSTMENT') {
        const { itemId, qtyChange } = tx;
        if (itemId && qtyChange !== undefined) {
          updatedInventory = updatedInventory.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                quantity: item.quantity + qtyChange
              };
            }
            return item;
          });
        }
      } else if (tx.type === 'PURCHASE') {
        const mentionedItems = updatedInventory.filter(item => 
          (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          tx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = tx.amount / mentionedItems.length;
          updatedInventory = updatedInventory.map(item => {
            if (mentionedItems.some(mi => mi.id === item.id)) {
              const qtyToAdd = item.purchasePrice > 0 ? (amountPerItem / item.purchasePrice) : 0;
              return {
                ...item,
                quantity: item.quantity + qtyToAdd,
                purchasedQty: item.purchasedQty + qtyToAdd
              };
            }
            return item;
          });
        }
      } else if (tx.type === 'SALE' && !tx.notes?.startsWith('Barcode Sale:')) {
        const mentionedItems = updatedInventory.filter(item => 
          (tx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          tx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = tx.amount / mentionedItems.length;
          updatedInventory = updatedInventory.map(item => {
            if (mentionedItems.some(mi => mi.id === item.id)) {
              const qtyToSubtract = item.salePrice > 0 ? (amountPerItem / item.salePrice) : 0;
              return {
                ...item,
                quantity: Math.max(0, item.quantity - qtyToSubtract)
              };
            }
            return item;
          });
        }
      } else if (tx.type === 'SALE' && tx.notes?.startsWith('Barcode Sale:')) {
        const itemMatch = updatedInventory.find(item => tx.notes?.includes(item.name));
        if (itemMatch) {
          const qtyMatch = tx.notes.match(/\((\d+)\s+\w+\)/);
          const qtyToSubtract = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          updatedInventory = updatedInventory.map(item => {
            if (item.id === itemMatch.id) {
              return {
                ...item,
                quantity: Math.max(0, item.quantity - qtyToSubtract)
              };
            }
            return item;
          });
        }
      }

      return {
        ...prev,
        transactions: [tx, ...prev.transactions],
        deletedTransactions: deletedList.filter((t) => t.id !== id),
        customers: updatedCustomers,
        suppliers: updatedSuppliers,
        bankAccounts: updatedBankAccounts,
        inventory: updatedInventory,
      };
    });
  };

  const handleEmptyTrash = (partyName?: string) => {
    setState((prev) => {
      const deletedList = prev.deletedTransactions || [];
      const nextDeleted = partyName
        ? deletedList.filter((t) => t.partyName?.toLowerCase() !== partyName.toLowerCase())
        : [];
      return {
        ...prev,
        deletedTransactions: nextDeleted,
      };
    });
  };

  const handleUpdateTransaction = (id: string, updated: Partial<Transaction>) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  };

  const handleUpdateEditedTransaction = (id: string, newTxData: Omit<Transaction, 'id'>) => {
    const oldTx = state.transactions.find((t) => t.id === id);
    if (!oldTx) return;

    setState((prev) => {
      let updatedCustomers = prev.customers.map(c => ({ ...c }));
      let updatedSuppliers = prev.suppliers.map(s => ({ ...s }));
      let updatedBankAccounts = prev.bankAccounts.map(b => ({ ...b }));
      let updatedInventory = prev.inventory.map(i => ({ ...i }));

      // 1. REVERT old transaction's impact
      if (oldTx.partyName) {
        if (oldTx.type === 'SALE' && oldTx.paymentMethod === 'CREDIT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === oldTx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit = Math.max(0, updatedCustomers[custIdx].totalCredit - oldTx.amount);
          }
        } else if (oldTx.type === 'RECEIPT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === oldTx.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit += oldTx.amount;
          }
        } else if (oldTx.type === 'PURCHASE' && oldTx.paymentMethod === 'CREDIT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === oldTx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable = Math.max(0, updatedSuppliers[supIdx].totalPayable - oldTx.amount);
          }
        } else if (oldTx.type === 'PAYMENT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === oldTx.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable += oldTx.amount;
          }
        }
      }

      if (oldTx.paymentMethod !== 'CREDIT') {
        const isIncoming = oldTx.type === 'SALE' || oldTx.type === 'RECEIPT' || oldTx.type === 'LOAN_TAKEN';
        const isOutgoing = oldTx.type === 'PURCHASE' || oldTx.type === 'EXPENSE' || oldTx.type === 'PAYMENT' || oldTx.type === 'LOAN_GIVEN';

        let accountType: 'CASH' | 'BANK' | 'WALLET' = 'CASH';
        if (oldTx.paymentMethod === 'BANK') {
          accountType = 'BANK';
        } else if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(oldTx.paymentMethod)) {
          accountType = 'WALLET';
        }

        const accIdx = updatedBankAccounts.findIndex((a) => {
          if (oldTx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (oldTx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === oldTx.paymentMethod.toUpperCase();
        }) !== -1 ? updatedBankAccounts.findIndex((a) => {
          if (oldTx.paymentMethod === 'CASH') return a.type === 'CASH';
          if (oldTx.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === oldTx.paymentMethod.toUpperCase();
        }) : updatedBankAccounts.findIndex((a) => a.type === accountType);

        if (accIdx >= 0) {
          if (isIncoming) {
            updatedBankAccounts[accIdx].balance = Math.max(0, updatedBankAccounts[accIdx].balance - oldTx.amount);
          } else if (isOutgoing) {
            updatedBankAccounts[accIdx].balance += oldTx.amount;
          }
        }
      }

      if (oldTx.category === 'STOCK_ADJUSTMENT') {
        const itemIdx = updatedInventory.findIndex((i) => i.id === oldTx.itemId);
        if (itemIdx >= 0 && oldTx.qtyChange) {
          updatedInventory[itemIdx].quantity = Math.max(0, updatedInventory[itemIdx].quantity - oldTx.qtyChange);
        }
      } else if (oldTx.type === 'PURCHASE') {
        const mentionedItems = updatedInventory.filter(item => 
          (oldTx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          oldTx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = oldTx.amount / mentionedItems.length;
          mentionedItems.forEach((item) => {
            const itemIdx = updatedInventory.findIndex((i) => i.id === item.id);
            if (itemIdx >= 0) {
              const qtyToReduce = item.purchasePrice > 0 ? (amountPerItem / item.purchasePrice) : 0;
              updatedInventory[itemIdx].quantity = Math.max(0, updatedInventory[itemIdx].quantity - qtyToReduce);
            }
          });
        }
      } else if (oldTx.type === 'SALE' && !oldTx.notes?.startsWith('Barcode Sale:')) {
        const mentionedItems = updatedInventory.filter(item => 
          (oldTx.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          oldTx.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = oldTx.amount / mentionedItems.length;
          mentionedItems.forEach((item) => {
            const itemIdx = updatedInventory.findIndex((i) => i.id === item.id);
            if (itemIdx >= 0) {
              const qtyToAdd = item.salePrice > 0 ? (amountPerItem / item.salePrice) : 0;
              updatedInventory[itemIdx].quantity = updatedInventory[itemIdx].quantity + qtyToAdd;
            }
          });
        }
      } else if (oldTx.type === 'SALE' && oldTx.notes?.startsWith('Barcode Sale:')) {
        const mentionedItems = updatedInventory.filter(item => 
          (oldTx.notes || '').toLowerCase().includes(item.name.toLowerCase())
        );
        if (mentionedItems.length > 0) {
          mentionedItems.forEach((item) => {
            const itemIdx = updatedInventory.findIndex((i) => i.id === item.id);
            if (itemIdx >= 0) {
              const qtyMatch = oldTx.notes?.match(/\((\d+)\s/);
              const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
              updatedInventory[itemIdx].quantity = updatedInventory[itemIdx].quantity + qty;
            }
          });
        }
      }

      // 2. APPLY new transaction's impact
      if (newTxData.partyName) {
        if (newTxData.type === 'SALE' && newTxData.paymentMethod === 'CREDIT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === newTxData.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit += newTxData.amount;
          }
        } else if (newTxData.type === 'RECEIPT') {
          const custIdx = updatedCustomers.findIndex((c) => c.name.toLowerCase() === newTxData.partyName?.toLowerCase());
          if (custIdx >= 0) {
            updatedCustomers[custIdx].totalCredit = Math.max(0, updatedCustomers[custIdx].totalCredit - newTxData.amount);
          }
        } else if (newTxData.type === 'PURCHASE' && newTxData.paymentMethod === 'CREDIT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === newTxData.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable += newTxData.amount;
          }
        } else if (newTxData.type === 'PAYMENT') {
          const supIdx = updatedSuppliers.findIndex((s) => s.name.toLowerCase() === newTxData.partyName?.toLowerCase());
          if (supIdx >= 0) {
            updatedSuppliers[supIdx].totalPayable = Math.max(0, updatedSuppliers[supIdx].totalPayable - newTxData.amount);
          }
        }
      }

      if (newTxData.paymentMethod !== 'CREDIT') {
        const isIncoming = newTxData.type === 'SALE' || newTxData.type === 'RECEIPT' || newTxData.type === 'LOAN_TAKEN';
        const isOutgoing = newTxData.type === 'PURCHASE' || newTxData.type === 'EXPENSE' || newTxData.type === 'PAYMENT' || newTxData.type === 'LOAN_GIVEN';

        let accountType: 'CASH' | 'BANK' | 'WALLET' = 'CASH';
        if (newTxData.paymentMethod === 'BANK') {
          accountType = 'BANK';
        } else if (['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(newTxData.paymentMethod)) {
          accountType = 'WALLET';
        }

        const accIdx = updatedBankAccounts.findIndex((a) => {
          if (newTxData.paymentMethod === 'CASH') return a.type === 'CASH';
          if (newTxData.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === newTxData.paymentMethod.toUpperCase();
        }) !== -1 ? updatedBankAccounts.findIndex((a) => {
          if (newTxData.paymentMethod === 'CASH') return a.type === 'CASH';
          if (newTxData.paymentMethod === 'BANK') return a.type === 'BANK';
          return a.type === 'WALLET' && a.bankName.toUpperCase() === newTxData.paymentMethod.toUpperCase();
        }) : updatedBankAccounts.findIndex((a) => a.type === accountType);

        if (accIdx >= 0) {
          if (isIncoming) {
            updatedBankAccounts[accIdx].balance += newTxData.amount;
          } else if (isOutgoing) {
            updatedBankAccounts[accIdx].balance = Math.max(0, updatedBankAccounts[accIdx].balance - newTxData.amount);
          }
        }
      }

      if (newTxData.category === 'STOCK_ADJUSTMENT') {
        const itemIdx = updatedInventory.findIndex((i) => i.id === newTxData.itemId);
        if (itemIdx >= 0 && newTxData.qtyChange) {
          updatedInventory[itemIdx].quantity = Math.max(0, updatedInventory[itemIdx].quantity + newTxData.qtyChange);
        }
      } else if (newTxData.type === 'PURCHASE') {
        const mentionedItems = updatedInventory.filter(item => 
          (newTxData.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          newTxData.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = newTxData.amount / mentionedItems.length;
          mentionedItems.forEach((item) => {
            const itemIdx = updatedInventory.findIndex((i) => i.id === item.id);
            if (itemIdx >= 0) {
              const qtyToAdd = item.purchasePrice > 0 ? (amountPerItem / item.purchasePrice) : 0;
              updatedInventory[itemIdx].quantity += qtyToAdd;
            }
          });
        }
      } else if (newTxData.type === 'SALE' && !newTxData.notes?.startsWith('Barcode Sale:')) {
        const mentionedItems = updatedInventory.filter(item => 
          (newTxData.notes || '').toLowerCase().includes(item.name.toLowerCase()) ||
          newTxData.category?.toLowerCase() === item.category.toLowerCase()
        );

        if (mentionedItems.length > 0) {
          const amountPerItem = newTxData.amount / mentionedItems.length;
          mentionedItems.forEach((item) => {
            const itemIdx = updatedInventory.findIndex((i) => i.id === item.id);
            if (itemIdx >= 0) {
              const qtyToReduce = item.salePrice > 0 ? (amountPerItem / item.salePrice) : 0;
              updatedInventory[itemIdx].quantity = Math.max(0, updatedInventory[itemIdx].quantity - qtyToReduce);
            }
          });
        }
      } else if (newTxData.type === 'SALE' && newTxData.notes?.startsWith('Barcode Sale:')) {
        const mentionedItems = updatedInventory.filter(item => 
          (newTxData.notes || '').toLowerCase().includes(item.name.toLowerCase())
        );
        if (mentionedItems.length > 0) {
          mentionedItems.forEach((item) => {
            const itemIdx = updatedInventory.findIndex((i) => i.id === item.id);
            if (itemIdx >= 0) {
              const qtyMatch = newTxData.notes?.match(/\((\d+)\s/);
              const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
              updatedInventory[itemIdx].quantity = Math.max(0, updatedInventory[itemIdx].quantity - qty);
            }
          });
        }
      }

      const updatedTransactions = prev.transactions.map((t) =>
        t.id === id ? { ...t, ...newTxData } : t
      );

      return {
        ...prev,
        customers: updatedCustomers,
        suppliers: updatedSuppliers,
        bankAccounts: updatedBankAccounts,
        inventory: updatedInventory,
        transactions: updatedTransactions,
      };
    });
  };

  // Inventory Handlers
  const handleAddItem = (newItem: Omit<InventoryItem, 'id'> & { id?: string }) => {
    const item: InventoryItem = {
      ...newItem,
      id: newItem.id || `inv_${Date.now()}`,
    } as InventoryItem;
    setState((prev) => ({
      ...prev,
      inventory: [item, ...prev.inventory],
    }));
  };

  const handleUpdateQty = (id: string, newQty: number, _skipPrompt = false) => {
    const item = state.inventory.find(i => i.id === id);
    if (!item) return;
    const oldQty = item.quantity;
    if (oldQty === newQty) return;

    const qtyChange = newQty - oldQty;
    const totalValueChange = qtyChange * item.purchasePrice;
    const reason = qtyChange > 0 ? "Direct stock addition (+)" : "Direct stock adjustment (-)";
    const balancingTreatment: Transaction['balancingTreatment'] = qtyChange > 0 ? 'CAPITAL_CONTRIBUTION' : 'LOSS_EXPENSE';
    const sourcePolicy = qtyChange > 0 ? 'OWNER_CAPITAL_INJECTION' : 'DAMAGED_EXPIRED_OR_SPOILED_INVENTORY';

    setState((prev) => {
      const auditTx: Transaction = {
        id: `tx_audit_${Date.now()}`,
        type: 'TRANSFER',
        amount: 0,
        category: 'STOCK_ADJUSTMENT',
        paymentMethod: 'CASH',
        date: new Date().toISOString(),
        notes: `Stock Adjustment: "${item.name}" changed from ${oldQty} to ${newQty} ${item.unit}. (${reason})`,
        itemId: id,
        qtyChange,
        unitCost: item.purchasePrice,
        totalValueChange,
        adjustmentReason: reason,
        balancingTreatment,
        sourcePolicy
      };

      return {
        ...prev,
        inventory: prev.inventory.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
        transactions: [auditTx, ...prev.transactions]
      };
    });
  };

  const handleDeleteItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== id),
    }));
  };

  const handleOpenSaleModal = (item?: InventoryItem) => {
    setSaleModalPrefilledItem(item || null);
    setIsSaleInventoryModalOpen(true);
  };

  const handleOpenPurchaseModal = (item?: InventoryItem) => {
    setPurchaseModalPrefilledItem(item || null);
    setAddModalPrefilledBarcode(null);
    setAddModalInitialMode('PURCHASE');
    setIsAddInventoryItemModalOpen(true);
  };

  const handleAddNewWithBarcode = (barcode: string) => {
    setAddModalPrefilledBarcode(barcode);
    setPurchaseModalPrefilledItem(null);
    setAddModalInitialMode('ADD');
    setIsAddInventoryItemModalOpen(true);
  };

  const handleRecordInventorySale = (saleData: {
    item: InventoryItem;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalAmount: number;
    paymentMethod: any;
    partyName?: string;
    date: string;
    notes?: string;
    invoiceNo?: string;
  }) => {
    const qty = saleData.quantity;
    const unitCost = saleData.item.purchasePrice || 0;
    const totalCostOfGoods = qty * unitCost;

    handleAddTransaction({
      date: saleData.date,
      type: 'SALE',
      category: saleData.item.category || 'General Goods',
      amount: saleData.totalAmount,
      paymentMethod: saleData.paymentMethod,
      partyName: saleData.partyName,
      itemId: saleData.item.id,
      qtyChange: -qty,
      unitCost: unitCost,
      totalValueChange: -totalCostOfGoods,
      notes: saleData.notes || `Sale: ${saleData.item.name} (${qty} ${saleData.item.unit})`,
    });
  };

  const handleRecordInventoryPurchase = (purchaseData: {
    item: InventoryItem;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    paymentMethod: any;
    partyName?: string;
    date: string;
    notes?: string;
    newSalePrice?: number;
  }) => {
    const qty = purchaseData.quantity;
    const unitCost = purchaseData.unitPrice;
    const totalCost = purchaseData.totalAmount;

    // Update item sale price or cost if needed
    if (purchaseData.newSalePrice !== undefined || purchaseData.unitPrice !== purchaseData.item.purchasePrice) {
      setState((prev) => ({
        ...prev,
        inventory: prev.inventory.map((inv) => {
          if (inv.id === purchaseData.item.id) {
            return {
              ...inv,
              purchasePrice: purchaseData.unitPrice,
              salePrice: purchaseData.newSalePrice !== undefined ? purchaseData.newSalePrice : inv.salePrice,
            };
          }
          return inv;
        }),
      }));
    }

    handleAddTransaction({
      date: purchaseData.date,
      type: 'PURCHASE',
      category: purchaseData.item.category || 'General Goods',
      amount: totalCost,
      paymentMethod: purchaseData.paymentMethod,
      partyName: purchaseData.partyName,
      itemId: purchaseData.item.id,
      qtyChange: qty,
      unitCost: unitCost,
      totalValueChange: totalCost,
      notes: purchaseData.notes || `Purchase Restock: ${purchaseData.item.name} (+${qty} ${purchaseData.item.unit})`,
    });
  };

  const handleRecordQuickSale = (item: InventoryItem, qty: number = 1) => {
    if (item.quantity < qty) {
      return;
    }

    handleAddTransaction({
      type: 'SALE',
      amount: item.salePrice * qty,
      category: item.category || 'General Goods',
      paymentMethod: 'CASH',
      date: new Date().toISOString(),
      notes: `Barcode Sale: ${item.name} (${qty} ${item.unit})`,
    });
  };

  const handleRecordQuickPurchase = (item: InventoryItem, qty: number = 1) => {
    handleAddTransaction({
      type: 'PURCHASE',
      amount: item.purchasePrice * qty,
      category: item.category || 'General Goods',
      paymentMethod: 'CASH',
      date: new Date().toISOString(),
      notes: `Barcode Purchase: ${item.name} (${qty} ${item.unit})`,
    });

    setState((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) =>
        i.id === item.id
          ? {
              ...i,
              quantity: i.quantity + qty,
              purchasedQty: i.purchasedQty + qty,
            }
          : i
      ),
    }));
  };

  // Customer / Supplier Handlers
  const handleAddCustomer = (cust: Omit<CustomerParty, 'id'>) => {
    const c: CustomerParty = { ...cust, id: `cust_${Date.now()}`, status: 'ACTIVE' };
    setState((prev) => ({ ...prev, customers: [...prev.customers, c] }));
  };

  const handleAddSupplier = (sup: Omit<SupplierParty, 'id'>) => {
    const s: SupplierParty = { ...sup, id: `sup_${Date.now()}`, status: 'ACTIVE' };
    setState((prev) => ({ ...prev, suppliers: [...prev.suppliers, s] }));
  };

  const handleDeleteCustomer = (id: string) => {
    const cust = state.customers.find((c) => c.id === id);
    if (!cust) return;
    const status = cust.status || 'ACTIVE';
    if (status === 'ACTIVE' && cust.totalCredit !== 0) {
      alert(isUrdu ? "فعال اکاؤنٹ جس کا بقایا بیلنس زیرو نہ ہو، ڈیلیٹ نہیں کیا جا سکتا!" : "Cannot delete an ACTIVE customer account with a non-zero outstanding balance.");
      return;
    }
    setState((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  };

  const handleDeleteSupplier = (id: string) => {
    const sup = state.suppliers.find((s) => s.id === id);
    if (!sup) return;
    const status = sup.status || 'ACTIVE';
    if (status === 'ACTIVE' && sup.totalPayable !== 0) {
      alert(isUrdu ? "فعال اکاؤنٹ جس کا بقایا بیلنس زیرو نہ ہو، ڈیلیٹ نہیں کیا جا سکتا!" : "Cannot delete an ACTIVE supplier account with a non-zero outstanding balance.");
      return;
    }
    setState((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
  };

  const handleUpdateCustomerStatus = (id: string, status: 'ACTIVE' | 'CLOSED' | 'WRITTEN_OFF' | 'ARCHIVED') => {
    setState((prev) => ({
      ...prev,
      customers: prev.customers.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  };

  const handleUpdateSupplierStatus = (id: string, status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED') => {
    setState((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => (s.id === id ? { ...s, status } : s)),
    }));
  };

  const handleRecordSpecialTransaction = (type: 'BAD_DEBT' | 'SUPPLIER_WAIVER', name: string, amount: number) => {
    if (type === 'BAD_DEBT') {
      handleAddTransaction({
        type: 'EXPENSE',
        amount,
        category: 'BAD_DEBT_WRITE_OFF',
        paymentMethod: 'CREDIT',
        partyName: name,
        date: new Date().toISOString(),
        notes: `Customer Bad-Debt Write-Off for ${name}`,
      });
    } else if (type === 'SUPPLIER_WAIVER') {
      handleAddTransaction({
        type: 'PAYMENT',
        amount,
        category: 'SUPPLIER_WAIVER',
        paymentMethod: 'CREDIT',
        partyName: name,
        date: new Date().toISOString(),
        notes: `Supplier Debt Waiver from ${name}`,
      });
    }
  };

  const handleRecordUdhaarPayment = (type: 'RECEIPT' | 'PAYMENT', name: string, amount: number) => {
    handleAddTransaction({
      type,
      amount,
      category: type === 'RECEIPT' ? 'Udhaar Collection' : 'Supplier Bill Payment',
      paymentMethod: 'CASH',
      partyName: name,
      date: new Date().toISOString(),
      notes: `${type === 'RECEIPT' ? 'Collected from' : 'Paid to'} ${name}`,
    });
  };

  // Assets Handlers
  const handleAddBusinessAsset = (asset: Omit<BusinessAsset, 'id'>) => {
    const ba: BusinessAsset = { ...asset, id: `ast_${Date.now()}` };
    setState((prev) => ({ ...prev, businessAssets: [...prev.businessAssets, ba] }));
  };

  const handleDeleteBusinessAsset = (id: string) => {
    setState((prev) => ({
      ...prev,
      businessAssets: prev.businessAssets.filter((a) => a.id !== id),
    }));
  };

  const handleAddPersonalAsset = (asset: Omit<PersonalAsset, 'id'>) => {
    const pa: PersonalAsset = { ...asset, id: `past_${Date.now()}` };
    setState((prev) => ({ ...prev, personalAssets: [...prev.personalAssets, pa] }));
  };

  const handleDeletePersonalAsset = (id: string) => {
    setState((prev) => ({
      ...prev,
      personalAssets: prev.personalAssets.filter((a) => a.id !== id),
    }));
  };

  const handleDeleteLoan = (id: string) => {
    setState((prev) => ({
      ...prev,
      loans: prev.loans.filter((l) => l.id !== id),
      transactions: prev.transactions.filter((t) => t.loanAccountId !== id),
    }));
  };

  const handleUpdateProfile = (profile: ShopProfile) => {
    setState((prev) => ({ ...prev, profile }));
  };

  const handleSwitchShop = (shopId: string) => {
    const found = state.otherShops.find((s) => s.id === shopId);
    if (found) {
      setState((prev) => ({
        ...prev,
        activeShopId: shopId,
        profile: {
          ...prev.profile,
          id: shopId,
          shopName: found.name,
        },
      }));
    }
  };

  const handleToggleStoreMode = () => {
    setState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        storeMode: prev.profile.storeMode === StoreMode.SIMPLE ? StoreMode.SPECIALIZED : StoreMode.SIMPLE,
      },
    }));
  };

  if (isLocked && (state.profile.pinCode || state.profile.passwordCode)) {
    return (
      <SecurityLock
        correctPin={state.profile.pinCode}
        correctPassword={state.profile.passwordCode}
        shopName={state.profile.shopName}
        isUrdu={isUrdu}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

  const railWidth = 40; // ultra-thin 36-40px pinned rail width
  const scaleFactor = isNavPinned ? Math.max(0.7, (windowWidth - railWidth) / windowWidth) : 1;

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      lang={isUrdu ? 'ur' : 'en'}
      className={`min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-[#0F8A5F] selection:text-white transition-all duration-300 overflow-x-hidden ${isUrdu ? 'rtl' : 'ltr'}`}
    >
      {/* Navigation Drawer & Pinned Rail (Fixed directly to browser viewport) */}
      <LeftSidebarNav
        currentScreen={screen}
        onSelectScreen={(s) => handleNavigate(s)}
        isUrdu={isUrdu}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        isPinned={isNavPinned}
        onTogglePin={() => setIsNavPinned(!isNavPinned)}
      />

      {/* Main Viewport Content Wrapper (TRUE 100% Proportional Vector Scale when Pinned) */}
      <div
        className="flex-1 flex flex-col will-change-transform"
        style={{
          width: '100%',
          transform: isNavPinned ? `scale(${scaleFactor})` : 'scale(1)',
          transformOrigin: isUrdu ? 'top right' : 'top left',
          marginLeft: isNavPinned ? (isUrdu ? 0 : `${railWidth}px`) : 0,
          marginRight: isNavPinned ? (isUrdu ? `${railWidth}px` : 0) : 0,
          transition:
            'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), margin-left 300ms cubic-bezier(0.16, 1, 0.3, 1), margin-right 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header */}
        <Header
          profile={state.profile}
          otherShops={state.otherShops}
          inventory={state.inventory}
          customers={state.customers}
          suppliers={state.suppliers}
          loans={state.loans}
          isUrdu={isUrdu}
          currentScreen={screen}
          onBack={handleBack}
          onToggleUrdu={handleToggleUrdu}
          onSwitchShop={handleSwitchShop}
          onLockApp={() => setIsLocked(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
          onToggleStoreMode={handleToggleStoreMode}
          onOpenQuickEntry={(type) => setQuickEntryType(type)}
          onNavigateScreen={(s) => handleNavigate(s)}
          onToggleMenu={() => setIsNavOpen((prev) => !prev)}
          isMenuOpen={isNavOpen}
        />

      {/* Main Container */}
      <main className="flex-1 px-4 py-4 max-w-5xl mx-auto w-full">
        {screen === Screen.DASHBOARD && (
          <Dashboard
            state={state}
            isUrdu={isUrdu}
            onOpenQuickEntry={(type) => setQuickEntryType(type)}
            onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
            onNavigateScreen={(s) => handleNavigate(s)}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenGraphs={() => setIsGraphsOpen(true)}
            onOpenAi={() => setIsAiOpen(true)}
            onOpenCashAccounts={() => setIsCashAccountsOpen(true)}
          />
        )}

        {screen === Screen.TRANSACTIONS && (
          <TransactionsModule
            state={state}
            isUrdu={isUrdu}
            onOpenQuickEntry={(type) => setQuickEntryType(type)}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onRestoreTransaction={handleRestoreTransaction}
            onEditTransaction={setEditingTransaction}
            onEmptyTrash={handleEmptyTrash}
          />
        )}

        {screen === Screen.KHATA && (
          <KhataModule
            state={state}
            isUrdu={isUrdu}
            onAddCustomer={handleAddCustomer}
            onAddSupplier={handleAddSupplier}
            onRecordUdhaarPayment={handleRecordUdhaarPayment}
            onDeleteCustomer={handleDeleteCustomer}
            onDeleteSupplier={handleDeleteSupplier}
            onUpdateCustomerStatus={handleUpdateCustomerStatus}
            onUpdateSupplierStatus={handleUpdateSupplierStatus}
            onRecordSpecialTransaction={handleRecordSpecialTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onRestoreTransaction={handleRestoreTransaction}
            onEditTransaction={setEditingTransaction}
            onEmptyTrash={handleEmptyTrash}
          />
        )}

        {screen === Screen.INVENTORY && (
          <InventoryModule
            state={state}
            isUrdu={isUrdu}
            onAddItem={handleAddItem}
            onUpdateQty={handleUpdateQty}
            onDeleteItem={handleDeleteItem}
            onOpenSaleModal={handleOpenSaleModal}
            onOpenPurchaseModal={handleOpenPurchaseModal}
            onRecordPurchase={handleRecordInventoryPurchase}
            pendingScannedBarcode={pendingScannedBarcode}
            onClearPendingBarcode={() => setPendingScannedBarcode(null)}
            autoOpenAddModal={autoOpenInventoryAdd}
            onClearAutoOpenAddModal={() => setAutoOpenInventoryAdd(false)}
          />
        )}

        {screen === Screen.ASSETS_LOANS && (
          <AssetsAndLoansModule
            state={state}
            isUrdu={isUrdu}
            onAddBusinessAsset={handleAddBusinessAsset}
            onAddPersonalAsset={handleAddPersonalAsset}
            onUpdateHouseholdExpenses={(exp) => setState((p) => ({ ...p, householdExpenses: exp }))}
            onUpdateOtherIncome={(inc) => setState((p) => ({ ...p, otherIncome: inc }))}
            onAddLoan={(loan) =>
              setState((p) => ({
                ...p,
                loans: [...p.loans, { ...loan, id: `loan_${Date.now()}` }],
              }))
            }
            onAddTransaction={handleAddTransaction}
            onDeleteBusinessAsset={handleDeleteBusinessAsset}
            onDeletePersonalAsset={handleDeletePersonalAsset}
            onDeleteLoan={handleDeleteLoan}
          />
        )}

        {screen === Screen.FBR_TAX && (
          <FbrTaxModule
            state={state}
            isUrdu={isUrdu}
            onSelectTaxYear={(yr) =>
              setState((p) => ({
                ...p,
                taxRecord: { ...p.taxRecord, selectedTaxYear: yr },
              }))
            }
            onUpdateTaxRecord={(rec) => setState((p) => ({ ...p, taxRecord: rec }))}
          />
        )}

        {screen === Screen.REPORTS && (
          <ReportsModule state={state} isUrdu={isUrdu} />
        )}

        {screen === Screen.ANALYTICS && (
          <AnalyticsModule state={state} isUrdu={isUrdu} />
        )}

        {screen === Screen.SETTINGS && (
          <SettingsModule
            state={state}
            isUrdu={isUrdu}
            onUpdateProfile={handleUpdateProfile}
            onResetData={() => {
              const keys = [
                'my_shop_manager_app_state_v2',
                'my_shop_dismissed_notifs',
                'app_is_signed_in',
                'app_user_email',
                'app_cloud_sync',
                'app_last_sync',
                'app_biometrics_enabled'
              ];
              keys.forEach((k) => localStorage.removeItem(k));
              localStorage.setItem('my_shop_reminders', '[]'); // Clear completely to empty state
              setState(DEFAULT_APP_STATE);
              setTimeout(() => {
                window.location.reload();
              }, 150);
            }}
            onRestoreState={(newState) => setState(newState)}
            onNavigateToBackup={() => handleNavigate(Screen.BACKUP_SYNC)}
            onTriggerScanner={(context) => {
              setScannerContext(context || 'API_URL');
              setIsScannerOpen(true);
            }}
          />
        )}

        {screen === Screen.BACKUP_SYNC && (
          <BackupSyncModule
            state={state}
            isUrdu={isUrdu}
            onRestoreState={(newState) => setState(newState)}
            onBack={handleBack}
          />
        )}

        {screen === Screen.NOTIFICATIONS && (
          <NotificationsScreen
            state={state}
            isUrdu={isUrdu}
            onBack={handleBack}
            onNavigateScreen={handleNavigate}
          />
        )}
      </main>
      </div>

      {/* Quick Entry / Edit Transaction Modal */}
      {(quickEntryType || editingTransaction) && (
        <QuickEntryModal
          initialType={editingTransaction ? editingTransaction.type : quickEntryType!}
          isOpen={Boolean(quickEntryType || editingTransaction)}
          onClose={() => {
            setQuickEntryType(null);
            setEditingTransaction(null);
            setPrefilledInventoryItem(null);
          }}
          onSubmit={(tx) => {
            if (editingTransaction) {
              handleUpdateEditedTransaction(editingTransaction.id, tx);
              setEditingTransaction(null);
            } else {
              handleAddTransaction(tx);
            }
          }}
          isUrdu={isUrdu}
          state={state}
          customerNames={state.customers.map((c) => c.name)}
          supplierNames={state.suppliers.map((s) => s.name)}
          onOpenScanner={() => {
            const currentType = editingTransaction ? editingTransaction.type : quickEntryType;
            if (currentType === 'SALE' || currentType === 'PURCHASE') {
              setScannerContext(currentType);
            } else {
              setScannerContext(null);
            }
            setIsScannerOpen(true);
          }}
          loans={state.loans}
          onAddNewInventoryItem={() => {
            setIsAddInventoryItemModalOpen(true);
          }}
          prefilledItem={prefilledInventoryItem}
          editingTransaction={editingTransaction}
        />
      )}

      {/* Voice Entry Modal */}
      {isVoiceEntryOpen && (
        <VoiceEntryModal
          isOpen={isVoiceEntryOpen}
          onClose={() => setIsVoiceEntryOpen(false)}
          onSubmit={handleAddTransaction}
          isUrdu={isUrdu}
        />
      )}

      {/* Global QR / Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScannerContext(null);
          }}
          isUrdu={isUrdu}
          state={state}
          onScanResult={(code, match) => {
            const cleanCode = (code || '').trim();
            if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
              localStorage.setItem('my_shop_custom_api_url', cleanCode);
              setIsScannerOpen(false);
              setScannerContext(null);
              alert(isUrdu ? `سرور کنکشن کامیابی سے جڑ گیا ہے:\n${cleanCode}` : `Server connection linked successfully:\n${cleanCode}`);
              window.location.reload();
              return;
            }
            if (match) {
              if (scannerContext === 'SALE') {
                handleOpenSaleModal(match);
                setIsScannerOpen(false);
                setScannerContext(null);
              } else if (scannerContext === 'PURCHASE') {
                handleOpenPurchaseModal(match);
                setIsScannerOpen(false);
                setScannerContext(null);
              }
            }
          }}
          onOpenSaleModal={(item) => {
            handleOpenSaleModal(item);
            setIsScannerOpen(false);
            setScannerContext(null);
          }}
          onOpenPurchaseModal={(item) => {
            handleOpenPurchaseModal(item);
            setIsScannerOpen(false);
            setScannerContext(null);
          }}
          onAddNewWithBarcode={(barcode) => {
            handleAddNewWithBarcode(barcode);
            setIsScannerOpen(false);
            setScannerContext(null);
          }}
        />
      )}

      {/* Global Less / Sale Inventory Item Modal */}
      {isSaleInventoryModalOpen && (
        <SaleInventoryItemModal
          isOpen={isSaleInventoryModalOpen}
          onClose={() => {
            setIsSaleInventoryModalOpen(false);
            setSaleModalPrefilledItem(null);
          }}
          isUrdu={isUrdu}
          state={state}
          prefilledItem={saleModalPrefilledItem}
          onRecordSale={handleRecordInventorySale}
        />
      )}

      {/* Calendar Reminders Modal */}
      {isCalendarOpen && (
        <CalendarRemindersModal
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          isUrdu={isUrdu}
        />
      )}

      {/* Analytics Graphs Modal */}
      {isGraphsOpen && (
        <GraphsModal
          isOpen={isGraphsOpen}
          onClose={() => setIsGraphsOpen(false)}
          state={state}
          isUrdu={isUrdu}
        />
      )}

      {/* AI Assistant Modal */}
      {isAiOpen && (
        <AiAssistantModal
          isOpen={isAiOpen}
          onClose={() => setIsAiOpen(false)}
          onOpenVoiceEntry={() => setIsVoiceEntryOpen(true)}
          state={state}
          isUrdu={isUrdu}
        />
      )}

      {/* Cash and Bank Accounts Modal */}
      {isCashAccountsOpen && (
        <CashAccountsModal
          isOpen={isCashAccountsOpen}
          onClose={() => setIsCashAccountsOpen(false)}
          state={state}
          onUpdateBankAccounts={(updated) => setState(prev => ({ ...prev, bankAccounts: updated }))}
          onAddTransaction={handleAddTransaction}
          isUrdu={isUrdu}
        />
      )}

      {/* Global Add / Purchase Inventory Item Modal */}
      {isAddInventoryItemModalOpen && (
        <AddInventoryItemModal
          isOpen={isAddInventoryItemModalOpen}
          onClose={() => {
            setIsAddInventoryItemModalOpen(false);
            setPurchaseModalPrefilledItem(null);
            setAddModalPrefilledBarcode(null);
            setAddModalInitialMode('ADD');
          }}
          isUrdu={isUrdu}
          state={state}
          onAddItem={(newItem) => {
            handleAddItem(newItem);
            setIsAddInventoryItemModalOpen(false);
          }}
          onRecordPurchase={handleRecordInventoryPurchase}
          prefilledBarcode={addModalPrefilledBarcode}
          prefilledItem={purchaseModalPrefilledItem}
          initialMode={addModalInitialMode}
        />
      )}

      {/* First Time App Setup Permissions Modal */}
      <PermissionsSetupModal
        isOpen={isPermissionsSetupOpen}
        onClose={() => setIsPermissionsSetupOpen(false)}
        isUrdu={isUrdu}
      />
    </div>
  );
}

export default App;
