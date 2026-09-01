export interface CategoryTranslation {
  id: string;
  en: string;
  ur: string;
}

export const EXPENSE_CATEGORIES_TRANSLATED: CategoryTranslation[] = [
  { id: 'SHOP_RENT', en: 'Shop Rent', ur: 'دکان کا کرایہ' },
  { id: 'ELECTRICITY', en: 'Electricity Bill', ur: 'بجلی کا بل' },
  { id: 'GAS', en: 'Gas Bill', ur: 'گیس کا بل' },
  { id: 'WATER', en: 'Water Bill', ur: 'پانی کا بل' },
  { id: 'INTERNET', en: 'Internet & WiFi', ur: 'انٹرنیٹ اور وائی فائی' },
  { id: 'PHONE', en: 'Mobile / Phone Bill', ur: 'فون / موبائل بل' },
  { id: 'TRANSPORT', en: 'Transport & Freight', ur: 'ٹرانسپورٹ اور کرایہ بھاڑا' },
  { id: 'FUEL', en: 'Fuel / Petrol', ur: 'پیٹرول / ایندھن' },
  { id: 'SALARY', en: 'Staff Salary', ur: 'ملازمین کی تنخواہ' },
  { id: 'TEA', en: 'Tea & Hospitality', ur: 'چائے اور ضیافت' },
  { id: 'CLEANING', en: 'Cleaning & Janitorial', ur: 'صفائی کے اخراجات' },
  { id: 'REPAIR', en: 'Repair & Maintenance', ur: 'مرمت اور دیکھ بھال' },
  { id: 'MAINTENANCE', en: 'Shop Maintenance', ur: 'دکان کی رکھ رکھاؤ' },
  { id: 'PACKAGING', en: 'Packaging Materials', ur: 'پیکنگ سامان' },
  { id: 'COURIER', en: 'Courier & Shipping', ur: 'ڈاک اور کوریئر' },
  { id: 'ADVERTISING', en: 'Advertising & Flex', ur: 'اشتہار اور فلیکس Board' },
  { id: 'STATIONERY', en: 'Stationery & Register', ur: 'سٹیشنری اور رجسٹر' },
  { id: 'PRINTING', en: 'Printing Bills', ur: 'پرنٹنگ' },
  { id: 'PROFESSIONAL_FEE', en: 'Accountant / Legal Fee', ur: 'وکیل / اکاؤنٹنٹ فیس' },
  { id: 'BANK_CHARGES', en: 'Bank Charges', ur: 'بینک چارجز' },
  { id: 'POS_CHARGES', en: 'POS Machine Fees', ur: 'POS مشین کٹوتی' },
  { id: 'MISCELLANEOUS', en: 'Miscellaneous', ur: 'متفرق اخراجات' },
  { id: 'CUSTOM', en: 'Custom Expense', ur: 'دیگر مخصوص خرچ' },
];

export const ASSET_TYPES_TRANSLATED: CategoryTranslation[] = [
  { id: 'FURNITURE', en: 'Furniture & Fixtures', ur: 'فرنیچر اور کاؤنٹر' },
  { id: 'SHELVES', en: 'Racks & Shelves', ur: 'ریک اور الماریاں' },
  { id: 'COMPUTER', en: 'Computer / Laptop', ur: 'کمپیوٹر / لیپ ٹاپ' },
  { id: 'PRINTER_POS', en: 'Printer / POS Machine', ur: 'پرنٹر / POS مشین' },
  { id: 'VEHICLE', en: 'Delivery Bike / Van', ur: 'سواریاں / بائیک / وین' },
  { id: 'GENERATOR', en: 'Generator', ur: 'جنریٹر' },
  { id: 'UPS_SOLAR', en: 'UPS & Solar System', ur: 'یو پی ایس اور سولر سسٹم' },
  { id: 'MACHINERY', en: 'Machinery & Tools', ur: 'مشینری اور اوزار' },
  { id: 'AC_FRIDGE', en: 'AC & Deep Freezer', ur: 'ایئر کنڈیشنر اور ڈیپ فریزر' },
  { id: 'OTHER', en: 'Other Business Assets', ur: 'دیگر دکان کے اثاثے' },
];

export const PERSONAL_ASSET_TYPES_TRANSLATED: CategoryTranslation[] = [
  { id: 'HOUSE', en: 'Residential House', ur: 'رہائشی مکان' },
  { id: 'PLOT', en: 'Plot / Land', ur: 'پلاٹ / زمین' },
  { id: 'CAR', en: 'Car / Motor Vehicle', ur: 'گاڑی' },
  { id: 'BIKE', en: 'Motorcycle', ur: 'موٹر سائیکل' },
  { id: 'GOLD', en: 'Gold & Jewelry', ur: 'سونا اور زیورات' },
  { id: 'CASH_BANK', en: 'Personal Cash / Bank', ur: 'ذاتی نقد / بینک رقم' },
  { id: 'INVESTMENTS', en: 'Prize Bonds / Shares / Stocks', ur: 'پرائز بانڈز / پرائیویٹ سرمایہ کاری' },
  { id: 'OTHER', en: 'Other Personal Property', ur: 'دیگر ذاتی اثاثے' },
];

export const UI_STRINGS = {
  appName: { en: 'My Shop Manager', ur: 'مائی شاپ مینیجر' },
  subtitle: { en: 'Dukan Management', ur: 'دوکان مینیجمنٹ' },
  tagline: {
    en: 'Manage Your Shop Daily. Prepare Your Tax Records Easily.',
    ur: 'روزانہ کی دوکان سنبھالیں۔ ٹیکس ریکارڈز آسانی سے تیار کریں۔',
  },
  
  // Navigation
  navDashboard: { en: 'Dashboard', ur: 'ڈیش بورڈ' },
  navTransactions: { en: 'Journal', ur: 'لین دین' },
  navKhata: { en: 'Khata Book', ur: 'کھاتہ بائک' },
  navInventory: { en: 'Stock / Inventory', ur: 'اسٹاک / انوینٹری' },
  navAssetsLoans: { en: 'Assets & Wealth', ur: 'اثاثے اور ذاتی خرچ' },
  navFbrTax: { en: 'FBR Tax Prep', ur: 'FBR ٹیکس تیاری' },
  navReports: { en: 'Reports', ur: 'رپورٹس' },
  navAnalytics: { en: 'Analytics', ur: 'تجزیہ' },
  navSettings: { en: 'Settings', ur: 'ترتیبات' },

  // Dashboard Cards
  todaySales: { en: "Today's Sales", ur: 'آج کی فروخت' },
  todayPurchases: { en: "Today's Purchases", ur: 'آج کی خریداری' },
  todayExpenses: { en: "Today's Expenses", ur: 'آج کے اخراجات' },
  cashInHand: { en: 'Cash Balance', ur: 'دکان میں نقد' },
  bankBalance: { en: 'Bank Balance', ur: 'بینک رقم' },
  walletBalance: { en: 'Digital Wallets', ur: 'ڈیجیٹل والٹس' },
  todayProfit: { en: "Today's Net Profit", ur: 'آج کا خالص منافع' },
  monthlyProfit: { en: 'Monthly Profit', ur: 'ماہانہ منافع' },
  annualProfit: { en: 'Annual Profit (YTD)', ur: 'سالانہ منافع' },
  outstandingReceivables: { en: 'Customer Udhaar (Receivable)', ur: 'گاہکوں کا ادھار (وصولی)' },
  outstandingPayables: { en: 'Supplier Payable', ur: 'سپلائر کی قابل ادا رقم' },
  stockValue: { en: 'Current Stock Value', ur: 'موجودہ اسٹاک کی مالیت' },

  // Quick Action Buttons
  quickAddSale: { en: '+ Add Sale', ur: '+ فروخت اندارج' },
  quickAddPurchase: { en: '+ Add Purchase', ur: '+ خریداری اندراج' },
  quickAddExpense: { en: '+ Expense', ur: '+ خرچ درج کریں' },
  quickAddCustomerCredit: { en: 'Give Udhaar', ur: 'ادھار دیا' },
  quickReceivePayment: { en: 'Collect Udhaar', ur: 'ادھار وصولی' },
  voiceEntry: { en: 'Voice Entry (Urdu)', ur: 'آواز سے اندراج (اردو)' },
  scanReceipt: { en: 'Scan Bill / Receipt', ur: 'رسید اسکین کریں' },

  // Disclaimer
  taxDisclaimer: {
    en: 'Disclaimer: This app produces structured records to simplify tax preparation. It does not auto-submit or replace an official FBR IRIS tax filing. Final returns must be reviewed by the taxpayer or a qualified tax advisor.',
    ur: 'ضروری اطلاع: یہ ایپ ٹیکس کی تیاری کو آسان بنانے کے لیے منظم ریکارڈ تیار کرتی ہے۔ یہ FBR IRIS پر براہ راست ریٹرن جمع نہیں کرتی۔ حتمی فارم جمع کرانے سے پہلے ٹیکس وکیل یا اکاؤنٹنٹ سے لازمی تصدیق کروائیں۔',
  },
};
