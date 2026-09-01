import { AppState } from '../types';

export interface FbrMappingField {
  irisCode: string;
  fieldTitleEn: string;
  fieldTitleUr: string;
  calculatedValue: number;
  sectionReference: string;
  categoryGroup: 'INCOME' | 'EXPENSE' | 'ASSETS' | 'LIABILITIES' | 'WEALTH_RECON' | 'TAX_CREDIT';
}

export interface TaxYearConfig {
  year: '2024' | '2025' | '2026';
  turnoverTaxRate: number; // e.g. 1.25% minimum tax u/s 113 for retailers
  normalTaxSlabsEnabled: boolean;
  notesEn: string;
  notesUr: string;
}

export const TAX_YEAR_CONFIGS: Record<string, TaxYearConfig> = {
  '2024': {
    year: '2024',
    turnoverTaxRate: 0.0125,
    normalTaxSlabsEnabled: true,
    notesEn: 'TY2024 FBR IRIS Income Tax Return for Retailers & Sole Proprietors',
    notesUr: 'سال 2024 کی FBR انکم ٹیکس ریٹرن رولز',
  },
  '2025': {
    year: '2025',
    turnoverTaxRate: 0.0125,
    normalTaxSlabsEnabled: true,
    notesEn: 'TY2025 Tax Year Rules & Updated Wealth Statement Mappings',
    notesUr: 'سال 2025 کے ٹیکس قوانین اور اپڈیٹڈ ویلتھ اسٹیٹمنٹ مینوئل',
  },
  '2026': {
    year: '2026',
    turnoverTaxRate: 0.0125,
    normalTaxSlabsEnabled: true,
    notesEn: 'TY2026 Configurable FBR IRIS Mapping Layer',
    notesUr: 'سال 2026 کا FBR میپنگ لیئر',
  },
};

export function calculateFbrSummary(state: AppState) {
  const { transactions: rawTransactions, inventory, businessAssets, personalAssets, loans, householdExpenses, otherIncome, taxRecord, customers, suppliers, bankAccounts } = state;
  const selectedYear = taxRecord.selectedTaxYear || '2026';

  const isWithinPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    return dateStr.substring(0, 4) === selectedYear;
  };

  const unclassifiedLoanTransactions = rawTransactions.filter(t => 
    isWithinPeriod(t.date) &&
    (t.type === 'LOAN_TAKEN' || (t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT')) &&
    !t.loanAccountId
  );
  const hasUnclassifiedLoans = unclassifiedLoanTransactions.length > 0;

  const transactions = rawTransactions.filter(t => {
    if (!isWithinPeriod(t.date)) return false;
    const isLoanTx = t.type === 'LOAN_TAKEN' || (t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT');
    if (isLoanTx && !t.loanAccountId) {
      return false;
    }
    return true;
  });

  // 1. Business Revenue & Expenses
  const sales = transactions
    .filter((t) => t.type === 'SALE')
    .reduce((sum, t) => sum + t.amount, 0);

  const purchases = transactions
    .filter((t) => t.type === 'PURCHASE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Supplier Discounts Received (classified as Other Business Income to avoid double-counting)
  const supplierDiscounts = transactions
    .filter((t) => {
      const cat = t.category?.toUpperCase() || '';
      const notes = t.notes?.toLowerCase() || '';
      const type = t.type;
      
      // Dual-policy explicit classification:
      // 1. Cash discount received (RECEIPT with paymentMethod !== 'CREDIT')
      const isCashDiscount = type === 'RECEIPT' && t.paymentMethod !== 'CREDIT' &&
        (cat === 'DISCOUNT' || cat === 'DISCOUNT_RECEIVED' || cat === 'SUPPLIER_DISCOUNT' || notes.includes('discount') || notes.includes('supplier discount'));
      
      // 2. Discount against supplier payable (PAYMENT with paymentMethod === 'CREDIT')
      const isPayableDiscount = type === 'PAYMENT' && t.paymentMethod === 'CREDIT' &&
        (cat === 'DISCOUNT' || cat === 'DISCOUNT_RECEIVED' || cat === 'SUPPLIER_DISCOUNT' || notes.includes('discount') || notes.includes('supplier discount'));

      return isCashDiscount || isPayableDiscount;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Customer Late Fines Received (intentionally treated as other business income)
  const customerLateFines = transactions
    .filter((t) => {
      const cat = t.category?.toUpperCase() || '';
      const notes = t.notes?.toLowerCase() || '';
      const type = t.type;
      return type === 'RECEIPT' &&
        (cat === 'LATE_FINE' || cat === 'FINE' || cat === 'PENALTY' || notes.includes('late fine') || notes.includes('fine received') || notes.includes('customer fine'));
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Stock Adjustments audit & balancing treatment sums
  const stockAdjustments = transactions.filter(t => t.category === 'STOCK_ADJUSTMENT');

  const negativeAdjustmentsValue = stockAdjustments
    .filter(t => (t.totalValueChange ?? 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.totalValueChange ?? 0), 0);

  const positiveAdjCapital = stockAdjustments
    .filter(t => (t.totalValueChange ?? 0) > 0 && t.balancingTreatment === 'CAPITAL_CONTRIBUTION')
    .reduce((sum, t) => sum + (t.totalValueChange ?? 0), 0);

  const positiveAdjIncome = stockAdjustments
    .filter(t => (t.totalValueChange ?? 0) > 0 && t.balancingTreatment === 'OTHER_INCOME')
    .reduce((sum, t) => sum + (t.totalValueChange ?? 0), 0);

  const positiveAdjPastError = stockAdjustments
    .filter(t => (t.totalValueChange ?? 0) > 0 && t.balancingTreatment === 'PAST_ERROR_CORRECTION')
    .reduce((sum, t) => sum + (t.totalValueChange ?? 0), 0);

  const positiveAdjUnknown = stockAdjustments
    .filter(t => (t.totalValueChange ?? 0) > 0 && (!t.balancingTreatment || t.balancingTreatment === 'UNKNOWN'))
    .reduce((sum, t) => sum + (t.totalValueChange ?? 0), 0);

  const positiveAdjustmentsValue = positiveAdjCapital + positiveAdjIncome + positiveAdjPastError + positiveAdjUnknown;

  const hasUnknownPositiveAdjustment = stockAdjustments.some(t => 
    (t.totalValueChange ?? 0) > 0 && (!t.balancingTreatment || t.balancingTreatment === 'UNKNOWN')
  );

  const recognisedOtherBusinessIncome = supplierDiscounts + customerLateFines + positiveAdjIncome;

  // Business expenses should exclude personal drawings and loan repayments, and we add negative stock adjustments (losses)
  const directExpensesBase = transactions
    .filter((t) => t.type === 'EXPENSE' && t.category !== 'DRAWINGS' && t.category !== 'PERSONAL_DRAWINGS' && t.category !== 'LOAN_REPAYMENT')
    .reduce((sum, t) => sum + t.amount, 0);
  const directExpenses = directExpensesBase + negativeAdjustmentsValue;

  // Stock Values
  const isStockDataMissing = inventory.length === 0;
  const stockValue = inventory.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const openingStockValue = inventory.reduce((sum, item) => sum + (item.openingStock ?? 0) * item.purchasePrice, 0);

  const directPurchaseCosts = 0; // Carriage inward/customs can be added here if categorized

  // COGS = Opening Stock + Net Purchases + Direct Purchase Costs - Closing Stock - Negative Stock Adjustments + Positive Stock Adjustments
  const rawCogs = openingStockValue + purchases + directPurchaseCosts - stockValue - negativeAdjustmentsValue + positiveAdjustmentsValue;
  const isCogsNegative = !isStockDataMissing && rawCogs < 0;
  const isStockUnavailable = isStockDataMissing || isCogsNegative;

  const estimatedCogs = isStockUnavailable ? null : rawCogs;
  const grossProfit = isStockUnavailable ? null : (sales - rawCogs);

  // Policy formula: netProfitOrLoss = netSales + recognisedOtherBusinessIncome - COGS - directOperatingExpenses
  const netProfit = isStockUnavailable ? null : (sales + recognisedOtherBusinessIncome - rawCogs - directExpenses);

  // 2. Receivables & Payables
  const totalReceivables = customers.reduce((sum, c) => sum + c.totalCredit, 0);
  const totalPayables = suppliers.reduce((sum, s) => sum + s.totalPayable, 0);

  // 3. Loans Tracking
  const isBusinessLoanAccount = (l: any) => l.classification === 'BUSINESS_LOAN' || (l.classification !== 'PERSONAL_LOAN' && l.type !== 'PERSONAL_LOAN');
  const isPersonalLoanAccount = (l: any) => l.classification === 'PERSONAL_LOAN' || l.type === 'PERSONAL_LOAN';

  const businessLoanAccountIds = new Set(loans.filter(isBusinessLoanAccount).map(l => l.id));
  const personalLoanAccountIds = new Set(loans.filter(isPersonalLoanAccount).map(l => l.id));

  const openingBusinessLoanBalanceForSelectedPeriod = taxRecord.openingBusinessLoanBalance?.[selectedYear] ?? 0;

  const loanTakenTransactionsWithinSelectedPeriod = transactions
    .filter(t => t.type === 'LOAN_TAKEN' && t.loanAccountId && businessLoanAccountIds.has(t.loanAccountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const loanRepaymentTransactionsWithinSelectedPeriod = transactions
    .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.loanAccountId && businessLoanAccountIds.has(t.loanAccountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const closingBusinessLoans = openingBusinessLoanBalanceForSelectedPeriod + loanTakenTransactionsWithinSelectedPeriod - loanRepaymentTransactionsWithinSelectedPeriod;

  const personalLoansTakenWithinSelectedPeriod = transactions
    .filter(t => t.type === 'LOAN_TAKEN' && t.loanAccountId && personalLoanAccountIds.has(t.loanAccountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const personalLoansRepaidWithinSelectedPeriod = transactions
    .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.loanAccountId && personalLoanAccountIds.has(t.loanAccountId))
    .reduce((sum, t) => sum + t.amount, 0);

  const basePersonalLoans = loans
    .filter(isPersonalLoanAccount)
    .reduce((sum, l) => sum + l.outstandingAmount, 0);

  const personalLiabilities = basePersonalLoans + personalLoansTakenWithinSelectedPeriod - personalLoansRepaidWithinSelectedPeriod;

  const outstandingLoans = closingBusinessLoans + personalLiabilities;

  const txLoansGiven = transactions.filter(t => t.type === 'LOAN_GIVEN').reduce((sum, t) => sum + t.amount, 0);
  const txLoansGivenCollected = transactions.filter(t => t.type === 'RECEIPT' && t.category === 'LOAN_GIVEN_COLLECTION').reduce((sum, t) => sum + t.amount, 0);
  const outstandingLoansGiven = txLoansGiven - txLoansGivenCollected;

  // 4. Separation of Business and Personal Wealth
  const businessAssetValue = businessAssets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalCashAndBank = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  // businessAssets = businessAssetValue + stockValue + businessReceivables + businessCashAndBank + businessLoansGiven
  const businessAssetsVal = isStockUnavailable 
    ? null 
    : (businessAssetValue + stockValue + totalReceivables + totalCashAndBank + outstandingLoansGiven);

  // businessLiabilities = businessLoansTaken + supplierPayables
  const businessLoansTaken = closingBusinessLoans;
  const businessLiabilities = businessLoansTaken + totalPayables;

  // netBusinessEquity = businessAssets - businessLiabilities
  const netBusinessEquity = businessAssetsVal === null ? null : (businessAssetsVal - businessLiabilities);

  // personalNetWealth = personalAssets - personalLiabilities
  const personalAssetValue = personalAssets.reduce((sum, a) => sum + a.value, 0);
  const personalNetWealth = personalAssetValue - personalLiabilities;

  // Total overall wealth-statement calculation (retaining the overall structure)
  const totalBusinessAssets = businessAssetValue + (isStockUnavailable ? 0 : stockValue) + totalReceivables + totalCashAndBank + outstandingLoansGiven;
  const totalAssets = totalBusinessAssets + personalAssetValue;
  const totalLiabilities = outstandingLoans + totalPayables;
  const netWorth = totalAssets - totalLiabilities;

  // 5. Period-Aware Owner Capital & Drawings Tracking
  const openingOwnerEquity = (taxRecord.openingOwnerEquity?.[selectedYear] ?? 120000) + positiveAdjPastError;

  const capitalIntroducedDuringPeriod = transactions
    .filter((t) => t.type === 'RECEIPT' && (t.category === 'CAPITAL' || t.category === 'OWNER_CAPITAL' || t.category.toLowerCase().includes('capital')))
    .reduce((sum, t) => sum + t.amount, 0) + positiveAdjCapital;

  const ownerDrawingsDuringPeriod = householdExpenses.personalDrawings + transactions
    .filter((t) => t.type === 'PAYMENT' && (t.category === 'DRAWINGS' || t.category === 'PERSONAL_DRAWINGS' || t.category.toLowerCase().includes('drawings')))
    .reduce((sum, t) => sum + t.amount, 0);

  // closingOwnerEquity = openingOwnerEquity + capitalIntroducedDuringPeriod + profitOrLossDuringPeriod - ownerDrawingsDuringPeriod
  const closingOwnerEquity = isStockUnavailable 
    ? null 
    : (openingOwnerEquity + capitalIntroducedDuringPeriod + (netProfit ?? 0) - ownerDrawingsDuringPeriod);

  // 6. Total Incomes & Household Outflows
  const totalOtherIncome =
    otherIncome.rentalIncome +
    otherIncome.bankProfit +
    otherIncome.agriculturalIncome +
    otherIncome.capitalGain +
    otherIncome.freelanceIncome +
    otherIncome.otherIncome;

  const totalHouseholdExpenseSum =
    householdExpenses.monthlyHouseholdExpense * 12 +
    householdExpenses.schoolFee +
    householdExpenses.medical +
    householdExpenses.food +
    householdExpenses.utilityBills +
    ownerDrawingsDuringPeriod;

  const totalTaxesPaid =
    taxRecord.adjustableTax +
    taxRecord.advanceTax +
    taxRecord.psidPayments +
    taxRecord.bankWithholding +
    taxRecord.utilityWithholding +
    taxRecord.vehicleTax +
    taxRecord.propertyTax +
    taxRecord.otherTaxCertificates;

  // 7. Wealth Reconciliation Equation
  const totalIncomeForYear = isStockUnavailable ? totalOtherIncome : ((netProfit ?? 0) + totalOtherIncome);
  const netWealthInflow = totalIncomeForYear - totalHouseholdExpenseSum - totalTaxesPaid;
  const unexplainedDifference = netWorth - netWealthInflow;

  // 8. Period-Aware Business Equity Reconciliation check (netBusinessEquity - closingOwnerEquity)
  const reconciliationDifference =
    netBusinessEquity === null || closingOwnerEquity === null
      ? null
      : netBusinessEquity - closingOwnerEquity;

  const isReconciliationUnbalanced = reconciliationDifference === null || reconciliationDifference !== 0 || hasUnknownPositiveAdjustment || hasUnclassifiedLoans;

  // FBR IRIS Mappings
  const mappings: FbrMappingField[] = [
    {
      irisCode: '3000',
      fieldTitleEn: 'Gross Turnover / Retail Receipts',
      fieldTitleUr: 'کل فروخت / ریٹیل کی آمدن',
      calculatedValue: sales,
      sectionReference: 'u/s 113 / Retailer Tax',
      categoryGroup: 'INCOME',
    },
    {
      irisCode: '3100',
      fieldTitleEn: 'Purchases & Cost of Resale',
      fieldTitleUr: 'خریداری اور تجارتی خرچ',
      calculatedValue: purchases,
      sectionReference: 'Trading Account Cost',
      categoryGroup: 'EXPENSE',
    },
    {
      irisCode: '3200',
      fieldTitleEn: 'Operating Shop Expenses',
      fieldTitleUr: 'دکان کے دفتری و انتظامی اخراجات',
      calculatedValue: directExpenses,
      sectionReference: 'Section 20 Allowable Expenses',
      categoryGroup: 'EXPENSE',
    },
    {
      irisCode: '3250',
      fieldTitleEn: 'Net Business Income / Taxable Profit',
      fieldTitleUr: 'کاروباری خالص منافع',
      calculatedValue: netProfit ?? 0,
      sectionReference: 'Head of Income: Business',
      categoryGroup: 'INCOME',
    },
    {
      irisCode: '7001',
      fieldTitleEn: 'Business Capital & Stock In Hand',
      fieldTitleUr: 'کاروباری سرمایہ اور کل اسٹاک',
      calculatedValue: stockValue,
      sectionReference: 'Wealth Statement Code 7001',
      categoryGroup: 'ASSETS',
    },
    {
      irisCode: '7002',
      fieldTitleEn: 'Commercial Furniture, Machinery & Equipment',
      fieldTitleUr: 'دکان کے کمرشل اثاثے اور فرنیچر',
      calculatedValue: businessAssetValue,
      sectionReference: 'Wealth Statement Code 7002',
      categoryGroup: 'ASSETS',
    },
    {
      irisCode: '7003',
      fieldTitleEn: 'Bank Balances, Wallets & Cash in Hand',
      fieldTitleUr: 'بینک بیلنس، والٹس اور نقد رقومات',
      calculatedValue: totalCashAndBank,
      sectionReference: 'Wealth Statement Code 7003',
      categoryGroup: 'ASSETS',
    },
    {
      irisCode: '7004',
      fieldTitleEn: 'Accounts Receivable (Customer Udhaar)',
      fieldTitleUr: 'قابل وصول رقم (گاہکوں کا ادھار)',
      calculatedValue: totalReceivables,
      sectionReference: 'Wealth Statement Code 7004',
      categoryGroup: 'ASSETS',
    },
    {
      irisCode: '7005',
      fieldTitleEn: 'Personal Real Estate, House & Plots',
      fieldTitleUr: 'ذاتی گھر، پلاٹ اور جائداد',
      calculatedValue: personalAssetValue,
      sectionReference: 'Wealth Statement Code 7005',
      categoryGroup: 'ASSETS',
    },
    {
      irisCode: '7010',
      fieldTitleEn: 'Liabilities, Loans & Supplier Payables',
      fieldTitleUr: 'قرضے اور سپلائر کی واجبات',
      calculatedValue: totalLiabilities,
      sectionReference: 'Wealth Statement Code 7010',
      categoryGroup: 'LIABILITIES',
    },
    {
      irisCode: '7089',
      fieldTitleEn: 'Total Personal & Household Outflows',
      fieldTitleUr: 'کل ذاتی و گھریلو اخراجات',
      calculatedValue: totalHouseholdExpenseSum,
      sectionReference: 'Wealth Statement Code 7089',
      categoryGroup: 'WEALTH_RECON',
    },
    {
      irisCode: '9200',
      fieldTitleEn: 'Total Advance & Deducted Taxes (PSID/Bank)',
      fieldTitleUr: 'کل کٹا ہوا اور ایڈوانس ٹیکس',
      calculatedValue: totalTaxesPaid,
      sectionReference: 'Adjustable Tax Credits u/s 236/147',
      categoryGroup: 'TAX_CREDIT',
    },
  ];

  // Consistency & Missing Information Warnings
  const warnings: Array<{ en: string; ur: string; severity: 'warning' | 'info' | 'critical' }> = [];

  if (sales === 0) {
    warnings.push({
      en: 'No sales recorded yet. Ensure daily sales are logged for complete turnover reporting.',
      ur: 'کوئی سیلز درج نہیں ہے۔ سالانہ ٹرن اوور کے لیے روزانہ فروخت درج کریں۔',
      severity: 'warning',
    });
  }

  if (isStockUnavailable) {
    warnings.push({
      en: isCogsNegative ? 'Negative COGS detected. Please verify inventory opening or closing records.' : 'No stock or inventory records found. Reports are marked as Incomplete.',
      ur: isCogsNegative ? 'اسٹاک کے منفی اخراجات۔ براہ کرم اوپننگ یا کلوزنگ اسٹاک کی تصدیق کریں۔' : 'اسٹاک کا ریکارڈ نہیں ملا۔ رپورٹ نامکمل مانی جائے گی۔',
      severity: 'critical',
    });
  }

  if (totalHouseholdExpenseSum === 0) {
    warnings.push({
      en: 'Household expenses are listed as zero. FBR Wealth Statement reconciliation requires realistic household drawings.',
      ur: 'گھریلو اخراجات صفر ظاہر ہیں۔ FBR ویلتھ اسٹیٹمنٹ کی مطابقت کے لیے گھریلو خرچ درج کرنا ضروری ہے۔',
      severity: 'critical',
    });
  }

  if (isReconciliationUnbalanced) {
    const diffStr = reconciliationDifference === null ? 'N/A' : reconciliationDifference.toLocaleString();
    warnings.push({
      en: `Incomplete / Not Final — reconciliation required (Difference: Rs. ${diffStr})`,
      ur: `نامکمل / غیر حتمی — تصدیق درکار ہے (فرق: Rs. ${diffStr})`,
      severity: 'critical',
    });
  }

  if (hasUnclassifiedLoans) {
    warnings.push({
      en: 'Needs loan classification: Some loan transactions are missing linkages to dedicated loan accounts. Excluded from final reports and export blocked.',
      ur: 'قرضے کی درجہ بندی درکار ہے: کچھ قرضوں کی ٹرانزیکشنز کسی مخصوص قرضہ اکاؤنٹ سے لنک نہیں ہیں۔ فائنل رپورٹ سے خارج کر دی گئی ہیں اور ایکسپورٹ بلاک ہے۔',
      severity: 'critical',
    });
  }

  if (hasUnknownPositiveAdjustment) {
    warnings.push({
      en: 'Incomplete / Not Final — Positive stock adjustments with unknown source/policy found. Export blocked.',
      ur: 'نامکمل / غیر حتمی — نامعلوم تصحیحی ذریعہ کے مثبت اسٹاک ایڈجسٹمنٹ ملے۔ رپورٹ برآمد بلاک ہے۔',
      severity: 'critical',
    });
  }

  if (Math.abs(unexplainedDifference) > 100000) {
    warnings.push({
      en: `Wealth Statement Reconciliation gap detected (~Rs. ${Math.abs(Math.round(unexplainedDifference)).toLocaleString()}). Please verify drawings or other income.`,
      ur: `ویلتھ اسٹیٹمنٹ کی مطابقت میں فرق پایا گیا ہے (~Rs. ${Math.abs(Math.round(unexplainedDifference)).toLocaleString()})۔ براہ کرم ذاتی خرچ یا دیگر آمدن چیک کریں۔`,
      severity: 'warning',
    });
  }

  return {
    sales,
    purchases,
    directExpenses,
    recognisedOtherBusinessIncome,
    stockValue,
    estimatedCogs,
    grossProfit,
    netProfit,
    totalReceivables,
    totalPayables,
    businessAssetValue,
    totalCashAndBank,
    totalBusinessAssets,
    businessAssets: businessAssetsVal,
    businessLiabilities,
    netBusinessEquity,
    personalNetWealth,
    personalAssetValue,
    totalAssets,
    totalLiabilities,
    netWorth,
    ownerCapital: closingOwnerEquity,
    closingOwnerEquity,
    openingOwnerEquity,
    capitalIntroducedDuringPeriod,
    ownerDrawingsDuringPeriod,
    isStockDataMissing: isStockUnavailable,
    isStockUnavailable,
    totalOtherIncome,
    totalHouseholdExpenseSum,
    totalTaxesPaid,
    totalIncomeForYear,
    netWealthInflow,
    unexplainedDifference,
    reconciliationDifference,
    isReconciliationUnbalanced,
    mappings,
    warnings,
  };
}
