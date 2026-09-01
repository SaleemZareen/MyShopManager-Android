import { AppState, StoreMode } from '../types';

export const DEFAULT_APP_STATE: AppState = {
  profile: {
    id: 'shop_01',
    shopName: 'My Shop',
    shopNameUrdu: 'میری دکان',
    subtitle: 'Dukan Management',
    ownerName: '',
    phone: '',
    cnic: '',
    ntn: '',
    address: '',
    storeMode: StoreMode.SIMPLE,
    storeCategory: 'KIRYANA_GENERAL',
    currencySymbol: 'Rs.',
    pinCode: '',
    biometricsEnabled: false,
    activeLanguage: 'en',
  },

  transactions: [],
  deletedTransactions: [],

  inventory: [],

  customers: [],

  suppliers: [],

  bankAccounts: [
    {
      id: 'acc_cash',
      accountTitle: 'Cash in Dukan Counter',
      bankName: 'Cash Counter',
      accountNumber: 'N/A',
      type: 'CASH',
      balance: 0,
    },
    {
      id: 'acc_meezan',
      accountTitle: 'Bank Account',
      bankName: 'Bank',
      accountNumber: '',
      type: 'BANK',
      balance: 0,
    },
    {
      id: 'acc_easypaisa',
      accountTitle: 'EasyPaisa Wallet',
      bankName: 'EasyPaisa',
      accountNumber: '',
      type: 'WALLET',
      balance: 0,
    },
    {
      id: 'acc_jazzcash',
      accountTitle: 'JazzCash Wallet',
      bankName: 'JazzCash',
      accountNumber: '',
      type: 'WALLET',
      balance: 0,
    },
  ],

  businessAssets: [],

  personalAssets: [],

  loans: [],

  householdExpenses: {
    monthlyHouseholdExpense: 0,
    schoolFee: 0,
    medical: 0,
    food: 0,
    utilityBills: 0,
    personalDrawings: 0,
  },

  otherIncome: {
    rentalIncome: 0,
    bankProfit: 0,
    agriculturalIncome: 0,
    capitalGain: 0,
    freelanceIncome: 0,
    otherIncome: 0,
  },

  taxRecord: {
    adjustableTax: 0,
    advanceTax: 0,
    psidPayments: 0,
    bankWithholding: 0,
    utilityWithholding: 0,
    vehicleTax: 0,
    propertyTax: 0,
    otherTaxCertificates: 0,
    selectedTaxYear: '2026',
    openingOwnerEquity: {
      '2024': 0,
      '2025': 0,
      '2026': 0,
    },
    openingBusinessLoanBalance: {
      '2024': 0,
      '2025': 0,
      '2026': 0,
    },
  },

  activeShopId: 'shop_01',
  otherShops: [
    { id: 'shop_01', name: 'My Shop' },
  ],
};

const STORAGE_KEY = 'my_shop_manager_app_state_v2';

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_APP_STATE,
        loans: DEFAULT_APP_STATE.loans.map(l => ({
          ...l,
          classification: l.classification || (l.type === 'PERSONAL_LOAN' ? 'PERSONAL_LOAN' : 'BUSINESS_LOAN'),
        })),
      };
    }
    const parsed = JSON.parse(raw);

    // Auto-detect if the user's browser has the old cached dummy data
    const hasOldDummyData = 
      parsed.profile?.shopName === 'Bismillah General Store & Kiryana' ||
      (parsed.transactions && parsed.transactions.some((t: any) => t.id === 'tx_101')) ||
      (parsed.customers && parsed.customers.some((c: any) => c.id === 'cust_1'));

    if (hasOldDummyData) {
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_APP_STATE;
    }

    const resolvedLoans = (parsed.loans || DEFAULT_APP_STATE.loans || []).map((l: any) => ({
      ...l,
      classification: l.classification || (l.type === 'PERSONAL_LOAN' ? 'PERSONAL_LOAN' : 'BUSINESS_LOAN'),
    }));
    
    let resolvedBankAccounts = parsed.bankAccounts || DEFAULT_APP_STATE.bankAccounts;
    if (parsed.transactions && parsed.transactions.length === 0) {
      resolvedBankAccounts = resolvedBankAccounts.map((a: any) => ({ ...a, balance: 0 }));
    }

    return {
      ...DEFAULT_APP_STATE,
      ...parsed,
      loans: resolvedLoans,
      bankAccounts: resolvedBankAccounts,
      profile: {
        ...DEFAULT_APP_STATE.profile,
        ...parsed.profile,
      },
      householdExpenses: {
        ...DEFAULT_APP_STATE.householdExpenses,
        ...parsed.householdExpenses,
      },
      otherIncome: {
        ...DEFAULT_APP_STATE.otherIncome,
        ...parsed.otherIncome,
      },
      taxRecord: {
        ...DEFAULT_APP_STATE.taxRecord,
        ...parsed.taxRecord,
      },
    };
  } catch (e) {
    console.error('Failed to load application state:', e);
    return DEFAULT_APP_STATE;
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save application state:', e);
  }
}

export function formatMoney(amount: number, symbol = 'Rs.'): string {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat('en-PK').format(Math.abs(rounded));
  return `${amount < 0 ? '-' : ''}${symbol} ${formatted}`;
}

export function formatFinancialValue(value: number | null, isMissing: boolean, isUrdu: boolean, symbol = 'Rs.'): string {
  if (isMissing || value === null) {
    return isUrdu ? 'نامکمل / غیر حتمی' : 'Incomplete / Not Final';
  }
  return formatMoney(value, symbol);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatShortDateTime(isoString: string): string {
  if (!isoString) return '10.8.26 19:00';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear().toString().slice(-2);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatFullDateTime(isoString: string): string {
  if (!isoString) return '10-Aug-26 07:30 PM';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear().toString().slice(-2);
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${day}-${month}-${year} ${time}`;
}

export function isDecimalAllowed(unit: string): boolean {
  const u = (unit || '').toLowerCase().trim();
  // KG, Meter, Gram, Liter, and Urdu equivalents
  return ['kg', 'kilogram', 'gram', 'grams', 'g', 'liter', 'liters', 'litre', 'l', 'meter', 'meters', 'm', 'کلو', 'گرام', 'لیٹر', 'میٹر'].some(
    decimalUnit => u === decimalUnit || u.includes(decimalUnit)
  );
}

export function formatQuantity(qty: number, unit: string): string {
  if (!isDecimalAllowed(unit)) {
    return Math.round(qty).toString();
  }
  // Keep the input exactly as is, up to 3 decimal places
  return Number(qty.toFixed(3)).toString();
}

export function sanitizeQuantity(qty: number, unit: string): number {
  if (!isDecimalAllowed(unit)) {
    return Math.round(qty);
  }
  return Math.round(qty * 1000) / 1000;
}

import { PRODUCTION_API_BASE_URL, resolveApiUrl } from '../config/apiConfig';

export function getApiUrl(path: string): string {
  return resolveApiUrl(path);
}

export async function fetchWithFailover(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(path);
  return fetch(url, options);
}


