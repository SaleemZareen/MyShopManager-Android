export enum Screen {
  DASHBOARD = 'DASHBOARD',
  TRANSACTIONS = 'TRANSACTIONS',
  KHATA = 'KHATA',
  INVENTORY = 'INVENTORY',
  ASSETS_LOANS = 'ASSETS_LOANS',
  FBR_TAX = 'FBR_TAX',
  REPORTS = 'REPORTS',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
  BACKUP_SYNC = 'BACKUP_SYNC',
  NOTIFICATIONS = 'NOTIFICATIONS',
}

export enum StoreMode {
  SIMPLE = 'SIMPLE', // General Store, Kiryana, Parchoon, Grocery
  SPECIALIZED = 'SPECIALIZED', // Mobile, Pharmacy, Garments, Hardware, Electronics, Cosmetics, Auto Parts
}

export type StoreCategory =
  | 'KIRYANA_GENERAL'
  | 'MOBILE_SHOP'
  | 'PHARMACY'
  | 'GARMENTS'
  | 'HARDWARE'
  | 'ELECTRONICS'
  | 'COSMETICS'
  | 'AUTO_PARTS'
  | 'OTHER';

export type PaymentMethod =
  | 'CASH'
  | 'BANK'
  | 'EASYPAISA'
  | 'JAZZCASH'
  | 'NAYAPAY'
  | 'SADAPAY'
  | 'CREDIT';

export type TransactionType =
  | 'SALE'
  | 'PURCHASE'
  | 'EXPENSE'
  | 'RECEIPT'
  | 'PAYMENT'
  | 'LOAN_GIVEN'
  | 'LOAN_TAKEN'
  | 'TRANSFER';

export type ExpenseCategory =
  | 'SHOP_RENT'
  | 'ELECTRICITY'
  | 'GAS'
  | 'WATER'
  | 'INTERNET'
  | 'PHONE'
  | 'TRANSPORT'
  | 'FUEL'
  | 'SALARY'
  | 'TEA'
  | 'CLEANING'
  | 'REPAIR'
  | 'MAINTENANCE'
  | 'PACKAGING'
  | 'COURIER'
  | 'ADVERTISING'
  | 'STATIONERY'
  | 'PRINTING'
  | 'PROFESSIONAL_FEE'
  | 'BANK_CHARGES'
  | 'POS_CHARGES'
  | 'MISCELLANEOUS'
  | 'CUSTOM';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: ExpenseCategory | string;
  paymentMethod: PaymentMethod;
  partyName?: string; // Customer or Supplier name
  invoiceNo?: string;
  date: string; // ISO String
  notes?: string;
  receiptImageUrl?: string;
  itemId?: string;
  qtyChange?: number;
  unitCost?: number;
  totalValueChange?: number;
  adjustmentReason?: string;
  balancingTreatment?: 'LOSS_EXPENSE' | 'CAPITAL_CONTRIBUTION' | 'OTHER_INCOME' | 'PAST_ERROR_CORRECTION' | 'UNKNOWN';
  sourcePolicy?: string;
  loanAccountId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string; // kg, pcs, box, packet, meter, etc.
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  minStockAlert: number;
  barcode?: string;
  openingStock: number;
  purchasedQty: number;
  soldQty: number;
  damagedQty: number;
  returnedQty: number;
}

export interface CustomerParty {
  id: string;
  name: string;
  phone: string;
  totalCredit: number;
  lastTransactionDate: string;
  notes?: string;
  status?: 'ACTIVE' | 'CLOSED' | 'WRITTEN_OFF' | 'ARCHIVED';
}

export interface SupplierParty {
  id: string;
  name: string;
  phone: string;
  totalPayable: number;
  dueDate?: string;
  notes?: string;
  status?: 'ACTIVE' | 'CLOSED' | 'WRITTEN_OFF' | 'ARCHIVED';
}

export interface BankAccount {
  id: string;
  accountTitle: string;
  bankName: string; // HBL, Meezan, EasyPaisa, JazzCash, NayaPay, SadaPay, etc.
  accountNumber: string;
  type: 'CASH' | 'BANK' | 'WALLET';
  balance: number;
}

export interface BusinessAsset {
  id: string;
  name: string; // Furniture, Shelves, Computer, Laptop, Printer, POS Machine, Vehicle, Generator, UPS, Solar, Machinery, Air Conditioner, Deep Freezer, etc.
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  usefulLifeYears: number;
  currentValue: number;
}

export interface PersonalAsset {
  id: string;
  name: string; // House, Plot, Car, Bike, Gold, Cash, Bank Balance, Investments, Other
  category: string;
  value: number;
}

export interface LoanRecord {
  id: string;
  type: 'PERSONAL_LOAN' | 'BUSINESS_LOAN' | 'BANK_LOAN' | 'BORROWING';
  classification?: 'PERSONAL_LOAN' | 'BUSINESS_LOAN';
  lenderOrBorrower: string;
  amount: number;
  outstandingAmount: number;
  repaymentDate?: string;
  interestRate?: number;
  notes?: string;
}

export interface HouseholdExpenses {
  monthlyHouseholdExpense: number;
  schoolFee: number;
  medical: number;
  food: number;
  utilityBills: number;
  personalDrawings: number;
}

export interface OtherIncome {
  rentalIncome: number;
  bankProfit: number;
  agriculturalIncome: number;
  capitalGain: number;
  freelanceIncome: number;
  otherIncome: number;
}

export interface TaxRecord {
  adjustableTax: number;
  advanceTax: number;
  psidPayments: number;
  bankWithholding: number;
  utilityWithholding: number;
  vehicleTax: number;
  propertyTax: number;
  otherTaxCertificates: number;
  selectedTaxYear: '2024' | '2025' | '2026';
  openingOwnerEquity?: Record<string, number>;
  openingBusinessLoanBalance?: Record<string, number>;
}

export interface ShopProfile {
  id: string;
  shopName: string;
  shopNameUrdu?: string;
  subtitle: string; // "Dukan Management"
  ownerName: string;
  phone: string;
  email?: string;
  cnic: string;
  ntn: string;
  address: string;
  storeMode: StoreMode;
  storeCategory: StoreCategory;
  currencySymbol: string; // "Rs."
  pinCode?: string; // 4-digit PIN for lock
  passwordCode?: string; // Alphanumeric password for lock
  biometricsEnabled: boolean;
  activeLanguage: 'en' | 'ur';
}

export interface AppState {
  profile: ShopProfile;
  transactions: Transaction[];
  deletedTransactions?: Transaction[];
  inventory: InventoryItem[];
  customers: CustomerParty[];
  suppliers: SupplierParty[];
  bankAccounts: BankAccount[];
  businessAssets: BusinessAsset[];
  personalAssets: PersonalAsset[];
  loans: LoanRecord[];
  householdExpenses: HouseholdExpenses;
  otherIncome: OtherIncome;
  taxRecord: TaxRecord;
  activeShopId: string;
  otherShops: Array<{ id: string; name: string }>;
}
