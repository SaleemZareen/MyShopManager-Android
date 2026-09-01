import React, { useState, useEffect, useMemo } from 'react';
import {
  Transaction,
  TransactionType,
  PaymentMethod,
  LoanRecord,
  InventoryItem,
  AppState,
} from '../types';
import { formatMoney, formatQuantity } from '../utils/format';
import { AutoScrollText } from './AutoScrollText';
import {
  X,
  QrCode,
  ShoppingBag,
  Truck,
  Receipt,
  HandCoins,
  Send,
  ArrowLeft,
  Plus,
  Search,
  Zap,
  User,
  Users,
  Building2,
  Minus,
  Check,
  MessageCircle,
  Copy,
  Layers,
  Utensils,
  Lightbulb,
  Home,
  Wrench,
  Megaphone,
  Briefcase,
} from 'lucide-react';

interface QuickEntryModalProps {
  initialType: TransactionType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  isUrdu: boolean;
  state?: AppState;
  customerNames?: string[];
  supplierNames?: string[];
  onOpenScanner?: () => void;
  loans?: LoanRecord[];
  onAddNewInventoryItem: () => void;
  prefilledItem?: InventoryItem | null;
  editingTransaction?: Transaction | null;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  initialType,
  isOpen,
  onClose,
  onSubmit,
  isUrdu,
  state,
  customerNames = [],
  supplierNames = [],
  onOpenScanner,
  loans = [],
  onAddNewInventoryItem,
  prefilledItem = null,
  editingTransaction = null,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);

  // Common State
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState<string>('');
  const [category, setCategory] = useState<string>('General Goods');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [selectedLoanAccountId, setSelectedLoanAccountId] = useState<string>('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  // 1. SALE WORKSPACE STATE
  const [saleMode, setSaleMode] = useState<'POS' | 'DIRECT'>('POS');
  const [saleSearch, setSaleSearch] = useState('');
  const [saleCategoryFilter, setSaleCategoryFilter] = useState('ALL');
  const [saleCart, setSaleCart] = useState<Array<{ item: InventoryItem; qty: number }>>([]);
  const [saleCustomerType, setSaleCustomerType] = useState<'WALKIN' | 'KHATA'>('WALKIN');
  const [saleDiscount, setSaleDiscount] = useState<string>('0');
  const [salePaymentStatus, setSalePaymentStatus] = useState<'FULL_CASH' | 'FULL_UDHAAR' | 'PARTIAL'>('FULL_CASH');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // 2. PURCHASE WORKSPACE STATE
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState('');
  const [purchaseItemName, setPurchaseItemName] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('1');
  const [purchaseUnit, setPurchaseUnit] = useState('pcs');
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
  const [purchaseBiltyExpense, setPurchaseBiltyExpense] = useState('');
  const [purchasePaymentStatus, setPurchasePaymentStatus] = useState<'CASH' | 'BANK' | 'CREDIT'>('CASH');

  // 3. EXPENSE WORKSPACE STATE
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [selectedExpenseCat, setSelectedExpenseCat] = useState('Shop Electricity & Bills');

  // 4. COLLECT UDHAAR WORKSPACE STATE
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number>(0);
  const [collectAccount, setCollectAccount] = useState<PaymentMethod>('CASH');

  // 5. PAY SUPPLIER WORKSPACE STATE
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplierPayable, setSelectedSupplierPayable] = useState<number>(0);
  const [payAccount, setPayAccount] = useState<PaymentMethod>('CASH');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  // Sync initial type when opened or when editingTransaction changes
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setType(editingTransaction.type);
      } else if (initialType) {
        setType(initialType);
      }
    }
  }, [initialType, isOpen, editingTransaction]);

  // Pre-fill states if editingTransaction is provided
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount !== undefined && editingTransaction.amount !== null ? editingTransaction.amount.toString() : '');
      if (editingTransaction.date) {
        setDate(editingTransaction.date.split('T')[0]);
      }
      setPartyName(editingTransaction.partyName || '');
      setCategory(editingTransaction.category || 'General Goods');
      setPaymentMethod(editingTransaction.paymentMethod || 'CASH');
      setNotes(editingTransaction.notes || '');
      setReceiptImage(editingTransaction.receiptImageUrl || null);

      if (editingTransaction.type === 'SALE') {
        const notesStr = editingTransaction.notes || '';
        const posMatch = notesStr.match(/POS Sale:\s([^\|]+)/);
        if (posMatch && posMatch[1]) {
          setSaleMode('POS');
          const itemsPart = posMatch[1]; // e.g. "Lux Soap (2 pcs), Surf Excel (1 packet)"
          const parsedCart: Array<{ item: InventoryItem; qty: number }> = [];
          const itemSegments = itemsPart.split(',');
          for (const segment of itemSegments) {
            const seg = segment.trim();
            const segMatch = seg.match(/^([^\(]+)\((\d+)\s*([^)]*)\)$/);
            if (segMatch) {
              const name = segMatch[1].trim();
              const qty = parseInt(segMatch[2]) || 1;
              const unit = segMatch[3] ? segMatch[3].trim() : 'pcs';
              
              // Find matching inventory item in state
              const foundItem = state?.inventory?.find(
                (inv) => inv.name.toLowerCase() === name.toLowerCase()
              );
              
              if (foundItem) {
                parsedCart.push({ item: foundItem, qty });
              } else {
                // Construct a temporary item
                parsedCart.push({
                  item: {
                    id: 'temp-' + Math.random(),
                    name,
                    category: editingTransaction.category || 'General Goods',
                    unit,
                    purchasePrice: 0,
                    salePrice: 0,
                    quantity: qty,
                    minStockAlert: 0,
                    openingStock: 0,
                    purchasedQty: 0,
                    soldQty: qty,
                    damagedQty: 0,
                    returnedQty: 0
                  },
                  qty
                });
              }
            }
          }
          setSaleCart(parsedCart);
          
          const discMatch = notesStr.match(/Disc:\sRs\.\s*([\d\.]+)/);
          if (discMatch && discMatch[1]) {
            setSaleDiscount(discMatch[1]);
          } else {
            setSaleDiscount('0');
          }
        } else {
          setSaleMode('DIRECT');
          setSaleCart([]);
          setSaleDiscount('0');
        }
        setSaleCustomerType(editingTransaction.paymentMethod === 'CREDIT' ? 'KHATA' : 'WALKIN');
      } else if (editingTransaction.type === 'PURCHASE') {
        setPurchasePaymentStatus(editingTransaction.paymentMethod === 'CREDIT' ? 'CREDIT' : (editingTransaction.paymentMethod === 'BANK' ? 'BANK' : 'CASH'));
        const notesStr = editingTransaction.notes || '';
        
        // Extract invoice number from notes if exists (e.g. "Purchase: ... | Inv #123")
        const invMatch = notesStr.match(/Inv #(\w+)/);
        if (invMatch && invMatch[1]) {
          setPurchaseInvoiceNo(invMatch[1]);
        } else {
          setPurchaseInvoiceNo('');
        }
        
        // Extract item name and details
        const itemMatch = notesStr.match(/Purchase:\s([^\(]+)/);
        if (itemMatch && itemMatch[1]) {
          setPurchaseItemName(itemMatch[1].trim());
        } else {
          setPurchaseItemName(editingTransaction.partyName || editingTransaction.category || 'General Goods');
        }

        const qtyMatch = notesStr.match(/\((\d+)\s/);
        if (qtyMatch && qtyMatch[1]) {
          setPurchaseQty(qtyMatch[1]);
        } else {
          setPurchaseQty('1');
        }

        const unitMatch = notesStr.match(/\s(\w+)\s@/);
        if (unitMatch && unitMatch[1]) {
          setPurchaseUnit(unitMatch[1]);
        } else {
          setPurchaseUnit('pcs');
        }

        const costMatch = notesStr.match(/@\sRs\.([\d\.]+)/);
        if (costMatch && costMatch[1]) {
          setPurchaseUnitCost(costMatch[1]);
        } else {
          setPurchaseUnitCost(editingTransaction.amount.toString());
        }

        const biltyMatch = notesStr.match(/Bilty:\sRs\.([\d\.]+)/);
        if (biltyMatch && biltyMatch[1]) {
          setPurchaseBiltyExpense(biltyMatch[1]);
        } else {
          setPurchaseBiltyExpense('');
        }
      } else if (editingTransaction.type === 'EXPENSE') {
        setSelectedExpenseCat(editingTransaction.category);
        const paidToMatch = editingTransaction.notes?.match(/Paid To:\s([^\|]+)/);
        if (paidToMatch && paidToMatch[1]) {
          setExpenseRecipient(paidToMatch[1].trim());
        } else {
          setExpenseRecipient(editingTransaction.partyName || '');
        }
      } else if (editingTransaction.type === 'RECEIPT') {
        setCustomerSearch(editingTransaction.partyName || '');
        setCollectAccount(editingTransaction.paymentMethod || 'CASH');
      } else if (editingTransaction.type === 'PAYMENT') {
        setSupplierSearch(editingTransaction.partyName || '');
        setPayAccount(editingTransaction.paymentMethod || 'CASH');
        const chequeMatch = editingTransaction.notes?.match(/Cheque #(\w+)/);
        if (chequeMatch && chequeMatch[1]) setChequeNo(chequeMatch[1]);
        const chequeDateMatch = editingTransaction.notes?.match(/\(([\d\-]+)\)/);
        if (chequeDateMatch && chequeDateMatch[1]) setChequeDate(chequeDateMatch[1]);
      }
    }
  }, [editingTransaction]);

  // Handle prefilled item if passed (e.g. from scanner)
  useEffect(() => {
    if (prefilledItem) {
      const selectedPrice = initialType === 'SALE' ? prefilledItem.salePrice : prefilledItem.purchasePrice;
      const safePrice = selectedPrice !== undefined && selectedPrice !== null ? selectedPrice : 0;
      setAmount(safePrice.toString());
      setCategory(prefilledItem.category || 'General Goods');
      setNotes(`Barcode ${initialType === 'SALE' ? 'Sale' : 'Purchase'}: ${prefilledItem.name || ''} (1 ${prefilledItem.unit || 'pcs'})`);

      if (initialType === 'SALE') {
        setSaleCart([{ item: prefilledItem, qty: 1 }]);
        setSaleMode('POS');
      } else if (initialType === 'PURCHASE') {
        setPurchaseItemName(prefilledItem.name);
        setPurchaseUnitCost(prefilledItem.purchasePrice?.toString() || '');
        setPurchaseUnit(prefilledItem.unit || 'pcs');
      }
    }
  }, [prefilledItem, initialType]);

  // Cart Subtotal for Sale
  const saleCartSubtotal = useMemo(() => {
    return saleCart.reduce((sum, entry) => sum + (entry.item.salePrice || 0) * entry.qty, 0);
  }, [saleCart]);

  const saleDiscountNum = parseFloat(saleDiscount) || 0;
  const saleNetTotal = Math.max(0, (saleMode === 'POS' ? saleCartSubtotal : (parseFloat(amount) || 0)) - saleDiscountNum);

  // Auto calculate purchase total
  const purchaseCalculatedTotal = useMemo(() => {
    const q = parseFloat(purchaseQty) || 0;
    const c = parseFloat(purchaseUnitCost) || 0;
    const b = parseFloat(purchaseBiltyExpense) || 0;
    return q * c + b;
  }, [purchaseQty, purchaseUnitCost, purchaseBiltyExpense]);

  // Expense Categories Definitions with Pakistani Business Archetypes
  const expenseCategories = [
    {
      id: 'Shop Electricity & Bills',
      nameUr: 'بجلی و یوٹیلٹی بلز',
      descUr: 'بجلی، گیس، پانی اور یوٹیلٹی بلز',
      nameEn: 'Electricity & Utilities',
      descEn: 'Bills, power & water charges',
      icon: Lightbulb,
      color: 'bg-amber-500 text-white',
      border: 'border-amber-200 hover:border-amber-400 bg-amber-50/50',
    },
    {
      id: 'Shop Rent',
      nameUr: 'دکان کا کرایہ',
      descUr: 'ماہانہ دکان یا گودام کا کرایہ',
      nameEn: 'Shop Rent',
      descEn: 'Monthly store rental payment',
      icon: Home,
      color: 'bg-blue-600 text-white',
      border: 'border-blue-200 hover:border-blue-400 bg-blue-50/50',
    },
    {
      id: 'Staff Salary & Wages',
      nameUr: 'ملازمین تنخواہ و دیہاڑی',
      descUr: 'ملازمین کی ماہانہ تنخواہ و روزانہ دیہاڑی',
      nameEn: 'Staff Salary & Wages',
      descEn: 'Worker salaries & daily wages',
      icon: Users,
      color: 'bg-emerald-600 text-white',
      border: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50',
    },
    {
      id: 'Tea, Food & Hospitality',
      nameUr: 'چائے، کھانا و مہمان نوازی',
      descUr: 'چائے، کھانا، پانی و گاہک خاطر تواضع',
      nameEn: 'Tea & Refreshments',
      descEn: 'Tea, snacks & guest hospitality',
      icon: Utensils,
      color: 'bg-orange-500 text-white',
      border: 'border-orange-200 hover:border-orange-400 bg-orange-50/50',
    },
    {
      id: 'Fuel, Delivery & Transport',
      nameUr: 'کرایہ، پیٹرول و ڈلیوری',
      descUr: 'مال برداری، کرایہ، بائیک فیول و ڈلیوری',
      nameEn: 'Transport & Fuel',
      descEn: 'Delivery, petrol & goods freight',
      icon: Truck,
      color: 'bg-indigo-600 text-white',
      border: 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/50',
    },
    {
      id: 'Packaging, Bags & Boxes',
      nameUr: 'شاپر، پیکنگ و ڈبے',
      descUr: 'پلاسٹک شاپر، پیکنگ ٹیپ، ڈبے و لفافے',
      nameEn: 'Packaging & Bags',
      descEn: 'Shopping bags, cartons & wraps',
      icon: Layers,
      color: 'bg-purple-600 text-white',
      border: 'border-purple-200 hover:border-purple-400 bg-purple-50/50',
    },
    {
      id: 'Shop Maintenance & Repairs',
      nameUr: 'مرمت، دیکھ بھال و صفائی',
      descUr: 'دکان کی مرمت، وائرنگ، پینٹ و صفائی',
      nameEn: 'Maintenance & Repairs',
      descEn: 'Shop repair, cleaning & fixtures',
      icon: Wrench,
      color: 'bg-teal-600 text-white',
      border: 'border-teal-200 hover:border-teal-400 bg-teal-50/50',
    },
    {
      id: 'Marketing, Board & Printing',
      nameUr: 'اشتہارات، بورڈ و پرنٹنگ',
      descUr: 'سوشل میڈیا اشتہار، فلیکس بورڈ و بل بک',
      nameEn: 'Marketing & Printing',
      descEn: 'Flex banners, cards & printing',
      icon: Megaphone,
      color: 'bg-rose-600 text-white',
      border: 'border-rose-200 hover:border-rose-400 bg-rose-50/50',
    },
    {
      id: 'Miscellaneous Expenses',
      nameUr: 'دیگر متفرق اخراجات',
      descUr: 'چھوٹے موٹے متفرق دکان کے اخراجات',
      nameEn: 'Miscellaneous',
      descEn: 'Other petty cash & general expenses',
      icon: Briefcase,
      color: 'bg-slate-700 text-white',
      border: 'border-slate-200 hover:border-slate-400 bg-slate-50/50',
    },
  ];

  if (!isOpen) return null;

  // Inventory filtering for Sale POS
  const allInventory = state?.inventory || [];
  const inventoryCategories = ['ALL', ...Array.from(new Set(allInventory.map((i) => i.category || 'General')))];

  const filteredInventory = allInventory.filter((item) => {
    const matchesSearch =
      !saleSearch ||
      item.name.toLowerCase().includes(saleSearch.toLowerCase()) ||
      (item.barcode && item.barcode.includes(saleSearch));
    const matchesCategory = saleCategoryFilter === 'ALL' || (item.category || 'General') === saleCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Customer debt list for Collect Udhaar
  const allCustomers = state?.customers || [];
  const filteredCustomerSuggestions = useMemo(() => {
    if (!partyName.trim()) return [];
    const q = partyName.toLowerCase();
    return allCustomers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [partyName, allCustomers]);
  const debtorsList = allCustomers.filter((c) => (c.totalCredit || 0) > 0);
  const filteredDebtors = allCustomers.filter((c) => {
    if (!customerSearch) return true;
    const q = customerSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
  });

  // Supplier payables list for Pay Supplier
  const allSuppliers = state?.suppliers || [];
  const filteredSuppliers = allSuppliers.filter((s) => {
    if (!supplierSearch) return true;
    const q = supplierSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
  });

  // Today's Stats (timezone-safe local date matching)
  const getLocalDateStr = (dObj: Date) => {
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalDateStr(new Date());
  const todayTx = state?.transactions?.filter((t) => {
    if (!t.date) return false;
    try {
      const txDateStr = getLocalDateStr(new Date(t.date));
      return txDateStr === todayStr;
    } catch {
      return false;
    }
  }) || [];
  const todaySalesSum = todayTx.filter((t) => t.type === 'SALE').reduce((s, t) => s + t.amount, 0);
  const todayPurchasesSum = todayTx.filter((t) => t.type === 'PURCHASE').reduce((s, t) => s + t.amount, 0);
  const todayExpensesSum = todayTx.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const totalMarketUdhaar = allCustomers.reduce((s, c) => s + Math.max(0, c.totalCredit || 0), 0);
  const totalSupplierPayables = allSuppliers.reduce((s, sup) => s + Math.max(0, sup.totalPayable || 0), 0);

  // Cart operations for SALE POS
  const addToCart = (item: InventoryItem) => {
    setSaleCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setSaleCart((prev) => {
      return prev
        .map((entry) => {
          if (entry.item.id === itemId) {
            const newQty = entry.qty + delta;
            return newQty > 0 ? { ...entry, qty: newQty } : null;
          }
          return entry;
        })
        .filter(Boolean) as Array<{ item: InventoryItem; qty: number }>;
    });
  };

  // Search Form Submit Handler (triggers when user clicks magnifying glass or presses enter/search on mobile keyboard)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredInventory.length > 0) {
      addToCart(filteredInventory[0]);
      setSaleSearch('');
    }
  };

  // Submit Handler
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalAmount = 0;
    const finalParty = partyName.trim() || undefined;
    let finalCategory = category;
    let finalNotes = notes.trim() || '';
    let finalMethod = paymentMethod;

    const selectedDateTime = date ? new Date(date + 'T12:00:00').toISOString() : new Date().toISOString();

    if (type === 'SALE') {
      if (saleMode === 'POS' && saleCart.length > 0) {
        finalAmount = saleNetTotal;
        const itemNames = saleCart.map((c) => `${c.item.name} (${c.qty} ${c.item.unit || 'pcs'})`).join(', ');
        finalNotes = `POS Sale: ${itemNames} | Disc: Rs. ${saleDiscountNum}${finalNotes ? ` | ${finalNotes}` : ''}`;
        finalCategory = saleCart[0]?.item.category || 'General Goods';
      } else {
        finalAmount = parseFloat(amount);
        if (isNaN(finalAmount) || finalAmount <= 0) return;
        finalNotes = `Direct Sale: ${finalCategory}${finalNotes ? ` | ${finalNotes}` : ''}`;
      }

      if (saleCustomerType === 'KHATA') {
        if (salePaymentStatus === 'FULL_UDHAAR') {
          finalMethod = 'CREDIT';
          finalNotes += ' [مکمل ادھار سیلز]';
        }
      }
    } else if (type === 'PURCHASE') {
      finalAmount = purchaseCalculatedTotal > 0 ? purchaseCalculatedTotal : parseFloat(amount);
      if (isNaN(finalAmount) || finalAmount <= 0) return;

      if (purchaseItemName) {
        finalNotes = `Purchase: ${purchaseItemName} (${purchaseQty} ${purchaseUnit} @ Rs.${purchaseUnitCost}) ${
          purchaseInvoiceNo ? `| Inv #${purchaseInvoiceNo}` : ''
        } ${purchaseBiltyExpense ? `| Bilty: Rs.${purchaseBiltyExpense}` : ''} ${finalNotes}`;
      }
      finalCategory = 'Stock Purchase';
      finalMethod = purchasePaymentStatus === 'BANK' ? 'BANK' : purchasePaymentStatus === 'CREDIT' ? 'CREDIT' : 'CASH';
    } else if (type === 'EXPENSE') {
      finalAmount = parseFloat(amount);
      if (isNaN(finalAmount) || finalAmount <= 0) return;
      finalCategory = selectedExpenseCat;
      if (expenseRecipient) {
        finalNotes = `Paid To: ${expenseRecipient} | ${finalNotes}`;
      }
    } else if (type === 'RECEIPT') {
      finalAmount = parseFloat(amount);
      if (isNaN(finalAmount) || finalAmount <= 0) return;
      finalCategory = 'Customer Udhaar Collection';
      finalMethod = collectAccount;
      finalNotes = `Customer Udhaar Recovery ${partyName ? `from ${partyName}` : ''} ${finalNotes}`;
    } else if (type === 'PAYMENT') {
      finalAmount = parseFloat(amount);
      if (isNaN(finalAmount) || finalAmount <= 0) return;
      finalCategory = selectedLoanAccountId ? 'LOAN_REPAYMENT' : 'Supplier Payment Clearance';
      finalMethod = payAccount;
      if (chequeNo) {
        finalNotes = `Cheque #${chequeNo} (${chequeDate}) | ${finalNotes}`;
      }
    }

    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert(isUrdu ? 'برائے مہربانی درست رقم درج کریں' : 'Please enter a valid positive amount');
      return;
    }

    onSubmit({
      type,
      amount: finalAmount,
      category: finalCategory || 'General Goods',
      paymentMethod: finalMethod,
      partyName: finalParty,
      date: selectedDateTime,
      notes: finalNotes || undefined,
      receiptImageUrl: receiptImage || undefined,
      loanAccountId: selectedLoanAccountId || undefined,
    });

    onClose();
  };

  // WhatsApp Message Composer for Udhaar Receipt
  const generateWhatsAppMessage = () => {
    const paid = parseFloat(amount) || 0;
    const remaining = Math.max(0, selectedCustomerBalance - paid);
    const shopName = state?.profile?.shopName || 'دکان';
    return `محترم جناب ${partyName || 'کسٹمر'}،\nآپ کی طرف سے رقم Rs. ${paid.toLocaleString()} کی وصولی موصول ہو گئی ہے۔ شکریہ!\nسابقہ ادھار: Rs. ${selectedCustomerBalance.toLocaleString()}\nنیا بقیہ ادھار: Rs. ${remaining.toLocaleString()}\nبشکریہ: ${shopName}`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  // Header Theme Styling
  const getTheme = () => {
    switch (type) {
      case 'SALE':
        return {
          titleUr: 'سیلز کاؤنٹر و POS (Sales Counter & POS)',
          titleEn: 'Sales Counter & POS',
          gradient: 'from-[#0F8A5F] via-[#0B724E] to-[#066647]',
          accent: 'emerald',
          icon: ShoppingBag,
          summaryBadge: `${isUrdu ? 'آج کی کل سیلز' : "Today's Sales"}: ${formatMoney(todaySalesSum)}`,
        };
      case 'PURCHASE':
        return {
          titleUr: 'مال و اسٹاک خریداری (Stock Inward & Purchase)',
          titleEn: 'Inventory Purchase & Stock Inward',
          gradient: 'from-blue-700 via-blue-800 to-indigo-900',
          accent: 'blue',
          icon: Truck,
          summaryBadge: `${isUrdu ? 'آج کی خریداری' : "Today's Purchase"}: ${formatMoney(todayPurchasesSum)}`,
        };
      case 'EXPENSE':
        return {
          titleUr: 'دکان کے اخراجات (Business Expense Manager)',
          titleEn: 'Business Expenses & Bills',
          gradient: 'from-rose-700 via-rose-800 to-red-950',
          accent: 'rose',
          icon: Receipt,
          summaryBadge: `${isUrdu ? 'آج کے اخراجات' : "Today's Expenses"}: ${formatMoney(todayExpensesSum)}`,
        };
      case 'RECEIPT':
        return {
          titleUr: 'گاہکوں سے ادھار وصولی (Customer Udhaar Recovery)',
          titleEn: 'Collect Customer Udhaar & Dues',
          gradient: 'from-amber-600 via-amber-700 to-orange-800',
          accent: 'amber',
          icon: HandCoins,
          summaryBadge: `${isUrdu ? 'مارکیٹ میں کل ادھار' : 'Total Market Udhaar'}: ${formatMoney(totalMarketUdhaar)}`,
        };
      case 'PAYMENT':
        return {
          titleUr: 'سپلائرز کو ادائیگی (Supplier Payment Voucher)',
          titleEn: 'Supplier Payables & Bill Clearance',
          gradient: 'from-purple-700 via-purple-800 to-indigo-950',
          accent: 'purple',
          icon: Send,
          summaryBadge: `${isUrdu ? 'سپلائرز کا کل واجب الادا' : 'Total Supplier Payables'}: ${formatMoney(totalSupplierPayables)}`,
        };
      default:
        return {
          titleUr: 'کھاتہ اندراج',
          titleEn: 'Quick Entry',
          gradient: 'from-slate-800 to-slate-900',
          accent: 'slate',
          icon: Zap,
          summaryBadge: '',
        };
    }
  };

  const theme = getTheme();
  const HeaderIcon = theme.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col w-full h-[100dvh] overflow-hidden animate-in fade-in duration-150">
      {/* 1. TOP FULL-SCREEN APP BAR */}
      <div className={`bg-gradient-to-r ${theme.gradient} text-white px-3 sm:px-6 py-2.5 sm:py-3.5 shadow-md flex items-center justify-between shrink-0 z-30 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl transition-all text-white cursor-pointer shrink-0"
            title={isUrdu ? 'واپس' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
            <HeaderIcon className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold tracking-tight">
                {isUrdu ? theme.titleUr : theme.titleEn}
              </h1>
              {theme.summaryBadge && (
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 border border-white/30 text-white shadow-2xs">
                  {theme.summaryBadge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/85 whitespace-normal break-words leading-tight mt-0.5 max-w-2xl">
              {type === 'SALE' && (isUrdu ? 'اسٹاک اشیاء منتخب کریں، بارکوڈ اسکین کریں یا فوری کیش سیلز درج کریں' : 'Select inventory, scan barcode, or make fast cash sale')}
              {type === 'PURCHASE' && (isUrdu ? 'سپلائرز سے مال کی انٹری، بل و انوائس نمبر اور خریداری خرچ' : 'Record stock purchase from suppliers with bill & landing cost')}
              {type === 'EXPENSE' && (isUrdu ? 'دکان کے ماہانہ و روزمرہ اخراجات کی کیٹیگریز اور نقد ادائیگی' : 'Categorized shop utility bills, staff wages, rent & daily expenses')}
              {type === 'RECEIPT' && (isUrdu ? 'کسٹمر کا بقایا ادھار دیکھیں اور 1-کلک میں وصولی ریکارڈ کریں' : 'View customer outstanding debts and record 1-click collection')}
              {type === 'PAYMENT' && (isUrdu ? 'سپلائر بل کلیئرنس، چیک یا بینک ٹرانسفر ادائیگی ریکارڈ' : 'Clear supplier payables via cash, bank transfer or cheque')}
            </p>
          </div>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2 shrink-0">
          {type === 'PURCHASE' && onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title={isUrdu ? 'بارکوڈ اسکینر' : 'Barcode Scanner'}
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">{isUrdu ? 'اسکینر' : 'Scan'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl transition-all text-white cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. QUICK MODE SWITCHER TABS (So user can switch seamlessly between operations) */}
      <div className="bg-slate-200/90 border-b border-slate-300 px-2 sm:px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0 z-20">
        <button
          type="button"
          onClick={() => setType('SALE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            type === 'SALE'
              ? 'bg-[#0F8A5F] text-white shadow-xs'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-emerald-800'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{isUrdu ? 'فروخت (Sale)' : 'Sale'}</span>
        </button>

        <button
          type="button"
          onClick={() => setType('PURCHASE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            type === 'PURCHASE'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-blue-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>{isUrdu ? 'خریداری (Purchase)' : 'Purchase'}</span>
        </button>

        <button
          type="button"
          onClick={() => setType('EXPENSE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            type === 'EXPENSE'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-rose-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{isUrdu ? 'اخراجات (Expense)' : 'Expense'}</span>
        </button>

        <button
          type="button"
          onClick={() => setType('RECEIPT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            type === 'RECEIPT'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-amber-800'
          }`}
        >
          <HandCoins className="w-3.5 h-3.5" />
          <span>{isUrdu ? 'ادھار وصولی (Collect Udhaar)' : 'Collect Udhaar'}</span>
          {debtorsList.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black flex items-center justify-center">
              {debtorsList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setType('PAYMENT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            type === 'PAYMENT'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-purple-800'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isUrdu ? 'سپلائر ادائیگی (Pay Supplier)' : 'Pay Supplier'}</span>
        </button>
      </div>

      {/* 3. DEDICATED FULL-SCREEN WORKSPACE BODY */}
      <form onSubmit={handleFinalSubmit} className="flex-1 overflow-y-auto bg-slate-100 p-2 sm:p-5 flex flex-col">
        {/* ========================================================================= */}
        {/* WORKSPACE 1: SALES POS & BILLING WORKSPACE */}
        {/* ========================================================================= */}
        {type === 'SALE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 max-w-7xl mx-auto w-full">
            {/* Left Col (7 cols): Inventory Picker & POS Grid */}
            <div className="lg:col-span-7 space-y-3 flex flex-col">
              {/* POS / Direct Mode Toggle & Search */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="grid grid-cols-3 items-center justify-between gap-1 w-full border-b border-slate-100 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSaleMode('POS')}
                    className={`flex items-center justify-center gap-1 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                      saleMode === 'POS'
                        ? 'border-[#0F8A5F] text-[#0F8A5F]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="text-xs shrink-0">🛍️</span>
                    <span className="truncate">{isUrdu ? 'اشیاء کاؤنٹر' : 'Inventory POS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaleMode('DIRECT')}
                    className={`flex items-center justify-center gap-1 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                      saleMode === 'DIRECT'
                        ? 'border-[#0F8A5F] text-[#0F8A5F]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="text-xs shrink-0">⚡</span>
                    <span className="truncate">{isUrdu ? 'فوری سیل' : 'Quick Direct Sale'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onAddNewInventoryItem}
                    className="flex items-center justify-center gap-1 py-2 text-xs font-bold text-[#0F8A5F] hover:text-[#0c6b4a] transition-all cursor-pointer border-b-2 border-transparent hover:border-[#0F8A5F]/40"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isUrdu ? 'نیا آئٹم' : 'Add Item'}</span>
                  </button>
                </div>

                {/* Search Bar & Barcode Scanner Button */}
                {saleMode === 'POS' ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="search"
                        value={saleSearch}
                        onChange={(e) => setSaleSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredInventory.length > 0) {
                              addToCart(filteredInventory[0]);
                              setSaleSearch('');
                            }
                          }
                        }}
                        placeholder={isUrdu ? 'پروڈکٹ کا نام یا بارکوڈ تلاش کریں...' : 'Search product name or barcode...'}
                        className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#0F8A5F] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          if (filteredInventory.length > 0) {
                            addToCart(filteredInventory[0]);
                            setSaleSearch('');
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#0F8A5F] transition-colors cursor-pointer"
                        title={isUrdu ? 'تلاش کریں' : 'Search'}
                      >
                        <Search className="w-4 h-4" />
                      </button>

                      {saleSearch.trim() !== '' && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                          {filteredInventory.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                              {isUrdu ? 'کوئی پروڈکٹ نہیں ملا' : 'No matching product found'}
                            </div>
                          ) : (
                            filteredInventory.slice(0, 8).map((item) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  addToCart(item);
                                  setSaleSearch('');
                                }}
                                className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-slate-900 truncate">{item.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{item.category || 'General'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold text-[#0F8A5F]">Rs. {item.salePrice?.toLocaleString()}</p>
                                  <p className="text-[9px] font-bold text-slate-500">Stock: {formatQuantity(item.quantity || 0, item.unit || 'pcs')} {item.unit || 'pcs'}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {onOpenScanner && (
                      <button
                        type="button"
                        onClick={onOpenScanner}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
                      >
                        <QrCode className="w-4 h-4" />
                        <span className="hidden sm:inline">{isUrdu ? 'بارکوڈ' : 'Scan'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      {isUrdu ? 'فروخت کی رقم (روپے):' : 'Direct Sale Amount (Rs.):'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">Rs.</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        min="1"
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-[#0F8A5F] focus:outline-none"
                      />
                    </div>

                    {/* Quick Currency Presets */}
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {[100, 200, 500, 1000, 2000, 5000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmount(val.toString())}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-[#0F8A5F] border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          +Rs. {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Category Filter Pills (POS Mode) */}
              {saleMode === 'POS' && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {inventoryCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSaleCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        saleCategoryFilter === cat
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Inventory Items Grid (POS Mode) */}
              {saleMode === 'POS' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 overflow-y-auto max-h-[380px] p-1">
                  {filteredInventory.map((item) => {
                    const inCart = saleCart.find((c) => c.item.id === item.id);
                    const stock = item.quantity || 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => addToCart(item)}
                        className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md active:scale-98 ${
                          inCart
                            ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20'
                            : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                              {item.name}
                            </h4>
                            {inCart && (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                {inCart.qty}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate">
                            {item.category || 'General'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                          <span className="text-xs font-black text-emerald-800">
                            Rs. {item.salePrice?.toLocaleString()}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              stock <= 5
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {stock} {item.unit || 'pcs'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col (5 cols): Bill Cart, Customer Khata & Payment */}
            <div className="lg:col-span-5 space-y-3 flex flex-col">
              {/* Customer Selector with Khata Alert */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>{isUrdu ? 'گاہک کی تفصیل (Customer Info)' : 'Customer Details'}</span>
                  </h3>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setSaleCustomerType('WALKIN');
                        setPartyName('');
                      }}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        saleCustomerType === 'WALKIN'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {isUrdu ? 'نقدی گاہک' : 'Walk-in'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleCustomerType('KHATA')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        saleCustomerType === 'KHATA'
                          ? 'bg-emerald-700 text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {isUrdu ? 'کھاتہ دار' : 'Khata'}
                    </button>
                  </div>
                </div>

                {saleCustomerType === 'KHATA' ? (
                  <div className="space-y-1.5 relative">
                    <input
                      type="text"
                      value={partyName}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCustomerSuggestions(false), 200);
                      }}
                      onChange={(e) => {
                        setPartyName(e.target.value);
                        setShowCustomerSuggestions(true);
                      }}
                      placeholder={isUrdu ? 'کسٹمر کا نام تلاش کریں...' : 'Search customer name...'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#0F8A5F] focus:outline-none"
                    />

                    {showCustomerSuggestions && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                        {(filteredCustomerSuggestions.length > 0 ? filteredCustomerSuggestions : allCustomers).map((cust) => (
                          <div
                            key={cust.id}
                            onMouseDown={() => {
                              setPartyName(cust.name);
                              setShowCustomerSuggestions(false);
                            }}
                            className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{cust.name}</p>
                              <p className="text-[10px] text-slate-500">{cust.phone || (isUrdu ? 'کوئی فون نہیں' : 'No phone')}</p>
                            </div>
                            <div className="text-right font-bold text-amber-600 shrink-0">
                              Rs. {cust.totalCredit || 0}
                            </div>
                          </div>
                        ))}
                        {allCustomers.length === 0 && (
                          <div className="p-3 text-center text-xs text-slate-400 font-bold">
                            {isUrdu ? 'کوئی کسٹمر نہیں ملا' : 'No customers found'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Customer Previous Balance Alert */}
                    {partyName && allCustomers.some((c) => c.name.toLowerCase() === partyName.toLowerCase()) && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-100">
                        <span className="text-amber-900 font-medium">{isUrdu ? 'سابقہ واجب الادا ادھار:' : 'Previous Due:'}</span>
                        <span className="font-black text-amber-950">
                          Rs. {allCustomers.find((c) => c.name.toLowerCase() === partyName.toLowerCase())?.totalCredit?.toLocaleString() || 0}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={partyName}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => setShowCustomerSuggestions(false), 200);
                      }}
                      onChange={(e) => {
                        setPartyName(e.target.value);
                        setShowCustomerSuggestions(true);
                      }}
                      placeholder={isUrdu ? 'گاہک کا نام (آپشنل)' : 'Customer Name (Optional)'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#0F8A5F] focus:outline-none"
                    />

                    {showCustomerSuggestions && partyName.trim() !== '' && filteredCustomerSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                        {filteredCustomerSuggestions.map((cust) => (
                          <div
                            key={cust.id}
                            onMouseDown={() => {
                              setPartyName(cust.name);
                              setShowCustomerSuggestions(false);
                            }}
                            className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{cust.name}</p>
                              <p className="text-[10px] text-slate-500">{cust.phone || ''}</p>
                            </div>
                            <div className="text-right font-bold text-amber-600 shrink-0">
                              Rs. {cust.totalCredit || 0}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Items Cart */}
              {saleMode === 'POS' && (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 flex-1 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-extrabold text-slate-900">
                      {isUrdu ? 'بل آئٹمز لسٹ' : 'Bill Items'} ({saleCart.length})
                    </h3>
                    {saleCart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSaleCart([])}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        {isUrdu ? 'تمام ختم کریں' : 'Clear All'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[160px]">
                    {saleCart.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">
                        {isUrdu ? 'کوئی آئٹم منتخب نہیں ہے۔ بائیں طرف سے آئٹمز پر کلک کریں۔' : 'No items in cart. Click items on the left to add.'}
                      </p>
                    ) : (
                      saleCart.map(({ item, qty }) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-800 truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-500">Rs. {item.salePrice} x {qty} {item.unit || 'pcs'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-white rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.id, -1)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded-l-lg cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 font-black text-xs text-slate-900">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item.id, 1)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded-r-lg cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="font-extrabold text-slate-900 w-16 text-right">
                              Rs. {((item.salePrice || 0) * qty).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Payment Settlement & Discount */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      {isUrdu ? 'رعایت / ڈسکاؤنٹ (روپے):' : 'Discount (Rs.):'}
                    </label>
                    <input
                      type="number"
                      value={saleDiscount}
                      onChange={(e) => setSaleDiscount(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      {isUrdu ? 'ادائیگی کا ذریعہ:' : 'Payment Method:'}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="CASH">{isUrdu ? '💵 نقد (Cash)' : 'Cash'}</option>
                      <option value="EASYPAISA">{isUrdu ? '📱 ایزی پیسہ (EasyPaisa)' : 'EasyPaisa'}</option>
                      <option value="JAZZCASH">{isUrdu ? '📱 جاز کیش (JazzCash)' : 'JazzCash'}</option>
                      <option value="BANK">{isUrdu ? '🏦 بینک اکاؤنٹ (Bank)' : 'Bank'}</option>
                      <option value="CREDIT">{isUrdu ? '📝 ادھار کھاتہ (Udhaar)' : 'Credit (Udhaar)'}</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      {isUrdu ? 'تاریخ فروخت:' : 'Sale Date:'}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#0F8A5F] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Final Net Calculation Box */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{isUrdu ? 'کل رقم:' : 'Subtotal:'}</span>
                    <span className="font-bold">Rs. {(saleMode === 'POS' ? saleCartSubtotal : (parseFloat(amount) || 0)).toLocaleString()}</span>
                  </div>
                  {saleDiscountNum > 0 && (
                    <div className="flex items-center justify-between text-xs text-rose-600">
                      <span>{isUrdu ? 'رعایت:' : 'Discount:'}</span>
                      <span className="font-bold">-Rs. {saleDiscountNum.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-black text-emerald-950 pt-1 border-t border-emerald-200">
                    <span>{isUrdu ? 'کل واجب الادا رقم:' : 'Net Payable:'}</span>
                    <span className="text-base font-extrabold text-[#0F8A5F]">Rs. {saleNetTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Submit Sale Button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-[#0F8A5F] hover:bg-[#0b6c4b] active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isUrdu ? 'فروخت محفوظ کریں (Confirm & Save Sale)' : 'Confirm & Save Sale'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE 2: PURCHASE & STOCK INWARD WORKSPACE */}
        {/* ========================================================================= */}
        {type === 'PURCHASE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 max-w-6xl mx-auto w-full">
            {/* Left Col (7 cols): Supplier & Stock Input */}
            <div className="lg:col-span-7 space-y-3">
              {/* Supplier Selection */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>{isUrdu ? 'سپلائر / ڈسٹری بیوٹر منتخب کریں' : 'Select Supplier / Distributor'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={onAddNewInventoryItem}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    {isUrdu ? '+ نیا انوینٹری آئٹم' : '+ New Item'}
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    list="supplier-list-purchase"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder={isUrdu ? 'سپلائر کا نام (مثلاً: نیسلے، یونی لیور، چوہدری ٹریڈرز)' : 'Supplier Name (e.g. Nestle, Unilever)'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <datalist id="supplier-list-purchase">
                    {allSuppliers.map((sup) => (
                      <option key={sup.id} value={sup.name} />
                    ))}
                  </datalist>

                  {/* Supplier Previous Due Badge */}
                  {partyName && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-blue-900 font-medium">{isUrdu ? 'سپلائر کا سابقہ واجب الادا:' : 'Supplier Payable:'}</span>
                      <span className="font-black text-blue-950">
                        Rs. {allSuppliers.find((s) => s.name === partyName)?.totalPayable?.toLocaleString() || 0}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'انوائس / بل نمبر:' : 'Invoice / Bill #:'}
                    </label>
                    <input
                      type="text"
                      value={purchaseInvoiceNo}
                      onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                      placeholder="INV-9842"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'تاریخ خریداری:' : 'Purchase Date:'}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Items Purchased Box */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>{isUrdu ? 'خریدے گئے سامان کی تفصیل' : 'Stock Item & Costing'}</span>
                </h3>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'پروڈکٹ کا نام:' : 'Product Name:'}
                    </label>
                    <input
                      type="text"
                      list="inv-items-list"
                      value={purchaseItemName}
                      onChange={(e) => {
                        setPurchaseItemName(e.target.value);
                        const matched = allInventory.find((i) => i.name.toLowerCase() === e.target.value.toLowerCase());
                        if (matched) {
                          setPurchaseUnitCost(matched.purchasePrice?.toString() || '');
                          setPurchaseUnit(matched.unit || 'pcs');
                        }
                      }}
                      placeholder={isUrdu ? 'سامان کا نام منتخب یا درج کریں...' : 'Select or type item name...'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                    <datalist id="inv-items-list">
                      {allInventory.map((i) => (
                        <option key={i.id} value={i.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        {isUrdu ? 'تعداد (Qty):' : 'Quantity:'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={purchaseQty}
                        onChange={(e) => setPurchaseQty(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        {isUrdu ? 'یونٹ (Unit):' : 'Unit:'}
                      </label>
                      <select
                        value={purchaseUnit}
                        onChange={(e) => setPurchaseUnit(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="pcs">Pieces (Pcs)</option>
                        <option value="carton">Carton (کارٹن)</option>
                        <option value="box">Box (ڈبہ)</option>
                        <option value="dozen">Dozen (درجن)</option>
                        <option value="kg">Kilogram (کلو)</option>
                        <option value="packet">Packet (پیکٹ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        {isUrdu ? 'خرید ریٹ (فی یونٹ):' : 'Cost / Unit:'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={purchaseUnitCost}
                        onChange={(e) => setPurchaseUnitCost(e.target.value)}
                        placeholder="Rs."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'کرایہ / بلٹی / مزدوری خرچ (روپے):' : 'Bilty / Transport / Landing Cost (Rs.):'}
                    </label>
                    <input
                      type="number"
                      value={purchaseBiltyExpense}
                      onChange={(e) => setPurchaseBiltyExpense(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col (5 cols): Purchase Total & Payment Terms */}
            <div className="lg:col-span-5 space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900">
                  {isUrdu ? 'ادائیگی کی تفصیلات و کل بل' : 'Payment Terms & Bill Total'}
                </h3>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {isUrdu ? 'ادائیگی کی صورت:' : 'Payment Status:'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPurchasePaymentStatus('CASH')}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        purchasePaymentStatus === 'CASH'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {isUrdu ? '💵 نقد ادا کیا' : 'Paid Cash'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchasePaymentStatus('BANK')}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        purchasePaymentStatus === 'BANK'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {isUrdu ? '🏦 بینک ٹرانسفر' : 'Paid Bank'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchasePaymentStatus('CREDIT')}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        purchasePaymentStatus === 'CREDIT'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {isUrdu ? '📝 ادھار مال لیا' : 'Full Credit'}
                    </button>
                  </div>
                </div>

                {/* Calculated Bill Breakdown */}
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span>{isUrdu ? 'آئٹم لاگت:' : 'Items Cost:'}</span>
                    <span className="font-bold">
                      Rs. {((parseFloat(purchaseQty) || 0) * (parseFloat(purchaseUnitCost) || 0)).toLocaleString()}
                    </span>
                  </div>
                  {parseFloat(purchaseBiltyExpense) > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-700">
                      <span>{isUrdu ? 'بلٹی / کرایہ:' : 'Bilty Expense:'}</span>
                      <span className="font-bold">+Rs. {parseFloat(purchaseBiltyExpense).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm font-black text-blue-950 pt-1.5 border-t border-blue-200">
                    <span>{isUrdu ? 'کل خریداری رقم:' : 'Total Purchase Amount:'}</span>
                    <span className="text-base text-blue-700 font-extrabold">Rs. {purchaseCalculatedTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isUrdu ? 'خریداری کا ریکارڈ محفوظ کریں' : 'Confirm & Save Purchase'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE 3: EXPENSES & BILLS WORKSPACE */}
        {/* ========================================================================= */}
        {type === 'EXPENSE' && (
          <div className="space-y-4 max-w-5xl mx-auto w-full flex-1 flex flex-col">
            {/* Visual 9-Category Grid */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-rose-600" />
                <span>{isUrdu ? 'خرچے کی کیٹیگری منتخب کریں (Choose Expense Category)' : 'Select Expense Category'}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
                {expenseCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedExpenseCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedExpenseCat(cat.id);
                        setCategory(cat.id);
                      }}
                      className={`p-3 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer flex items-center gap-3 min-w-0 overflow-hidden ${
                        isSelected
                          ? 'border-rose-600 ring-2 ring-rose-200 bg-rose-50/70 shadow-xs'
                          : cat.border
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${cat.color}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="text-xs font-extrabold text-slate-900 leading-snug break-words">
                          {isUrdu ? cat.nameUr : cat.nameEn}
                        </p>
                        <AutoScrollText
                          isUrdu={isUrdu}
                          containerClassName="max-w-full mt-0.5"
                          className="text-[10px] text-slate-500 font-medium"
                        >
                          {isUrdu ? cat.descUr : cat.descEn}
                        </AutoScrollText>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expense Amount & Payment Source */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    {isUrdu ? 'خرچ کی رقم (روپے):' : 'Expense Amount (Rs.):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">Rs.</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-rose-600 focus:outline-none"
                    />
                  </div>

                  {/* Currency Quick Buttons */}
                  <div className="flex gap-1.5 flex-wrap pt-1.5">
                    {[50, 100, 200, 500, 1000, 2000, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val.toString())}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        +Rs. {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'کس کو رقم ادا کی؟ (Recipient):' : 'Paid To (Recipient / Vendor):'}
                    </label>
                    <input
                      type="text"
                      value={expenseRecipient}
                      onChange={(e) => setExpenseRecipient(e.target.value)}
                      placeholder={isUrdu ? 'مثلاً: الیکٹریشن، چائے والا، مالک مکان' : 'e.g. Electrician, Landlord, Staff'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        {isUrdu ? 'ادائیگی کا ذریعہ:' : 'Payment Account:'}
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      >
                        <option value="CASH">{isUrdu ? '💵 دکان کا گلا (Cash)' : 'Shop Cash Drawer'}</option>
                        <option value="BANK">{isUrdu ? '🏦 بینک اکاؤنٹ (Bank)' : 'Bank'}</option>
                        <option value="EASYPAISA">{isUrdu ? '📱 ایزی پیسہ (EasyPaisa)' : 'EasyPaisa'}</option>
                        <option value="JAZZCASH">{isUrdu ? '📱 جاز کیش (JazzCash)' : 'JazzCash'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        {isUrdu ? 'تاریخ:' : 'Date:'}
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  {isUrdu ? 'تفصیل یا نوٹ:' : 'Expense Notes / Description:'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isUrdu ? 'کوئی اضافی تفصیل...' : 'Additional notes...'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-700 hover:bg-rose-800 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>{isUrdu ? 'خرچہ محفوظ کریں (Confirm & Save Expense)' : 'Confirm & Save Expense'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE 4: COLLECT UDHAAR WORKSPACE */}
        {/* ========================================================================= */}
        {type === 'RECEIPT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 max-w-6xl mx-auto w-full">
            {/* Left Col (6 cols): Debtors Directory */}
            <div className="lg:col-span-6 space-y-3 flex flex-col">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <HandCoins className="w-4 h-4 text-amber-600" />
                    <span>{isUrdu ? 'کھاتہ دار گاہک منتخب کریں' : 'Select Customer from Khata'}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {debtorsList.length} {isUrdu ? 'بقایا کھاتے دار' : 'Customers with Due'}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="search"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder={isUrdu ? 'گاہک کا نام یا فون تلاش کریں...' : 'Search customer name or phone...'}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                    title={isUrdu ? 'تلاش کریں' : 'Search'}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Debtors List */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] p-1">
                {filteredDebtors.map((cust) => {
                  const bal = cust.totalCredit || 0;
                  const isSelected = partyName === cust.name;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setPartyName(cust.name);
                        setSelectedCustomerBalance(bal);
                        setAmount(bal.toString());
                      }}
                      className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer flex items-center justify-between hover:shadow-md ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/40'
                          : 'border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-extrabold text-slate-900">{cust.name}</p>
                        <p className="text-[10px] text-slate-500">{cust.phone || 'No phone'}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-rose-600 block">
                          Rs. {bal.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {isUrdu ? 'بقایا ادھار' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col (6 cols): Settlement Amount & WhatsApp Receipt Generator */}
            <div className="lg:col-span-6 space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900">
                  {isUrdu ? 'وصولی کی رقم و کھاتہ کلیئرنس' : 'Collection Amount & Settlement'}
                </h3>

                {partyName && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-amber-950">{partyName}</p>
                      <p className="text-[10px] text-amber-800">{isUrdu ? 'کل پرانا ادھار:' : 'Total Pending Balance:'}</p>
                    </div>
                    <p className="text-base font-black text-amber-950">Rs. {selectedCustomerBalance.toLocaleString()}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    {isUrdu ? 'وصول شدہ رقم (روپے):' : 'Received Amount (Rs.):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">Rs.</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    />
                  </div>

                  {/* 1-Click Clear Full Udhaar Button */}
                  {selectedCustomerBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(selectedCustomerBalance.toString())}
                      className="w-full mt-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                    >
                      ⚡ {isUrdu ? 'مکمل ادھار رقم وصول کریں (Clear Full Rs. ' + selectedCustomerBalance.toLocaleString() + ')' : 'Clear Full Balance'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'وصولی اکاؤنٹ:' : 'Receiving Account:'}
                    </label>
                    <select
                      value={collectAccount}
                      onChange={(e) => setCollectAccount(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="CASH">{isUrdu ? '💵 دکان کا کیش گلا' : 'Shop Cash Drawer'}</option>
                      <option value="BANK">{isUrdu ? '🏦 بینک اکاؤنٹ' : 'Bank'}</option>
                      <option value="EASYPAISA">{isUrdu ? '📱 ایزی پیسہ' : 'EasyPaisa'}</option>
                      <option value="JAZZCASH">{isUrdu ? '📱 جاز کیش' : 'JazzCash'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'تاریخ:' : 'Date:'}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Remaining Balance Indicator */}
                {partyName && (
                  <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{isUrdu ? 'وصولی کے بعد نیا بقایا ادھار:' : 'Remaining Customer Debt:'}</span>
                    <span className="text-emerald-700 font-extrabold">
                      Rs. {Math.max(0, selectedCustomerBalance - (parseFloat(amount) || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* WhatsApp Receipt Generator */}
                {partyName && parseFloat(amount) > 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-[#0F8A5F]">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{isUrdu ? 'گاہک کو واٹس ایپ رسید میسج:' : 'WhatsApp Receipt Notice:'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyWhatsApp}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedMsg ? (isUrdu ? 'کاپی ہوگیا!' : 'Copied!') : (isUrdu ? 'کاپی کریں' : 'Copy')}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium whitespace-pre-line bg-white/80 p-2 rounded-lg border border-emerald-100">
                      {generateWhatsAppMessage()}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isUrdu ? 'وصولی محفوظ کریں (Confirm Udhaar Receipt)' : 'Confirm Udhaar Receipt'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* WORKSPACE 5: PAY SUPPLIER WORKSPACE */}
        {/* ========================================================================= */}
        {type === 'PAYMENT' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 max-w-6xl mx-auto w-full">
            {/* Left Col (6 cols): Suppliers Directory */}
            <div className="lg:col-span-6 space-y-3 flex flex-col">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>{isUrdu ? 'سپلائر منتخب کریں (Select Supplier)' : 'Select Supplier'}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                    {allSuppliers.length} {isUrdu ? 'سپلائرز' : 'Suppliers'}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="search"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder={isUrdu ? 'سپلائر کا نام تلاش کریں...' : 'Search supplier name...'}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                    title={isUrdu ? 'تلاش کریں' : 'Search'}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Suppliers List */}
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] p-1">
                {filteredSuppliers.map((sup) => {
                  const payable = sup.totalPayable || 0;
                  const isSelected = partyName === sup.name;
                  return (
                    <div
                      key={sup.id}
                      onClick={() => {
                        setPartyName(sup.name);
                        setSelectedSupplierPayable(payable);
                        setAmount(payable.toString());
                      }}
                      className={`p-3 bg-white rounded-2xl border transition-all cursor-pointer flex items-center justify-between hover:shadow-md ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50/40'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-extrabold text-slate-900">{sup.name}</p>
                        <p className="text-[10px] text-slate-500">{sup.phone || 'Supplier'}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-purple-700 block">
                          Rs. {payable.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          {isUrdu ? 'واجب الادا' : 'Due Payable'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col (6 cols): Payment Settlement & Cheque Option */}
            <div className="lg:col-span-6 space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900">
                  {isUrdu ? 'سپلائر ادائیگی واؤچر' : 'Payment Voucher Details'}
                </h3>

                {partyName && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-purple-950">{partyName}</p>
                      <p className="text-[10px] text-purple-800">{isUrdu ? 'کل واجب الادا بل:' : 'Total Payable Balance:'}</p>
                    </div>
                    <p className="text-base font-black text-purple-950">Rs. {selectedSupplierPayable.toLocaleString()}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">
                    {isUrdu ? 'ادائیگی کی رقم (روپے):' : 'Payment Amount (Rs.):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">Rs.</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    />
                  </div>

                  {/* 1-Click Clear Full Payable Button */}
                  {selectedSupplierPayable > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(selectedSupplierPayable.toString())}
                      className="w-full mt-2 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                    >
                      ⚡ {isUrdu ? 'مکمل بل صاف کریں (Clear Full Rs. ' + selectedSupplierPayable.toLocaleString() + ')' : 'Clear Full Payable'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'ادائیگی کا طریقہ:' : 'Payment Mode:'}
                    </label>
                    <select
                      value={payAccount}
                      onChange={(e) => setPayAccount(e.target.value as PaymentMethod)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="CASH">{isUrdu ? '💵 نقد (Cash)' : 'Cash'}</option>
                      <option value="BANK">{isUrdu ? '🏦 بینک ٹرانسفر (Bank)' : 'Bank Transfer'}</option>
                      <option value="EASYPAISA">{isUrdu ? '📱 ایزی پیسہ / جاز کیش' : 'Mobile Wallet'}</option>
                      <option value="CREDIT">{isUrdu ? '📝 ادھار / بعد میں ادائیگی' : 'Credit / Pending'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      {isUrdu ? 'تاریخ:' : 'Date:'}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                {payAccount === 'BANK' && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-bold text-purple-900 mb-0.5">
                        {isUrdu ? 'چیک / سلپ نمبر (آپشنل):' : 'Cheque / Slip #:'}
                      </label>
                      <input
                        type="text"
                        value={chequeNo}
                        onChange={(e) => setChequeNo(e.target.value)}
                        placeholder="CHQ-765432"
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-purple-900 mb-0.5">
                        {isUrdu ? 'چیک تاریخ:' : 'Cheque Date:'}
                      </label>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Remaining Due Indicator */}
                {partyName && (
                  <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{isUrdu ? 'ادائیگی کے بعد باقی واجب الادا:' : 'Remaining Supplier Due:'}</span>
                    <span className="text-purple-700 font-extrabold">
                      Rs. {Math.max(0, selectedSupplierPayable - (parseFloat(amount) || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>{isUrdu ? 'ادائیگی واؤچر محفوظ کریں' : 'Confirm Supplier Payment'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
