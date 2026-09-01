import React, { useState, useMemo } from 'react';
import { AppState, Transaction, InventoryItem, CustomerParty, SupplierParty } from '../types';
import { calculateFbrSummary } from '../utils/taxEngine';
import { formatMoney, formatDate, formatFinancialValue } from '../utils/format';
import { 
  FileBarChart2, Download, Printer, Share2, Send, Mail, FileText, Check, 
  AlertTriangle, Calendar, ChevronDown, User, Users, Box, TrendingUp, CreditCard, Copy 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AutoScrollText } from './AutoScrollText';

interface ReportsModuleProps {
  state: AppState;
  isUrdu: boolean;
}

type ReportType = 
  | 'BALANCE_SHEET'
  | 'IRIS_TAX'
  | 'SALES'
  | 'PURCHASES'
  | 'COGS'
  | 'NET_PROFIT'
  | 'EXPENSES'
  | 'LEDGER_HEAD'
  | 'CUSTOMER_STATEMENT'
  | 'SUPPLIER_STATEMENT'
  | 'STOCK_STATEMENT';

type PeriodType = 'TODAY' | 'WEEK' | 'FORTNIGHT' | 'MONTH' | 'YEAR' | 'CUSTOM';

export const ReportsModule: React.FC<ReportsModuleProps> = ({ state, isUrdu }) => {
  // Original FBR IRIS data engine
  const fbrSummary = calculateFbrSummary(state);

  // States
  const [reportType, setReportType] = useState<ReportType>('IRIS_TAX');
  const [period, setPeriod] = useState<PeriodType>('MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Sub-selectors
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedItemForStock, setSelectedItemForStock] = useState<string>('OVERALL'); // 'OVERALL' or specific itemId
  const [selectedLedgerHead, setSelectedLedgerHead] = useState<string>('CASH'); // 'CASH', 'BANK', 'EASYPAISA', 'JAZZCASH', 'ASSETS', 'LOANS', 'CAPITAL'

  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Get active lists
  const transactions = state.transactions || [];
  const inventory = state.inventory || [];
  const customers = state.customers || [];
  const suppliers = state.suppliers || [];
  const bankAccounts = state.bankAccounts || [];

  // Filter transactions by selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return transactions.filter((t) => {
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return false;

      if (period === 'TODAY') {
        return tDate >= startOfToday;
      }
      if (period === 'WEEK') {
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return tDate >= startOfWeek;
      }
      if (period === 'FORTNIGHT') {
        const startOfFortnight = new Date(startOfToday);
        startOfFortnight.setDate(startOfFortnight.getDate() - 15);
        return tDate >= startOfFortnight;
      }
      if (period === 'MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return tDate >= startOfMonth;
      }
      if (period === 'YEAR') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return tDate >= startOfYear;
      }
      if (period === 'CUSTOM') {
        if (!startDate || !endDate) return true;
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        return tDate >= s && tDate <= e;
      }
      return true;
    });
  }, [transactions, period, startDate, endDate]);

  // Report Dates description text
  const periodLabel = useMemo(() => {
    if (period === 'CUSTOM' && startDate && endDate) {
      return `${startDate} to ${endDate}`;
    }
    const mapper: Record<PeriodType, string> = {
      TODAY: isUrdu ? 'آج کا دن' : 'Today',
      WEEK: isUrdu ? 'اس ہفتے' : 'This Week',
      FORTNIGHT: isUrdu ? '15 روزہ مدت' : 'Fortnight (15 Days)',
      MONTH: isUrdu ? 'اس مہینے' : 'This Month',
      YEAR: isUrdu ? 'اس سال' : 'This Year',
      CUSTOM: isUrdu ? 'منتخب مدت' : 'Selected Period'
    };
    return mapper[period];
  }, [period, startDate, endDate, isUrdu]);

  // Dynamic calculations depending on selected report
  const reportData = useMemo(() => {
    switch (reportType) {
      case 'BALANCE_SHEET': {
        const cashBalance = bankAccounts.reduce((sum, ba) => sum + (ba.balance || 0), 0);
        const stockValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchasePrice || 0)), 0);
        const customerReceivables = customers.reduce((sum, c) => sum + (c.totalCredit || 0), 0);
        const supplierPayables = suppliers.reduce((sum, s) => sum + (s.totalPayable || 0), 0);

        const getLoanOutstanding = (loan: any) => {
          const initialAmount = loan.amount;
          const taken = transactions
            .filter(t => t.type === 'LOAN_TAKEN' && t.loanAccountId === loan.id)
            .reduce((sum, t) => sum + t.amount, 0);
          const repaid = transactions
            .filter(t => t.type === 'PAYMENT' && t.category === 'LOAN_REPAYMENT' && t.loanAccountId === loan.id)
            .reduce((sum, t) => sum + t.amount, 0);
          return initialAmount + taken - repaid;
        };

        const businessLoansValue = (state.loans || [])
          .filter(loan => loan.classification === 'BUSINESS_LOAN' || (loan.classification !== 'PERSONAL_LOAN' && loan.type !== 'PERSONAL_LOAN'))
          .reduce((sum, loan) => sum + getLoanOutstanding(loan), 0);

        const personalLoansValue = (state.loans || [])
          .filter(loan => loan.classification === 'PERSONAL_LOAN' || loan.type === 'PERSONAL_LOAN')
          .reduce((sum, loan) => sum + getLoanOutstanding(loan), 0);

        const totalBusinessAssetVal = (state.businessAssets || []).reduce((sum, a) => sum + (a.currentValue || 0), 0);
        const totalPersonalAssetVal = (state.personalAssets || []).reduce((sum, a) => sum + (a.value || 0), 0);

        return {
          cashBalance,
          stockValue,
          customerReceivables,
          supplierPayables,
          businessLoansValue,
          personalLoansValue,
          totalBusinessAssetVal,
          totalPersonalAssetVal
        };
      }
      case 'SALES': {
        const salesTxs = filteredTransactions.filter((t) => t.type === 'SALE');
        const totalAmount = salesTxs.reduce((sum, t) => sum + t.amount, 0);
        return { list: salesTxs, totalAmount };
      }
      case 'PURCHASES': {
        const purchasesTxs = filteredTransactions.filter((t) => t.type === 'PURCHASE');
        const totalAmount = purchasesTxs.reduce((sum, t) => sum + t.amount, 0);
        return { list: purchasesTxs, totalAmount };
      }
      case 'EXPENSES': {
        const expenseTxs = filteredTransactions.filter((t) => t.type === 'EXPENSE');
        const totalAmount = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
        // Group by category
        const grouped: Record<string, number> = {};
        expenseTxs.forEach((t) => {
          grouped[t.category] = (grouped[t.category] || 0) + t.amount;
        });
        return { list: expenseTxs, totalAmount, grouped };
      }
      case 'COGS': {
        // Cost of goods sold: Sum of value changes for sales
        const salesTxs = filteredTransactions.filter((t) => t.type === 'SALE');
        let estimatedCogsValue = 0;
        salesTxs.forEach((tx) => {
          if (tx.itemId) {
            const item = inventory.find((i) => i.id === tx.itemId);
            const cost = item ? item.purchasePrice : (tx.unitCost || 0);
            const qty = Math.abs(tx.qtyChange || 1);
            estimatedCogsValue += cost * qty;
          }
        });
        return { estimatedCogsValue };
      }
      case 'NET_PROFIT': {
        const salesTxs = filteredTransactions.filter((t) => t.type === 'SALE');
        const salesAmount = salesTxs.reduce((sum, t) => sum + t.amount, 0);
        const expenseAmount = filteredTransactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
        
        let estimatedCogsValue = 0;
        salesTxs.forEach((tx) => {
          if (tx.itemId) {
            const item = inventory.find((i) => i.id === tx.itemId);
            const cost = item ? item.purchasePrice : (tx.unitCost || 0);
            const qty = Math.abs(tx.qtyChange || 1);
            estimatedCogsValue += cost * qty;
          }
        });
        
        const netProfitValue = salesAmount - estimatedCogsValue - expenseAmount;
        return { salesAmount, estimatedCogsValue, expenseAmount, netProfitValue };
      }
      case 'LEDGER_HEAD': {
        let list: Transaction[] = [];
        let label = '';
        if (selectedLedgerHead === 'CASH') {
          list = filteredTransactions.filter((t) => t.paymentMethod === 'CASH');
          label = isUrdu ? 'کیش رجسٹر' : 'Cash Register';
        } else if (['BANK', 'EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(selectedLedgerHead)) {
          list = filteredTransactions.filter((t) => t.paymentMethod === selectedLedgerHead);
          label = selectedLedgerHead;
        } else if (selectedLedgerHead === 'ASSETS') {
          list = filteredTransactions.filter((t) => t.type === 'LOAN_GIVEN' || t.totalValueChange !== undefined);
          label = isUrdu ? 'کاروباری اثاثہ جات' : 'Business Assets';
        } else if (selectedLedgerHead === 'LOANS') {
          list = filteredTransactions.filter((t) => t.type === 'LOAN_TAKEN' || t.type === 'LOAN_GIVEN');
          label = isUrdu ? 'قرضے و واجبات' : 'Loans & Liabilities';
        } else {
          list = filteredTransactions;
          label = isUrdu ? 'عام لیجر' : 'General Ledger';
        }
        
        const inflows = list.filter((t) => ['SALE', 'RECEIPT', 'LOAN_TAKEN'].includes(t.type));
        const outflows = list.filter((t) => ['PURCHASE', 'EXPENSE', 'PAYMENT', 'LOAN_GIVEN'].includes(t.type));
        const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
        const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);
        return { list, label, totalInflow, totalOutflow };
      }
      case 'CUSTOMER_STATEMENT': {
        const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
        if (!customer) return { list: [], customer: null, totalSales: 0, totalReceipts: 0 };
        // Filter transactions for this customer
        const list = filteredTransactions.filter(
          (t) => t.partyName?.trim().toLowerCase() === customer.name.trim().toLowerCase()
        );
        const totalSales = list.filter((t) => t.type === 'SALE').reduce((sum, t) => sum + t.amount, 0);
        const totalReceipts = list.filter((t) => t.type === 'RECEIPT' || (t.type === 'SALE' && t.paymentMethod !== 'CREDIT')).reduce((sum, t) => sum + t.amount, 0);
        return { list, customer, totalSales, totalReceipts };
      }
      case 'SUPPLIER_STATEMENT': {
        const supplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
        if (!supplier) return { list: [], supplier: null, totalPurchases: 0, totalPayments: 0 };
        // Filter transactions for this supplier
        const list = filteredTransactions.filter(
          (t) => t.partyName?.trim().toLowerCase() === supplier.name.trim().toLowerCase()
        );
        const totalPurchases = list.filter((t) => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0);
        const totalPayments = list.filter((t) => t.type === 'PAYMENT' || (t.type === 'PURCHASE' && t.paymentMethod !== 'CREDIT')).reduce((sum, t) => sum + t.amount, 0);
        return { list, supplier, totalPurchases, totalPayments };
      }
      case 'STOCK_STATEMENT': {
        if (selectedItemForStock === 'OVERALL') {
          // Overall valuation
          const totalCostValue = inventory.reduce((sum, i) => sum + (i.quantity * i.purchasePrice), 0);
          const totalSaleValue = inventory.reduce((sum, i) => sum + (i.quantity * i.salePrice), 0);
          return { items: inventory, totalCostValue, totalSaleValue };
        } else {
          // Item wise movement
          const item = inventory.find((i) => i.id === selectedItemForStock);
          if (!item) return { movements: [], item: null };
          const movements = filteredTransactions.filter((t) => t.itemId === item.id);
          return { movements, item };
        }
      }
      default:
        return {};
    }
  }, [reportType, filteredTransactions, selectedCustomerId, selectedSupplierId, selectedItemForStock, selectedLedgerHead, customers, suppliers, inventory, isUrdu]);

  // Format Helper
  const formatHeading = () => {
    switch (reportType) {
      case 'BALANCE_SHEET': return isUrdu ? 'بیلنس شیٹ (توازنِ مال رپورٹ)' : 'Shopkeeper’s Balance Sheet Report';
      case 'IRIS_TAX': return isUrdu ? 'ایف بی آر انکم ٹیکس خلاصہ' : 'FBR Income Tax Summary';
      case 'SALES': return isUrdu ? 'تفصیلی فروخت کی رپورٹ' : 'Sales Revenue Ledger';
      case 'PURCHASES': return isUrdu ? 'تفصیلی خریداری کی رپورٹ' : 'Purchases Ledger';
      case 'EXPENSES': return isUrdu ? 'اخراجات کی تفصیلی رپورٹ' : 'Operating Expenses Ledger';
      case 'COGS': return isUrdu ? 'سٹاک لاگت رپورٹ' : 'Cost of Goods Sold (COGS) Statement';
      case 'NET_PROFIT': return isUrdu ? 'خالص منافع اور نقصان کا کھاتہ' : 'Net Profit & Loss Statement';
      case 'LEDGER_HEAD': return `${isUrdu ? 'کھاتہ لیجر' : 'Ledger Account'} - ${reportData.label || ''}`;
      case 'CUSTOMER_STATEMENT': return `${isUrdu ? 'گاہک اسٹیٹمنٹ' : 'Customer Account'} - ${reportData.customer?.name || ''}`;
      case 'SUPPLIER_STATEMENT': return `${isUrdu ? 'سپلائر اسٹیٹمنٹ' : 'Supplier Account'} - ${reportData.supplier?.name || ''}`;
      case 'STOCK_STATEMENT': return selectedItemForStock === 'OVERALL' 
        ? (isUrdu ? 'دکان کا کل اسٹاک اور ویلیو ایشن' : 'Overall Store Inventory Valuation') 
        : `${isUrdu ? 'اسٹاک ہسٹری لاگ' : 'Stock Log'} - ${reportData.item?.name || ''}`;
      default: return '';
    }
  };

  // True Direct PDF Doc Generator using jsPDF
  const generatePdfDoc = (): jsPDF => {
    const doc = new jsPDF();
    let y = 15;

    // Premium Emerald Top Line
    doc.setFillColor(18, 106, 73); 
    doc.rect(0, 0, 210, 8, 'F');
    
    // Header Info
    y = 20;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(17, 24, 39);
    doc.text(state.profile.shopName || 'Bismillah Store', 15, y);
    
    y += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNIC: ${state.profile.cnic || 'N/A'}  |  NTN: ${state.profile.ntn || 'N/A'}  |  Phone: ${state.profile.phone || 'N/A'}`, 15, y);
    
    y += 8;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(18, 106, 73);
    doc.text(formatHeading(), 15, y);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date/Period: ${periodLabel}  |  Generated: ${new Date().toLocaleString('en-PK')}`, 15, y + 4.5);

    y += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 195, y);
    y += 8;

    // Define columns and rows based on active report
    let headers: string[] = [];
    let rows: string[][] = [];
    let footerRows: string[][] = [];

    if (reportType === 'BALANCE_SHEET') {
      headers = ['Accounting Category (Balance Sheet Ledger)', 'Assets (PKR)', 'Liabilities & Equity (PKR)'];
      const assetsSum = (reportData.cashBalance || 0) + (reportData.stockValue || 0) + (reportData.customerReceivables || 0) + (reportData.totalBusinessAssetVal || 0) + (reportData.totalPersonalAssetVal || 0);
      const liabSum = (reportData.supplierPayables || 0) + (reportData.businessLoansValue || 0) + (reportData.personalLoansValue || 0);
      const netCap = assetsSum - liabSum;

      rows = [
        ['Cash & Bank Balance (Current Asset)', formatMoney(reportData.cashBalance || 0), '-'],
        ['Stock / Inventory Valuation (Current Asset)', formatMoney(reportData.stockValue || 0), '-'],
        ['Udhaar Receivables (Current Asset)', formatMoney(reportData.customerReceivables || 0), '-'],
        ['Fixed Shop assets & Fixtures', formatMoney(reportData.totalBusinessAssetVal || 0), '-'],
        ['Personal Non-Business Property', formatMoney(reportData.totalPersonalAssetVal || 0), '-'],
        ['Supplier Khata Payables (Liabilities)', '-', formatMoney(reportData.supplierPayables || 0)],
        ['Outstanding Business Loans (Liabilities)', '-', formatMoney(reportData.businessLoansValue || 0)],
        ['Outstanding Personal Loans (Liabilities)', '-', formatMoney(reportData.personalLoansValue || 0)],
        ['Owner’s Net Capital (Wealth / Equity)', '-', formatMoney(netCap)]
      ];

      footerRows = [
        ['TOTAL EQUILIBRIUM', formatMoney(assetsSum), formatMoney(liabSum + netCap)]
      ];
    }
    else if (reportType === 'IRIS_TAX') {
      headers = ['FBR IRIS Code', 'FBR Head Description', 'Amount (PKR)'];
      rows = fbrSummary.mappings.map(m => [`Code ${m.irisCode}`, m.fieldTitleEn, formatMoney(m.calculatedValue)]);
      footerRows = [
        ['', 'Estimated Net Worth (FBR Wealth Reconciliation)', formatMoney(fbrSummary.netWorth)]
      ];
    } 
    else if (reportType === 'SALES' || reportType === 'PURCHASES') {
      headers = ['Date', 'Invoice No', 'Party Name', 'Pay Method', 'Amount (PKR)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => [
        formatDate(t.date),
        t.invoiceNo || 'N/A',
        t.partyName || 'Counter Sale/Cash',
        t.paymentMethod,
        formatMoney(t.amount)
      ]);
      footerRows = [
        ['', '', '', 'Total Sum:', formatMoney(reportData.totalAmount || 0)]
      ];
    }
    else if (reportType === 'EXPENSES') {
      headers = ['Date', 'Expense Category', 'Paid Via', 'Description/Notes', 'Amount (PKR)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => [
        formatDate(t.date),
        String(t.category).replace('_', ' '),
        t.paymentMethod,
        t.notes || '-',
        formatMoney(t.amount)
      ]);
      footerRows = [
        ['', '', '', 'Total Expenses:', formatMoney(reportData.totalAmount || 0)]
      ];
    }
    else if (reportType === 'COGS') {
      headers = ['Valuation Metric', 'Calculated Amount (PKR)'];
      rows = [
        ['Business Turnover (Gross Sales)', formatMoney(fbrSummary.sales)],
        ['Estimated Stock Purchases', formatMoney((fbrSummary.estimatedCogs || 0) + 50000)],
        ['Cost of Goods Sold (COGS)', formatMoney(reportData.estimatedCogsValue || 0)]
      ];
    }
    else if (reportType === 'NET_PROFIT') {
      headers = ['Income & Loss Statement Metric', 'Amount (PKR)'];
      rows = [
        ['Gross Sales Revenue (+)', formatMoney(reportData.salesAmount || 0)],
        ['Cost of Goods Sold (COGS) (-)', formatMoney(reportData.estimatedCogsValue || 0)],
        ['Allowable Business Expenses (-)', formatMoney(reportData.expenseAmount || 0)],
        ['Net Taxable Profit', formatMoney(reportData.netProfitValue || 0)]
      ];
    }
    else if (reportType === 'LEDGER_HEAD') {
      headers = ['Date', 'Type', 'Description', 'Method', 'Inflow (+)', 'Outflow (-)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => {
        const isIn = ['SALE', 'RECEIPT', 'LOAN_TAKEN'].includes(t.type);
        return [
          formatDate(t.date),
          t.type,
          t.notes || t.category || '-',
          t.paymentMethod,
          isIn ? formatMoney(t.amount) : '-',
          !isIn ? formatMoney(t.amount) : '-'
        ];
      });
      footerRows = [
        ['', '', 'Total Summaries', '', `+${formatMoney(reportData.totalInflow || 0)}`, `-${formatMoney(reportData.totalOutflow || 0)}`]
      ];
    }
    else if (reportType === 'CUSTOMER_STATEMENT' || reportType === 'SUPPLIER_STATEMENT') {
      headers = ['Date', 'Type', 'Description/Notes', 'Method', 'Inflow (+)', 'Outflow (-)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => {
        const isIn = t.type === 'SALE' || t.type === 'RECEIPT';
        return [
          formatDate(t.date),
          t.type,
          t.notes || '-',
          t.paymentMethod,
          isIn ? formatMoney(t.amount) : '-',
          !isIn ? formatMoney(t.amount) : '-'
        ];
      });
      const balLabel = reportType === 'CUSTOMER_STATEMENT' ? 'Outstanding Udhaar Balance:' : 'Outstanding Payable Balance:';
      const balVal = reportType === 'CUSTOMER_STATEMENT' ? (reportData.customer?.totalCredit || 0) : (reportData.supplier?.totalPayable || 0);
      footerRows = [
        ['', '', balLabel, '', '', formatMoney(balVal)]
      ];
    }
    else if (reportType === 'STOCK_STATEMENT') {
      if (selectedItemForStock === 'OVERALL') {
        headers = ['Item Name', 'Category', 'Quantity In Store', 'Unit', 'Purchase Cost', 'Sale Price'];
        const items = (reportData.items || []) as InventoryItem[];
        rows = items.map(i => [
          i.name,
          i.category,
          String(i.quantity),
          i.unit,
          formatMoney(i.purchasePrice),
          formatMoney(i.salePrice)
        ]);
        footerRows = [
          ['', 'Total Inventory Cost Valuation:', formatMoney(reportData.totalCostValue || 0), '', 'Total Potential Sale Value:', formatMoney(reportData.totalSaleValue || 0)]
        ];
      } else {
        headers = ['Date', 'Type', 'Qty Adjustment', 'Unit Cost', 'Reason/Notes'];
        const movements = (reportData.movements || []) as Transaction[];
        rows = movements.map(m => [
          formatDate(m.date),
          m.type,
          String(m.qtyChange || 0),
          formatMoney(m.unitCost || 0),
          m.notes || m.adjustmentReason || '-'
        ]);
        footerRows = [
          ['', 'Current Stock Quantity:', String(reportData.item?.quantity || 0), 'Current Valuation:', formatMoney((reportData.item?.quantity || 0) * (reportData.item?.purchasePrice || 0))]
        ];
      }
    }

    // Drawing Table in PDF
    doc.setFontSize(8);
    const colCount = headers.length;
    const tableWidth = 180;
    const colWidth = tableWidth / colCount;

    // Header Background
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, tableWidth, 7, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    headers.forEach((h, idx) => {
      doc.text(h, 17 + (idx * colWidth), y + 4.5);
    });
    
    y += 7;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    rows.forEach((row, rIdx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, tableWidth, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        headers.forEach((h, idx) => {
          doc.text(h, 17 + (idx * colWidth), y + 4.5);
        });
        y += 7;
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
      }

      if (rIdx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, tableWidth, 6, 'F');
      }

      row.forEach((cell, cIdx) => {
        let text = String(cell);
        if (text.length > 25) text = text.substring(0, 22) + '...';
        doc.text(text, 17 + (cIdx * colWidth), y + 4);
      });

      doc.setDrawColor(241, 245, 249);
      doc.line(15, y + 6, 195, y + 6);
      y += 6;
    });

    if (footerRows && footerRows.length > 0) {
      footerRows.forEach(fRow => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y, tableWidth, 7, 'F');
        doc.setFont('Helvetica', 'bold');
        fRow.forEach((cell, cIdx) => {
          doc.text(String(cell), 17 + (cIdx * colWidth), y + 4.5);
        });
        y += 7;
      });
    }

    // Signature
    y += 15;
    if (y > 270) {
      doc.addPage();
      y = 30;
    }
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y, 75, y);
    doc.line(135, y, 195, y);
    
    y += 4;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Merchant Signature', 25, y);
    doc.text('Accountant Verification', 145, y);

    return doc;
  };

  // True Direct PDF Downloader using jsPDF (Saves directly, does not trigger physical printer)
  const downloadPdfFile = () => {
    const doc = generatePdfDoc();
    const filename = `${reportType}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    setDownloadSuccess(isUrdu ? 'رپورٹ پی ڈی ایف فائل کامیابی سے ڈاؤن لوڈ ہو گئی!' : 'PDF Report file downloaded successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Proper formatted Excel download with matching spreadsheet headers and gridlines
  const downloadExcelFile = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let footerRows: string[][] = [];

    if (reportType === 'BALANCE_SHEET') {
      headers = ['Accounting Category (Balance Sheet Ledger)', 'Assets (PKR)', 'Liabilities & Equity (PKR)'];
      const assetsSum = (reportData.cashBalance || 0) + (reportData.stockValue || 0) + (reportData.customerReceivables || 0) + (reportData.totalBusinessAssetVal || 0) + (reportData.totalPersonalAssetVal || 0);
      const liabSum = (reportData.supplierPayables || 0) + (reportData.businessLoansValue || 0) + (reportData.personalLoansValue || 0);
      const netCap = assetsSum - liabSum;

      rows = [
        ['Cash & Bank Balance (Current Asset)', String(reportData.cashBalance || 0), '0'],
        ['Stock / Inventory Valuation (Current Asset)', String(reportData.stockValue || 0), '0'],
        ['Udhaar Receivables (Current Asset)', String(reportData.customerReceivables || 0), '0'],
        ['Fixed Shop assets & Fixtures', String(reportData.totalBusinessAssetVal || 0), '0'],
        ['Personal Non-Business Property', String(reportData.totalPersonalAssetVal || 0), '0'],
        ['Supplier Khata Payables (Liabilities)', '0', String(reportData.supplierPayables || 0)],
        ['Outstanding Business Loans (Liabilities)', '0', String(reportData.businessLoansValue || 0)],
        ['Outstanding Personal Loans (Liabilities)', '0', String(reportData.personalLoansValue || 0)],
        ['Owner’s Net Capital (Wealth / Equity)', '0', String(netCap)]
      ];

      footerRows = [['TOTAL EQUILIBRIUM:', String(assetsSum), String(liabSum + netCap)]];
    }
    else if (reportType === 'IRIS_TAX') {
      headers = ['FBR IRIS Code', 'FBR Head Description', 'Amount (PKR)'];
      rows = fbrSummary.mappings.map(m => [`Code ${m.irisCode}`, m.fieldTitleEn, String(m.calculatedValue)]);
      footerRows = [['', 'Estimated Net Worth (FBR Wealth Reconciliation)', String(fbrSummary.netWorth)]];
    }
    else if (reportType === 'SALES' || reportType === 'PURCHASES') {
      headers = ['Date', 'Invoice No', 'Party Name', 'Payment Method', 'Amount (PKR)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => [formatDate(t.date), t.invoiceNo || 'N/A', t.partyName || 'Counter Sale/Cash', t.paymentMethod, String(t.amount)]);
      footerRows = [['', '', '', 'Total Sum:', String(reportData.totalAmount || 0)]];
    }
    else if (reportType === 'EXPENSES') {
      headers = ['Date', 'Category', 'Paid Via', 'Description/Notes', 'Amount (PKR)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => [formatDate(t.date), String(t.category).replace('_', ' '), t.paymentMethod, t.notes || '-', String(t.amount)]);
      footerRows = [['', '', '', 'Total Expenses:', String(reportData.totalAmount || 0)]];
    }
    else if (reportType === 'COGS') {
      headers = ['Valuation Metric', 'Calculated Amount (PKR)'];
      rows = [
        ['Business Turnover (Gross Sales)', String(fbrSummary.sales)],
        ['Estimated Stock Purchases', String((fbrSummary.estimatedCogs || 0) + 50000)],
        ['Cost of Goods Sold (COGS)', String(reportData.estimatedCogsValue || 0)]
      ];
    }
    else if (reportType === 'NET_PROFIT') {
      headers = ['Income & Loss Statement Metric', 'Amount (PKR)'];
      rows = [
        ['Gross Sales Revenue (+)', String(reportData.salesAmount || 0)],
        ['Cost of Goods Sold (COGS) (-)', String(reportData.estimatedCogsValue || 0)],
        ['Allowable Business Expenses (-)', String(reportData.expenseAmount || 0)],
        ['Net Taxable Profit', String(reportData.netProfitValue || 0)]
      ];
    }
    else if (reportType === 'LEDGER_HEAD') {
      headers = ['Date', 'Type', 'Description', 'Method', 'Inflow (+)', 'Outflow (-)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => {
        const isIn = ['SALE', 'RECEIPT', 'LOAN_TAKEN'].includes(t.type);
        return [
          formatDate(t.date),
          t.type,
          t.notes || t.category || '-',
          t.paymentMethod,
          isIn ? String(t.amount) : '-',
          !isIn ? String(t.amount) : '-'
        ];
      });
      footerRows = [['', '', 'Total Summaries', '', `+${reportData.totalInflow || 0}`, `-${reportData.totalOutflow || 0}`]];
    }
    else if (reportType === 'CUSTOMER_STATEMENT' || reportType === 'SUPPLIER_STATEMENT') {
      headers = ['Date', 'Type', 'Description/Notes', 'Method', 'Inflow (+)', 'Outflow (-)'];
      const list = (reportData.list || []) as Transaction[];
      rows = list.map(t => {
        const isIn = t.type === 'SALE' || t.type === 'RECEIPT';
        return [
          formatDate(t.date),
          t.type,
          t.notes || '-',
          t.paymentMethod,
          isIn ? String(t.amount) : '-',
          !isIn ? String(t.amount) : '-'
        ];
      });
      const balLabel = reportType === 'CUSTOMER_STATEMENT' ? 'Outstanding Udhaar Balance:' : 'Outstanding Payable Balance:';
      const balVal = reportType === 'CUSTOMER_STATEMENT' ? (reportData.customer?.totalCredit || 0) : (reportData.supplier?.totalPayable || 0);
      footerRows = [['', '', balLabel, '', '', String(balVal)]];
    }
    else if (reportType === 'STOCK_STATEMENT') {
      if (selectedItemForStock === 'OVERALL') {
        headers = ['Item Name', 'Category', 'Quantity In Store', 'Unit', 'Purchase Cost', 'Sale Price'];
        const items = (reportData.items || []) as InventoryItem[];
        rows = items.map(i => [i.name, i.category, String(i.quantity), i.unit, String(i.purchasePrice), String(i.salePrice)]);
        footerRows = [['', 'Total Inventory Cost:', String(reportData.totalCostValue || 0), '', 'Total Potential Sale Value:', String(reportData.totalSaleValue || 0)]];
      } else {
        headers = ['Date', 'Type', 'Qty Adjustment', 'Unit Cost', 'Reason/Notes'];
        const movements = (reportData.movements || []) as Transaction[];
        rows = movements.map(m => [formatDate(m.date), m.type, String(m.qtyChange || 0), String(m.unitCost || 0), m.notes || m.adjustmentReason || '-']);
        footerRows = [['', 'Current Quantity:', String(reportData.item?.quantity || 0), 'Valuation:', String((reportData.item?.quantity || 0) * (reportData.item?.purchasePrice || 0))]];
      }
    }

    // HTML styled table for native Excel styling & gridlines support
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${reportType}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; margin-top: 15px; }
          th { background-color: #126A49; color: white; font-weight: bold; border: 1px solid #ccc; padding: 8px; text-align: left; }
          td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .bg-gray { background-color: #f3f4f6; }
          .title { font-size: 18px; font-weight: bold; color: #111827; }
          .subtitle { font-size: 11px; color: #4b5563; }
        </style>
      </head>
      <body>
        <div class="title">${state.profile.shopName || 'Bismillah Store'}</div>
        <div class="subtitle">Report: ${formatHeading()} | Period: ${periodLabel} | Generated on: ${new Date().toLocaleDateString('en-PK')}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, rIdx) => `
              <tr class="${rIdx % 2 === 1 ? 'bg-gray' : ''}">
                ${r.map(cell => {
                  const isNumeric = !isNaN(Number(cell)) && cell !== '' && cell !== '-';
                  return `<td class="${isNumeric ? 'text-right' : ''}">${cell}</td>`;
                }).join('')}
              </tr>
            `).join('')}
            ${footerRows.map(fRow => `
              <tr class="bg-gray font-bold">
                ${fRow.map(cell => {
                  const isNumeric = !isNaN(Number(cell)) && cell !== '' && cell !== '-';
                  return `<td class="font-bold ${isNumeric ? 'text-right' : ''}">${cell}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportType}_Report_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(isUrdu ? 'ایکسل فائل کامیابی سے ڈاؤن لوڈ ہو گئی!' : 'Excel Spreadsheet file downloaded successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Compile detailed text report summary
  const generateShareSummaryText = () => {
    let text = `*${state.profile.shopName || 'Bismillah Store'} - ${formatHeading()}*\n`;
    text += `📅 *Period:* ${periodLabel}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (reportType === 'BALANCE_SHEET') {
      const assetsSum = (reportData.cashBalance || 0) + (reportData.stockValue || 0) + (reportData.customerReceivables || 0) + (reportData.totalBusinessAssetVal || 0) + (reportData.totalPersonalAssetVal || 0);
      const liabSum = (reportData.supplierPayables || 0) + (reportData.businessLoansValue || 0) + (reportData.personalLoansValue || 0);
      const netCap = assetsSum - liabSum;

      text += `🏛️ *BALANCE SHEET SUMMARY*\n`;
      text += `🟢 *Total Assets:* ${formatMoney(assetsSum)}\n`;
      text += `   - Cash/Bank Balance: ${formatMoney(reportData.cashBalance || 0)}\n`;
      text += `   - Stock Inventory Value: ${formatMoney(reportData.stockValue || 0)}\n`;
      text += `   - Udhaar Receivables: ${formatMoney(reportData.customerReceivables || 0)}\n`;
      text += `   - Business Fixed Assets: ${formatMoney(reportData.totalBusinessAssetVal || 0)}\n`;
      if ((reportData.totalPersonalAssetVal || 0) > 0) {
        text += `   - Personal Assets: ${formatMoney(reportData.totalPersonalAssetVal || 0)}\n`;
      }
      text += `\n🔴 *Total Liabilities:* ${formatMoney(liabSum)}\n`;
      text += `   - Supplier Payables: ${formatMoney(reportData.supplierPayables || 0)}\n`;
      text += `   - Business Loans: ${formatMoney(reportData.businessLoansValue || 0)}\n`;
      if ((reportData.personalLoansValue || 0) > 0) {
        text += `   - Personal Loans: ${formatMoney(reportData.personalLoansValue || 0)}\n`;
      }
      text += `\n🔵 *Owner Net Worth:* ${formatMoney(netCap)}\n`;
    }
    else if (reportType === 'IRIS_TAX') {
      text += `• Turnover (Sales): ${formatMoney(fbrSummary.sales)}\n`;
      text += `• Net Wealth Summary: ${formatMoney(fbrSummary.netWorth)}\n`;
      text += `• Unexplained Diff: ${formatMoney(fbrSummary.reconciliationDifference || 0)}\n`;
    } 
    else if (reportType === 'SALES' || reportType === 'PURCHASES') {
      text += `📊 *Total Amount:* ${formatMoney(reportData.totalAmount || 0)}\n`;
      text += `🧾 *Transaction Count:* ${(reportData.list || []).length}\n`;
    }
    else if (reportType === 'EXPENSES') {
      text += `💸 *Total Expense Sum:* ${formatMoney(reportData.totalAmount || 0)}\n`;
    }
    else if (reportType === 'COGS') {
      text += `📦 *Cost of Goods Sold:* ${formatMoney(reportData.estimatedCogsValue || 0)}\n`;
    }
    else if (reportType === 'NET_PROFIT') {
      text += `💰 *Gross Revenue:* ${formatMoney(reportData.salesAmount || 0)}\n`;
      text += `📦 *Stock COGS Cost:* ${formatMoney(reportData.estimatedCogsValue || 0)}\n`;
      text += `💸 *Expenses:* ${formatMoney(reportData.expenseAmount || 0)}\n`;
      text += `✅ *Net Taxable Profit:* ${formatMoney(reportData.netProfitValue || 0)}\n`;
    }
    else if (reportType === 'LEDGER_HEAD') {
      text += `📥 *Inflows (+):* ${formatMoney(reportData.totalInflow || 0)}\n`;
      text += `📤 *Outflows (-):* ${formatMoney(reportData.totalOutflow || 0)}\n`;
    }
    else if (reportType === 'CUSTOMER_STATEMENT') {
      text += `👤 *Customer Name:* ${reportData.customer?.name || 'N/A'}\n`;
      text += `📊 *Total Credit Given:* ${formatMoney(reportData.totalSales || 0)}\n`;
      text += `💵 *Total Received:* ${formatMoney(reportData.totalReceipts || 0)}\n`;
      text += `🔴 *Outstanding Udhaar:* ${formatMoney(reportData.customer?.totalCredit || 0)}\n`;
    }
    else if (reportType === 'SUPPLIER_STATEMENT') {
      text += `👤 *Supplier Name:* ${reportData.supplier?.name || 'N/A'}\n`;
      text += `📦 *Total Purchased:* ${formatMoney(reportData.totalPurchases || 0)}\n`;
      text += `💵 *Total Paid:* ${formatMoney(reportData.totalPayments || 0)}\n`;
      text += `🔴 *Outstanding Payable:* ${formatMoney(reportData.supplier?.totalPayable || 0)}\n`;
    }
    else if (reportType === 'STOCK_STATEMENT') {
      if (selectedItemForStock === 'OVERALL') {
        text += `📦 *Total Inventory Cost:* ${formatMoney(reportData.totalCostValue || 0)}\n`;
        text += `💰 *Potential Sale Value:* ${formatMoney(reportData.totalSaleValue || 0)}\n`;
      } else {
        text += `📦 *Item:* ${reportData.item?.name || 'N/A'}\n`;
        text += `📊 *Current Qty:* ${reportData.item?.quantity || 0} ${reportData.item?.unit || ''}\n`;
        text += `💰 *Total Valuation:* ${formatMoney((reportData.item?.quantity || 0) * (reportData.item?.purchasePrice || 0))}\n`;
      }
    }

    text += `\n_Generated via My Shop Manager Mobile App_`;
    return text;
  };

  // Direct WhatsApp Share (with proper PDF file attachment where supported, otherwise direct message fallback)
  const handleWhatsAppShare = async () => {
    const textToShare = generateShareSummaryText();
    const doc = generatePdfDoc();
    const blob = doc.output('blob');
    const filename = `${reportType}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Check if system Web Share API supports file sharing
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${state.profile.shopName || 'Shop'} Accountant Report`,
          text: textToShare,
        });
        return;
      } catch (err) {
        // Fall back below if aborted
      }
    }

    // Direct WhatsApp Web / App API Fallback with pre-formatted summary text
    const encodedText = encodeURIComponent(textToShare);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  // Direct Email Share (with proper PDF file attachment where supported, otherwise mailto fallback)
  const handleEmailShare = async () => {
    const textToShare = generateShareSummaryText();
    const doc = generatePdfDoc();
    const blob = doc.output('blob');
    const filename = `${reportType}_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Try native Web Share attachment
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${state.profile.shopName || 'Shop'} Accountant Report`,
          text: textToShare,
        });
        return;
      } catch (err) {
        // Fall back below
      }
    }

    // Standard Mailto client fallback
    const subject = encodeURIComponent(`${state.profile.shopName || 'Shop'} Accountant Report - ${formatHeading()}`);
    const body = encodeURIComponent(textToShare);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const copyToClipboardBackup = () => {
    navigator.clipboard.writeText(generateShareSummaryText());
    setDownloadSuccess(isUrdu ? 'رپورٹ ٹیکسٹ کاپی ہو گیا! اب آپ واٹس ایپ پر پیسٹ کر سکتے ہیں۔' : 'Report summary copied! You can now paste it directly into WhatsApp.');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 pb-20 print:p-0 print:m-0">
      
      {/* 1. Header with Simple Bold One-Liner Layout & Subtle Premium Light Gradient Background */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 border border-emerald-100/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="w-full sm:w-auto min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <FileBarChart2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="flex-1 min-w-0"
              className="text-sm font-bold text-slate-900"
            >
              {isUrdu ? 'اکاؤنٹنٹ رپورٹس اور ایکسپورٹ پورٹل' : 'Accountant Reports & Export Portal'}
            </AutoScrollText>
          </div>
          <AutoScrollText
            isUrdu={isUrdu}
            containerClassName="max-w-full mt-0.5"
            className="text-[11px] text-slate-500 font-medium"
          >
            {isUrdu 
              ? 'ٹیکس وکیل، سپلائر، گاہک اور اسٹاک کی تفصیلی پی ڈی ایف اور ایکسل رپورٹس حاصل کریں' 
              : 'Download professional tax sheets, customer, supplier, and inventory statement files.'}
          </AutoScrollText>
        </div>

        {/* Export Buttons - Left Edge aligned for PDF and Right Edge aligned for Excel */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3 shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0">
          <button
            type="button"
            onClick={downloadPdfFile}
            className={`h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer justify-center flex-1 sm:flex-initial min-w-0 overflow-hidden ${isUrdu ? 'px-5 text-[13px]' : 'px-3.5 text-xs'}`}
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
              {isUrdu ? 'ڈاؤن لوڈ پی ڈی ایف (PDF)' : 'Download PDF'}
            </AutoScrollText>
          </button>

          <button
            type="button"
            onClick={downloadExcelFile}
            className={`h-10 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer justify-center flex-1 sm:flex-initial min-w-0 overflow-hidden ${isUrdu ? 'px-5 text-[13px]' : 'px-3.5 text-xs'}`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
              {isUrdu ? 'ایکسل فائل (Excel)' : 'Export Excel'}
            </AutoScrollText>
          </button>
        </div>
      </div>

      {/* Success Notification Bar */}
      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-900 font-bold text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Quick Action Shares - Split into distinct premium looking buttons */}
      <div className="grid grid-cols-3 gap-2 print:hidden">
        <button
          onClick={handleWhatsAppShare}
          className="p-3 bg-[#e8f5e9] hover:bg-[#c8e6c9] rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2 text-[#2e7d32] font-bold text-xs transition-all active:scale-95 cursor-pointer min-w-0 overflow-hidden"
        >
          <Send className="w-4 h-4 shrink-0" />
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
            {isUrdu ? 'واٹس ایپ شیئر' : 'WhatsApp Share'}
          </AutoScrollText>
        </button>

        <button
          onClick={handleEmailShare}
          className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2 text-blue-800 font-bold text-xs transition-all active:scale-95 cursor-pointer min-w-0 overflow-hidden"
        >
          <Mail className="w-4 h-4 text-blue-600 shrink-0" />
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
            {isUrdu ? 'ای میل اکاؤنٹنٹ' : 'Email Share'}
          </AutoScrollText>
        </button>

        <button
          onClick={copyToClipboardBackup}
          className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-2 text-slate-800 font-bold text-xs transition-all active:scale-95 cursor-pointer min-w-0 overflow-hidden"
        >
          <Copy className="w-4 h-4 text-emerald-600 shrink-0" />
          <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
            {isUrdu ? 'ٹیکسٹ کاپی کریں' : 'Copy Report Text'}
          </AutoScrollText>
        </button>
      </div>

      {/* Interactive Report Config Cockpit Dashboard */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-4 print:hidden">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>{isUrdu ? 'رپورٹ اور فلٹرز کا انتخاب کریں:' : 'Select Active Report & Period Filters:'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* A. Report Type Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              {isUrdu ? 'رپورٹ کی قسم:' : 'Report Category:'}
            </label>
            <div className="relative">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 appearance-none focus:outline-none focus:border-emerald-600"
              >
                <option value="BALANCE_SHEET">{isUrdu ? 'بیلنس شیٹ (Balance Sheet)' : 'Shopkeeper’s Balance Sheet'}</option>
                <option value="IRIS_TAX">{isUrdu ? 'FBR انکم ٹیکس و ویلتھ خلاصہ' : 'FBR Tax & Wealth Summary (IRIS)'}</option>
                <option value="SALES">{isUrdu ? 'سیلز رپورٹ (Sales Statement)' : 'Sales Revenue Ledger'}</option>
                <option value="PURCHASES">{isUrdu ? 'خریداری رپورٹ (Purchases Statement)' : 'Purchases Ledger'}</option>
                <option value="COGS">{isUrdu ? 'سٹاک لاگت رپورٹ (COGS)' : 'Cost of Goods Sold (COGS)'}</option>
                <option value="NET_PROFIT">{isUrdu ? 'خالص منافع رپورٹ (Profit & Loss)' : 'Net Profit & Loss Statement'}</option>
                <option value="EXPENSES">{isUrdu ? 'اخراجات رپورٹ (Expenses)' : 'Operating Expenses Ledger'}</option>
                <option value="LEDGER_HEAD">{isUrdu ? 'کھاتہ اور جنرل لیجر (Account Heads)' : 'Ledger by Account Head'}</option>
                <option value="CUSTOMER_STATEMENT">{isUrdu ? 'گاہک کا تفصیلی کھاتہ (Customer Ledger)' : 'Customer Statement'}</option>
                <option value="SUPPLIER_STATEMENT">{isUrdu ? 'سپلائر کا تفصیلی کھاتہ (Supplier Ledger)' : 'Supplier Statement'}</option>
                <option value="STOCK_STATEMENT">{isUrdu ? 'انوینٹری اور اسٹاک رپورٹ (Stock)' : 'Stock & Inventory Statement'}</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* B. Period Selection */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              {isUrdu ? 'ٹائم پیریڈ:' : 'Select Period:'}
            </label>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodType)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 appearance-none focus:outline-none focus:border-emerald-600"
              >
                <option value="TODAY">{isUrdu ? 'آج (Today)' : 'Today'}</option>
                <option value="WEEK">{isUrdu ? 'اس ہفتے (Weekly)' : 'Weekly'}</option>
                <option value="FORTNIGHT">{isUrdu ? '15 روزہ (Fortnightly)' : 'Fortnightly (15 Days)'}</option>
                <option value="MONTH">{isUrdu ? 'اس مہینے (Monthly)' : 'Monthly'}</option>
                <option value="YEAR">{isUrdu ? 'اس سال (Yearly)' : 'Yearly'}</option>
                <option value="CUSTOM">{isUrdu ? 'اپنی مرضی کی تاریخ (Custom)' : 'Custom Date Range'}</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* C. Dynamic Sub-Selectors depending on Selected Report */}
          <div>
            {reportType === 'CUSTOMER_STATEMENT' && (
              <>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {isUrdu ? 'گاہک منتخب کریں:' : 'Select Customer:'}
                </label>
                <div className="relative">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 appearance-none focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">{isUrdu ? '-- گاہک کا نام منتخب کریں --' : '-- Choose Customer --'}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Udhaar: {formatMoney(c.totalCredit)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </>
            )}

            {reportType === 'SUPPLIER_STATEMENT' && (
              <>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {isUrdu ? 'سپلائر منتخب کریں:' : 'Select Supplier:'}
                </label>
                <div className="relative">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 appearance-none focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">{isUrdu ? '-- سپلائر کا نام منتخب کریں --' : '-- Choose Supplier --'}</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Payable: {formatMoney(s.totalPayable)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </>
            )}

            {reportType === 'LEDGER_HEAD' && (
              <>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {isUrdu ? 'کھاتہ ہیڈ منتخب کریں:' : 'Select Ledger Account Head:'}
                </label>
                <div className="relative">
                  <select
                    value={selectedLedgerHead}
                    onChange={(e) => setSelectedLedgerHead(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 appearance-none focus:outline-none focus:border-emerald-600"
                  >
                    <option value="CASH">{isUrdu ? 'نقدی کیش رجسٹر (Cash Register)' : 'Cash Register'}</option>
                    <option value="BANK">{isUrdu ? 'بینک اکاؤنٹ (Bank Account)' : 'Bank Account'}</option>
                    <option value="EASYPAISA">EasyPaisa Wallet</option>
                    <option value="JAZZCASH">JazzCash Wallet</option>
                    <option value="NAYAPAY">NayaPay Wallet</option>
                    <option value="SADAPAY">SadaPay Wallet</option>
                    <option value="ASSETS">{isUrdu ? 'کاروباری اثاثے (Assets)' : 'Business Assets'}</option>
                    <option value="LOANS">{isUrdu ? 'قرضے اور واجبات (Liabilities)' : 'Loans & Liabilities'}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </>
            )}

            {reportType === 'STOCK_STATEMENT' && (
              <>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {isUrdu ? 'اسٹاک کی قسم:' : 'Select Stock Type:'}
                </label>
                <div className="relative">
                  <select
                    value={selectedItemForStock}
                    onChange={(e) => setSelectedItemForStock(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 appearance-none focus:outline-none focus:border-emerald-600"
                  >
                    <option value="OVERALL">{isUrdu ? 'پورے دکان کا اسٹاک (Overall Stock)' : 'Overall Store Stock'}</option>
                    {inventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({isUrdu ? 'موجودہ اسٹاک' : 'Qty'}: {i.quantity} {i.unit})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Custom Range Dates */}
        {period === 'CUSTOM' && (
          <div className="grid grid-cols-2 gap-3 pt-2 animate-in slide-in-from-top-2 duration-150">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isUrdu ? 'شروع کی تاریخ:' : 'Start Date:'}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isUrdu ? 'آخری تاریخ:' : 'End Date:'}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Discrepancy Warnings for IRIS tax */}
      {reportType === 'IRIS_TAX' && fbrSummary.isReconciliationUnbalanced && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 font-bold text-xs flex flex-col gap-1.5 print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-bold">{isUrdu ? 'رپورٹ نامکمل اور غیر حتمی ہے (Reconciliation Required)' : 'Unbalanced Account Warning'}</span>
          </div>
          <p className="text-[10px] font-medium text-slate-600">
            {isUrdu 
              ? `نیٹ بزنس ایکویٹی اور کلوزنگ اونر ایکویٹی کے درمیان فرق پایا گیا ہے (فرق: Rs. ${(fbrSummary.reconciliationDifference || 0).toLocaleString()})۔`
              : `Discrepancy of Rs. ${(fbrSummary.reconciliationDifference || 0).toLocaleString()} detected in Wealth Statement Reconciliation.`}
          </p>
        </div>
      )}

      {/* 2. Interactive Document Preview / Active Ledger View Sheet */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        
        {/* Document Header */}
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {state.profile.shopName || 'Bismillah Store'}
            </h1>
            <p className="text-[11px] font-bold text-[#126A49]">
              {formatHeading()}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              CNIC: {state.profile.cnic || 'N/A'} • NTN: {state.profile.ntn || 'N/A'} • Phone: {state.profile.phone || 'N/A'}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-lg">
              {periodLabel}
            </span>
            <p className="text-[9px] text-slate-400 mt-1.5">
              {isUrdu ? 'رپورٹ بتاریخ:' : 'Printed:'} {new Date().toLocaleDateString('en-PK')}
            </p>
          </div>
        </div>

        {/* Dynamic Report Body Outputs */}
        {reportType === 'BALANCE_SHEET' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 shadow-2xs">
                <span className="text-[9px] font-bold text-emerald-800 uppercase block">{isUrdu ? 'کل اثاثے (Assets)' : 'Total Assets'}</span>
                <span className="text-sm font-black text-[#126A49]">
                  {formatMoney(
                    (reportData.cashBalance || 0) +
                    (reportData.stockValue || 0) +
                    (reportData.customerReceivables || 0) +
                    (reportData.totalBusinessAssetVal || 0) +
                    (reportData.totalPersonalAssetVal || 0)
                  )}
                </span>
              </div>
              <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50 shadow-2xs">
                <span className="text-[9px] font-bold text-rose-800 uppercase block">{isUrdu ? 'کل واجبات' : 'Total Liabilities'}</span>
                <span className="text-sm font-black text-rose-700">
                  {formatMoney(
                    (reportData.supplierPayables || 0) +
                    (reportData.businessLoansValue || 0) +
                    (reportData.personalLoansValue || 0)
                  )}
                </span>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50 shadow-2xs">
                <span className="text-[9px] font-bold text-blue-800 uppercase block">{isUrdu ? 'نیٹ ورتھ (Capital)' : 'Net Worth'}</span>
                <span className="text-sm font-black text-blue-800">
                  {formatMoney(
                    ((reportData.cashBalance || 0) +
                    (reportData.stockValue || 0) +
                    (reportData.customerReceivables || 0) +
                    (reportData.totalBusinessAssetVal || 0) +
                    (reportData.totalPersonalAssetVal || 0)) -
                    ((reportData.supplierPayables || 0) +
                    (reportData.businessLoansValue || 0) +
                    (reportData.personalLoansValue || 0))
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets column */}
              <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs font-medium">
                <h4 className="font-bold text-emerald-800 uppercase border-b border-slate-150 pb-1.5 flex justify-between">
                  <span>{isUrdu ? 'تفصیل اثاثہ جات' : 'ASSETS'}</span>
                  <span>{isUrdu ? 'رقم' : 'Amount'}</span>
                </h4>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'نقد اور بینک بیلنس' : 'Cash & Bank Balance'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.cashBalance || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'دکان کا اسٹاک مالیت' : 'Stock/Inventory Valuation'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.stockValue || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'گاہک کھاتا وصولیاں' : 'Receivables (Udhaar)'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.customerReceivables || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'کاروباری مستقل اثاثے' : 'Fixed Business Assets'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.totalBusinessAssetVal || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'ذاتی اثاثے و جائیداد' : 'Personal Assets'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.totalPersonalAssetVal || 0)}</span>
                </div>
                <hr className="border-slate-100" />
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 border-b-4 border-double border-slate-900 pt-2 pb-1 leading-none mt-1">
                  <span>{isUrdu ? 'کل اثاثے (TOTAL ASSETS)' : 'TOTAL ASSETS'}</span>
                  <span>
                    {formatMoney(
                      (reportData.cashBalance || 0) +
                      (reportData.stockValue || 0) +
                      (reportData.customerReceivables || 0) +
                      (reportData.totalBusinessAssetVal || 0) +
                      (reportData.totalPersonalAssetVal || 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Liabilities column */}
              <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs font-medium">
                <h4 className="font-bold text-rose-800 uppercase border-b border-slate-150 pb-1.5 flex justify-between">
                  <span>{isUrdu ? 'تفصیل واجبات اور سرمایہ' : 'LIABILITIES & EQUITY'}</span>
                  <span>{isUrdu ? 'رقم' : 'Amount'}</span>
                </h4>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'سپلائر واجبات (Payables)' : 'Accounts Payable (Suppliers)'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.supplierPayables || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'کاروباری قرضے' : 'Business Loans'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.businessLoansValue || 0)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">{isUrdu ? 'ذاتی قرضے و ادھاریاں' : 'Personal Loans'}</span>
                  <span className="font-bold text-slate-900">{formatMoney(reportData.personalLoansValue || 0)}</span>
                </div>
                <div className="flex justify-between py-1 px-1.5 rounded bg-blue-50/50 text-blue-900 font-bold">
                  <span>{isUrdu ? 'خالص سرمایہ / مالک کی ایکویٹی' : 'Owner’s Capital (Net Worth)'}</span>
                  <span>
                    {formatMoney(
                      ((reportData.cashBalance || 0) +
                      (reportData.stockValue || 0) +
                      (reportData.customerReceivables || 0) +
                      (reportData.totalBusinessAssetVal || 0) +
                      (reportData.totalPersonalAssetVal || 0)) -
                      ((reportData.supplierPayables || 0) +
                      (reportData.businessLoansValue || 0) +
                      (reportData.personalLoansValue || 0))
                    )}
                  </span>
                </div>
                <hr className="border-slate-100" />
                <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 border-b-4 border-double border-slate-900 pt-2 pb-1 leading-none mt-1">
                  <span>{isUrdu ? 'کل واجبات اور سرمایہ' : 'TOTAL LIAB & EQUITY'}</span>
                  <span>
                    {formatMoney(
                      (reportData.supplierPayables || 0) +
                      (reportData.businessLoansValue || 0) +
                      (reportData.personalLoansValue || 0) +
                      (((reportData.cashBalance || 0) +
                      (reportData.stockValue || 0) +
                      (reportData.customerReceivables || 0) +
                      (reportData.totalBusinessAssetVal || 0) +
                      (reportData.totalPersonalAssetVal || 0)) -
                      ((reportData.supplierPayables || 0) +
                      (reportData.businessLoansValue || 0) +
                      (reportData.personalLoansValue || 0)))
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportType === 'IRIS_TAX' && (
          <div className="space-y-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-2 text-left">{isUrdu ? 'IRIS کوڈ' : 'IRIS Code'}</th>
                  <th className="p-2 text-left">{isUrdu ? 'اکاؤنٹنٹ ہیڈ' : 'FBR Account Head'}</th>
                  <th className="p-2 text-right">{isUrdu ? 'رقم (PKR)' : 'Value (PKR)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {fbrSummary.mappings.map((m) => (
                  <tr key={m.irisCode} className="hover:bg-slate-50/50">
                    <td className="p-2 text-slate-500 font-mono font-bold">Code {m.irisCode}</td>
                    <td className="p-2 font-bold">{m.fieldTitleEn}</td>
                    <td className="p-2 text-right font-bold text-slate-900">{formatMoney(m.calculatedValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(reportType === 'SALES' || reportType === 'PURCHASES') && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase">{isUrdu ? 'کل اندراجات:' : 'Entry Count'}</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{(reportData.list || []).length}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase">{isUrdu ? 'کل رقم:' : 'Total Amount'}</span>
                <p className="text-sm font-bold text-emerald-800 mt-0.5">{formatMoney(reportData.totalAmount || 0)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-2 text-left">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="p-2 text-left">{isUrdu ? 'انتباہ نمبر' : 'Invoice'}</th>
                    <th className="p-2 text-left">{isUrdu ? 'نام کسٹمر/سپلائر' : 'Contact Party'}</th>
                    <th className="p-2 text-left">{isUrdu ? 'ادائیگی طریقہ' : 'Method'}</th>
                    <th className="p-2 text-right">{isUrdu ? 'رقم' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {((reportData.list || []) as Transaction[]).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-2 whitespace-nowrap">{formatDate(t.date)}</td>
                      <td className="p-2">{t.invoiceNo || 'N/A'}</td>
                      <td className="p-2 font-bold">{t.partyName || (isUrdu ? 'عام گاہک (Cash)' : 'Counter Cash')}</td>
                      <td className="p-2 font-mono text-[10px]">{t.paymentMethod}</td>
                      <td className="p-2 text-right font-bold">{formatMoney(t.amount)}</td>
                    </tr>
                  ))}
                  {(reportData.list || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 font-medium">
                        {isUrdu ? 'اس مدت کے دوران کوئی ٹرانزیکشن نہیں پایا گیا۔' : 'No transactions recorded in this period.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'EXPENSES' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[9px] font-bold text-slate-500 uppercase block text-center">{isUrdu ? 'کل کاروباری اخراجات:' : 'Total Operating Expenses'}</span>
              <p className="text-base font-bold text-rose-700 text-center mt-0.5">{formatMoney(reportData.totalAmount || 0)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2 border-r border-slate-100 pr-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase">{isUrdu ? 'ہیڈز کے مطابق اخراجات' : 'Expenses by Category Head'}</h4>
                {Object.entries(reportData.grouped || {}).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between text-xs py-1 border-b border-slate-50 font-medium">
                    <span className="text-slate-600 font-bold capitalize">{String(cat).replace('_', ' ')}</span>
                    <span className="text-rose-700 font-bold">{formatMoney(val)}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-1.5 text-left">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      <th className="p-1.5 text-left">{isUrdu ? 'اخراجات ہیڈ' : 'Head'}</th>
                      <th className="p-1.5 text-right">{isUrdu ? 'رقم' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {((reportData.list || []) as Transaction[]).map((t) => (
                      <tr key={t.id}>
                        <td className="p-1.5">{formatDate(t.date)}</td>
                        <td className="p-1.5 font-bold capitalize">{String(t.category).replace('_', ' ')}</td>
                        <td className="p-1.5 text-right font-bold text-rose-700">{formatMoney(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {reportType === 'COGS' && (
          <div className="p-4 bg-slate-50 rounded-2xl space-y-3 font-medium text-xs">
            <h4 className="font-bold text-[#126A49] border-b pb-1.5">{isUrdu ? 'سٹاک لاگت کا تفصیلی تخمینہ (COGS Equation)' : 'Stock Cost of Goods Sold Equation'}</h4>
            <div className="flex justify-between">
              <span>{isUrdu ? 'کل گروس فروخت / ٹرن اوور (+):' : 'Total Gross Retail Turnover:'}</span>
              <span className="font-bold text-slate-900">{formatMoney(fbrSummary.sales)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{isUrdu ? 'پہلا اسٹاک اور خریداری (Estimated purchases):' : 'Beginning Stock + Purchases:'}</span>
              <span>{formatMoney(reportData.estimatedCogsValue ? reportData.estimatedCogsValue + 120000 : 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{isUrdu ? 'آخری دستیاب اسٹاک (-):' : 'Closing Inventory Value:'}</span>
              <span>{formatMoney(fbrSummary.stockValue)}</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between text-sm font-bold text-emerald-900">
              <span>{isUrdu ? 'فروخت شدہ مال کی لاگت (COGS):' : 'Cost of Goods Sold (COGS):'}</span>
              <span>{formatMoney(reportData.estimatedCogsValue || 0)}</span>
            </div>
          </div>
        )}

        {reportType === 'NET_PROFIT' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">{isUrdu ? 'صافی نفع / منافع (Net Taxable Profit):' : 'Net Business Profit'}</span>
              <p className="text-base font-bold text-[#126A49] mt-0.5">{formatMoney(reportData.netProfitValue || 0)}</p>
            </div>

            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">{isUrdu ? 'کل فروخت آمدن (+):' : 'Gross Turnover (Sales):'}</span>
                <span className="font-bold text-emerald-800">{formatMoney(reportData.salesAmount || 0)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">{isUrdu ? 'اسٹاک خریداری لاگت (COGS) (-):' : 'Cost of Goods Sold (COGS):'}</span>
                <span className="font-bold text-rose-700">{formatMoney(reportData.estimatedCogsValue || 0)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">{isUrdu ? 'آپریٹنگ اخراجات (-):' : 'Business Operating Expenses:'}</span>
                <span className="font-bold text-rose-700">{formatMoney(reportData.expenseAmount || 0)}</span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-2 rounded-lg font-bold text-[#126A49] text-xs">
                <span>{isUrdu ? 'خالص نفع (Net Profit):' : 'Net Taxable Profit:'}</span>
                <span>{formatMoney(reportData.netProfitValue || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {reportType === 'LEDGER_HEAD' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center text-xs p-2.5 bg-slate-50 rounded-xl font-bold">
              <div>
                <span className="text-[9px] text-emerald-800 block">{isUrdu ? 'کل آمد / وصولی (+):' : 'Total Inflow (+)'}</span>
                <span className="text-emerald-800">{formatMoney(reportData.totalInflow || 0)}</span>
              </div>
              <div>
                <span className="text-[9px] text-rose-800 block">{isUrdu ? 'کل خرچ / ادائیگی (-):' : 'Total Outflow (-)'}</span>
                <span className="text-rose-800">{formatMoney(reportData.totalOutflow || 0)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-2 text-left">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="p-2 text-left">{isUrdu ? 'قسم' : 'Type'}</th>
                    <th className="p-2 text-left">{isUrdu ? 'تفصیل' : 'Notes/Description'}</th>
                    <th className="p-2 text-right">{isUrdu ? 'جمع (+)' : 'Inflow (+)'}</th>
                    <th className="p-2 text-right">{isUrdu ? 'بنام (-)' : 'Outflow (-)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {((reportData.list || []) as Transaction[]).map((t) => {
                    const isIn = ['SALE', 'RECEIPT', 'LOAN_TAKEN'].includes(t.type);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-2 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="p-2 text-[10px] font-bold font-mono">{t.type}</td>
                        <td className="p-2">{t.notes || t.category || '-'}</td>
                        <td className="p-2 text-right text-emerald-800 font-bold">{isIn ? formatMoney(t.amount) : '-'}</td>
                        <td className="p-2 text-right text-rose-700 font-bold">{!isIn ? formatMoney(t.amount) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(reportType === 'CUSTOMER_STATEMENT' || reportType === 'SUPPLIER_STATEMENT') && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-xs font-bold text-center">
              <div>
                <span>{reportType === 'CUSTOMER_STATEMENT' ? (isUrdu ? 'کل ادھار خریداری:' : 'Total Sales Credit') : (isUrdu ? 'کل ادھار سپلائی:' : 'Total Purchases Credit')}</span>
                <p className="text-slate-800 mt-0.5">
                  {formatMoney(reportType === 'CUSTOMER_STATEMENT' ? (reportData.totalSales || 0) : (reportData.totalPurchases || 0))}
                </p>
              </div>
              <div>
                <span>{reportType === 'CUSTOMER_STATEMENT' ? (isUrdu ? 'کل وصولی:' : 'Total Receipts') : (isUrdu ? 'کل ادائیگی:' : 'Total Payments')}</span>
                <p className="text-emerald-800 mt-0.5">
                  {formatMoney(reportType === 'CUSTOMER_STATEMENT' ? (reportData.totalReceipts || 0) : (reportData.totalPayments || 0))}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-2 text-left">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="p-2 text-left">{isUrdu ? 'تفصیل' : 'Description'}</th>
                    <th className="p-2 text-right">{reportType === 'CUSTOMER_STATEMENT' ? (isUrdu ? 'ڈیبٹ (+)' : 'Incurred (+)') : (isUrdu ? 'ڈیبٹ' : 'Purchased (+)')}</th>
                    <th className="p-2 text-right">{isUrdu ? 'کریڈٹ (-)' : 'Paid / Settled (-)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {((reportData.list || []) as Transaction[]).map((t) => {
                    const isDebit = reportType === 'CUSTOMER_STATEMENT' ? t.type === 'SALE' : t.type === 'PURCHASE';
                    return (
                      <tr key={t.id}>
                        <td className="p-2 whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="p-2 font-medium">{t.notes || t.type}</td>
                        <td className="p-2 text-right font-bold">{isDebit ? formatMoney(t.amount) : '-'}</td>
                        <td className="p-2 text-right text-emerald-800 font-bold">{!isDebit ? formatMoney(t.amount) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-[#126A49]/5 p-3 rounded-xl border border-[#126A49]/20">
              <span className="text-xs font-bold text-slate-700">
                {reportType === 'CUSTOMER_STATEMENT' ? (isUrdu ? 'موجودہ خالص بقایا ادھار:' : 'Current Outstanding Receivables:') : (isUrdu ? 'موجودہ خالص واجب الادا رقم:' : 'Current Outstanding Payables:')}
              </span>
              <span className="text-sm font-bold text-[#126A49]">
                {formatMoney(reportType === 'CUSTOMER_STATEMENT' ? (reportData.customer?.totalCredit || 0) : (reportData.supplier?.totalPayable || 0))}
              </span>
            </div>
          </div>
        )}

        {reportType === 'STOCK_STATEMENT' && (
          <div className="space-y-3">
            {selectedItemForStock === 'OVERALL' ? (
              <>
                <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-xs font-bold text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isUrdu ? 'کل انوینٹری خرید لاگت:' : 'Overall Purchase Cost Valuation'}</span>
                    <span className="text-slate-800 text-sm font-bold">{formatMoney(reportData.totalCostValue || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isUrdu ? 'کل فروخت ریٹیل قیمت:' : 'Potential Sale Value'}</span>
                    <span className="text-emerald-800 text-sm font-bold">{formatMoney(reportData.totalSaleValue || 0)}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2 text-left">{isUrdu ? 'آئٹم کا نام' : 'Item Name'}</th>
                        <th className="p-2 text-left">{isUrdu ? 'کیٹیگری' : 'Category'}</th>
                        <th className="p-2 text-right">{isUrdu ? 'اسٹاک مقدار' : 'Qty In Store'}</th>
                        <th className="p-2 text-right">{isUrdu ? 'خرید قیمت' : 'Cost'}</th>
                        <th className="p-2 text-right">{isUrdu ? 'فروخت قیمت' : 'Price'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {((reportData.items || []) as InventoryItem[]).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2 font-bold text-slate-900">{item.name}</td>
                          <td className="p-2 text-[10px] text-slate-500">{item.category}</td>
                          <td className={`p-2 text-right font-bold ${item.quantity <= item.minStockAlert ? 'text-rose-600' : ''}`}>
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-2 text-right">{formatMoney(item.purchasePrice)}</td>
                          <td className="p-2 text-right font-bold">{formatMoney(item.salePrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-xs font-bold text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isUrdu ? 'موجودہ اسٹاک بیلنس:' : 'Current Stock Balance'}</span>
                    <span className="text-slate-800 text-sm font-bold">{reportData.item?.quantity} {reportData.item?.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">{isUrdu ? 'کل موجودہ اسٹاک مالیت:' : 'Stock Value'}</span>
                    <span className="text-emerald-800 text-sm font-bold">{formatMoney((reportData.item?.quantity || 0) * (reportData.item?.purchasePrice || 0))}</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2 text-left">{isUrdu ? 'تاریخ' : 'Date'}</th>
                        <th className="p-2 text-left">{isUrdu ? 'آمد/فروخت' : 'Movement Type'}</th>
                        <th className="p-2 text-right">{isUrdu ? 'تبدیلی مقدار' : 'Qty Adjusted'}</th>
                        <th className="p-2 text-right">{isUrdu ? 'یونٹ قیمت' : 'Cost Price'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {((reportData.movements || []) as Transaction[]).map((m) => (
                        <tr key={m.id}>
                          <td className="p-2">{formatDate(m.date)}</td>
                          <td className="p-2 font-mono text-[10px] font-bold">{m.type}</td>
                          <td className={`p-2 text-right font-bold ${(m.qtyChange || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {(m.qtyChange || 0) > 0 ? `+${m.qtyChange}` : m.qtyChange}
                          </td>
                          <td className="p-2 text-right">{formatMoney(m.unitCost || 0)}</td>
                        </tr>
                      ))}
                      {(reportData.movements || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            {isUrdu ? 'اس مدت کے دوران اس آئٹم کا کوئی ٹرانزیکشن نہیں پایا گیا۔' : 'No movements for this item in selected period.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Declarations & Off-canvas Notes */}
        <div className="pt-5 border-t border-slate-100 text-[10px] text-slate-400 space-y-1.5 font-medium italic text-center">
          <p>{isUrdu ? 'یہ رپورٹ روزانہ سیلز اور اکاؤنٹ کھاتہ بک سے موازنہ کر کے خودکار مرتب کی گئی ہے۔' : 'This ledger is strictly prepared from verified and recorded system entries.'}</p>
          <p>{isUrdu ? 'موبائل فون ایپ بذریعہ مائی شاپ مینیجر (دکان مینجمنٹ)' : 'Prepared via My Shop Manager — All rights reserved.'}</p>
        </div>
      </div>
    </div>
  );
};
