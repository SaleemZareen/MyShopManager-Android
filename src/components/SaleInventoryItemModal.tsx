import React, { useState, useEffect } from 'react';
import { AppState, InventoryItem, PaymentMethod } from '../types';
import { formatMoney, isDecimalAllowed, sanitizeQuantity, formatQuantity } from '../utils/format';
import {
  X,
  ShoppingBag,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  BookOpen,
  Calendar,
  AlertTriangle,
  Receipt,
  Tag,
  CheckCircle2,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface SaleInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUrdu: boolean;
  state: AppState;
  prefilledItem?: InventoryItem | null;
  onRecordSale: (saleData: {
    item: InventoryItem;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    partyName?: string;
    date: string;
    notes?: string;
    invoiceNo?: string;
  }) => void;
}

export const SaleInventoryItemModal: React.FC<SaleInventoryItemModalProps> = ({
  isOpen,
  onClose,
  isUrdu,
  state,
  prefilledItem = null,
  onRecordSale,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customerMode, setCustomerMode] = useState<'WALKIN' | 'EXISTING' | 'NEW'>('WALKIN');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState<string>(`INV-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState<string>('');

  const activeItem = state.inventory.find((i) => i.id === selectedItemId) || prefilledItem || state.inventory[0];

  useEffect(() => {
    if (isOpen) {
      if (prefilledItem) {
        setSelectedItemId(prefilledItem.id);
        setUnitPrice(prefilledItem.salePrice.toString());
      } else if (state.inventory.length > 0) {
        setSelectedItemId(state.inventory[0].id);
        setUnitPrice(state.inventory[0].salePrice.toString());
      }
      setQuantity('1');
      setDiscount('0');
      setPaymentMethod('CASH');
      setCustomerMode('WALKIN');
      setSelectedCustomerName('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setDate(new Date().toISOString().split('T')[0]);
      setInvoiceNo(`INV-${Date.now().toString().slice(-6)}`);
      setNotes('');
    }
  }, [isOpen, prefilledItem, state.inventory]);

  // When selected item changes, update unit price
  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    const item = state.inventory.find((i) => i.id === id);
    if (item) {
      setUnitPrice(item.salePrice.toString());
    }
  };

  if (!isOpen || !activeItem) return null;

  const numQty = parseFloat(quantity) || 0;
  const numUnitPrice = parseFloat(unitPrice) || 0;
  const rawSubtotal = numQty * numUnitPrice;

  let calculatedDiscount = 0;
  const numDiscountInput = parseFloat(discount) || 0;
  if (discountType === 'PERCENT') {
    calculatedDiscount = (rawSubtotal * numDiscountInput) / 100;
  } else {
    calculatedDiscount = numDiscountInput;
  }
  calculatedDiscount = Math.min(rawSubtotal, Math.max(0, calculatedDiscount));

  const totalAmount = Math.max(0, rawSubtotal - calculatedDiscount);
  const costOfGoodsSold = numQty * (activeItem.purchasePrice || 0);
  const estimatedProfit = totalAmount - costOfGoodsSold;
  const isProfitPositive = estimatedProfit >= 0;

  const currentStock = activeItem.quantity || 0;
  const isInsufficientStock = numQty > currentStock;
  const remainingStock = Math.max(0, currentStock - numQty);

  const matchedCustomer = state.customers.find(
    (c) => c.name.toLowerCase() === selectedCustomerName.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedQty = sanitizeQuantity(numQty, activeItem.unit);

    if (sanitizedQty <= 0) {
      alert(isUrdu ? 'براہ کرم درست تعداد درج کریں!' : 'Please enter a valid sale quantity!');
      return;
    }

    if (sanitizedQty > currentStock) {
      alert(
        isUrdu
          ? `اسٹاک ناکافی ہے! دستیاب اسٹاک صرف ${currentStock} ${activeItem.unit} ہے۔`
          : `Insufficient stock! Available stock is only ${currentStock} ${activeItem.unit}.`
      );
      return;
    }

    let finalPartyName: string | undefined = undefined;
    if (customerMode === 'EXISTING' && selectedCustomerName.trim()) {
      finalPartyName = selectedCustomerName.trim();
    } else if (customerMode === 'NEW' && newCustomerName.trim()) {
      finalPartyName = newCustomerName.trim();
    } else if (paymentMethod === 'CREDIT') {
      alert(
        isUrdu
          ? 'ادھار فروخت کے لیے گاہک کا نام منتخب یا درج کرنا لازمی ہے!'
          : 'Customer name is required for Credit (Udhaar) sales!'
      );
      return;
    }

    const finalNotes = notes.trim()
      ? notes.trim()
      : `Sale: ${activeItem.name} (${sanitizedQty} ${activeItem.unit} @ Rs. ${numUnitPrice})`;

    onRecordSale({
      item: activeItem,
      quantity: sanitizedQty,
      unitPrice: numUnitPrice,
      discount: calculatedDiscount,
      totalAmount,
      paymentMethod,
      partyName: finalPartyName,
      date: date ? new Date(date + 'T12:00:00').toISOString() : new Date().toISOString(),
      notes: finalNotes,
      invoiceNo,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col w-full h-[100dvh] overflow-hidden animate-in fade-in duration-150">
      <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#126A49] via-[#0E543A] to-emerald-950 text-white px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-md pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                {isUrdu ? 'فروخت کا اندراج و اسٹاک کٹوتی (Sale / Stock Outward)' : 'Less / Sale Inventory Item'}
              </h2>
              <p className="text-[11px] text-white/80 leading-tight">
                {isUrdu
                  ? 'اسٹاک کی کٹوتی، کیش/بینک اور گاہک کھاتہ خودکار اپڈیٹ ہوگا'
                  : 'Auto-deducts stock & synchronizes Cash/Bank/Customer Khata'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 rounded-xl transition-all text-white cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6 flex flex-col justify-between">
          <div className="max-w-2xl mx-auto w-full space-y-4">
            {/* Selected Product Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    {isUrdu ? 'فروخت کے لیے پروڈکٹ:' : 'Selected Inventory Product:'}
                  </label>
                  <select
                    value={activeItem.id}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:ring-2 focus:ring-[#126A49] focus:outline-none"
                  >
                    {state.inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({formatQuantity(inv.quantity, inv.unit)} {inv.unit} {isUrdu ? 'اسٹاک میں' : 'in stock'} - Rs. {inv.salePrice})
                      </option>
                    ))}
                  </select>
                </div>

                {activeItem.barcode && (
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block">Barcode</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {activeItem.barcode}
                    </span>
                  </div>
                )}
              </div>

              {/* In-Stock vs Cost & Price Strip */}
              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-150 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {isUrdu ? 'دستیاب اسٹاک' : 'Current Stock'}
                  </span>
                  <span
                    className={`font-black text-xs sm:text-sm ${
                      currentStock <= activeItem.minStockAlert ? 'text-amber-600' : 'text-slate-900'
                    }`}
                  >
                    {formatQuantity(currentStock, activeItem.unit)} {activeItem.unit}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {isUrdu ? 'خرید لاگت (Cost)' : 'Unit Cost'}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-700">
                    {formatMoney(activeItem.purchasePrice || 0)}
                  </span>
                </div>

                <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 block">
                    {isUrdu ? 'معیاری ریٹیل ریٹ' : 'Retail Price'}
                  </span>
                  <span className="font-black text-xs sm:text-sm text-[#126A49]">
                    {formatMoney(activeItem.salePrice || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity, Unit Price & Discount Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Sale Quantity */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1.5">
                  {isUrdu ? `فروخت تعداد (${activeItem.unit}):` : `Sale Quantity (${activeItem.unit}):`}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, (parseFloat(prev) || 1) - 1).toString())}
                    className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl flex items-center justify-center cursor-pointer text-sm shrink-0 border border-slate-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`w-full text-center py-1.5 bg-slate-50 border rounded-xl font-black text-sm text-slate-900 focus:outline-none ${
                      isInsufficientStock
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-400 bg-rose-50'
                        : 'border-slate-300 focus:ring-2 focus:ring-[#126A49]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => ((parseFloat(prev) || 0) + 1).toString())}
                    className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl flex items-center justify-center cursor-pointer text-sm shrink-0 border border-slate-200"
                  >
                    +
                  </button>
                </div>

                {/* Stock Preview */}
                <div className="mt-1.5 text-[10px] font-bold">
                  {isInsufficientStock ? (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {isUrdu ? `اسٹاک سے ${formatQuantity(numQty - currentStock, activeItem.unit)} زیادہ ہے!` : `Exceeds stock by ${formatQuantity(numQty - currentStock, activeItem.unit)}!`}
                    </span>
                  ) : (
                    <span className="text-emerald-700">
                      {isUrdu ? `باقی اسٹاک: ${formatQuantity(remainingStock, activeItem.unit)} ${activeItem.unit}` : `Remaining stock: ${formatQuantity(remainingStock, activeItem.unit)} ${activeItem.unit}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Unit Sale Price */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1.5">
                  {isUrdu ? 'فی یونٹ ریٹ (روپے):' : 'Unit Sale Price (Rs.):'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#126A49] focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-semibold mt-1.5 block">
                  {isUrdu ? 'ریٹ تبدیل کر سکتے ہیں' : 'Can adjust per customer'}
                </span>
              </div>

              {/* Discount */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-extrabold text-slate-700">
                    {isUrdu ? 'رعایت (Discount):' : 'Discount:'}
                  </label>
                  <div className="flex rounded-md overflow-hidden border border-slate-300 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('FIXED')}
                      className={`px-1.5 py-0.5 font-bold cursor-pointer ${
                        discountType === 'FIXED' ? 'bg-[#126A49] text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      Rs.
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('PERCENT')}
                      className={`px-1.5 py-0.5 font-bold cursor-pointer ${
                        discountType === 'PERCENT' ? 'bg-[#126A49] text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:ring-2 focus:ring-[#126A49] focus:outline-none"
                />
                {calculatedDiscount > 0 && (
                  <span className="text-[10px] text-emerald-700 font-bold mt-1.5 block">
                    - {formatMoney(calculatedDiscount)}
                  </span>
                )}
              </div>
            </div>

            {/* Total & Profit Calculation Summary Box */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide block">
                  {isUrdu ? 'کل وصولی رقم (Net Payable Total):' : 'Net Sale Total:'}
                </span>
                <div className="text-xl sm:text-2xl font-black text-[#126A49]">
                  {formatMoney(totalAmount)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 block">
                  {isUrdu ? 'تخمینہ منافع (Est. Profit):' : 'Estimated Profit:'}
                </span>
                <span
                  className={`font-black text-xs sm:text-sm flex items-center justify-end gap-1 ${
                    isProfitPositive ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  {formatMoney(estimatedProfit)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <label className="block text-[11px] font-extrabold text-slate-700 mb-2">
                {isUrdu ? 'ادائیگی کا ذریعہ (Payment Method & Account):' : 'Payment Method & Account:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer font-bold transition-all text-xs ${
                    paymentMethod === 'CASH'
                      ? 'bg-[#126A49] text-white border-[#126A49] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>{isUrdu ? 'نقد (Cash)' : 'Cash'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer font-bold transition-all text-xs ${
                    paymentMethod === 'CREDIT'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isUrdu ? 'ادھار / کھاتہ' : 'Credit / Khata'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer font-bold transition-all text-xs ${
                    paymentMethod === 'BANK'
                      ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isUrdu ? 'بینک ٹرانسفر' : 'Bank'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('EASYPAISA')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 cursor-pointer font-bold transition-all text-xs ${
                    ['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(paymentMethod)
                      ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isUrdu ? 'موبائل والٹ' : 'Wallet (EasyPaisa)'}</span>
                </button>
              </div>
            </div>

            {/* Customer Selection (Walk-in vs Existing vs New) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#126A49]" />
                  <span>{isUrdu ? 'گاہک کی تفصیل (Customer Link):' : 'Customer Account:'}</span>
                </label>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('WALKIN')}
                    className={`px-2 py-0.5 font-bold rounded-md cursor-pointer transition-colors ${
                      customerMode === 'WALKIN' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {isUrdu ? 'عام گاہک' : 'Walk-in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('EXISTING')}
                    className={`px-2 py-0.5 font-bold rounded-md cursor-pointer transition-colors ${
                      customerMode === 'EXISTING' ? 'bg-[#126A49] text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {isUrdu ? 'کھاتہ لسٹ' : 'Existing'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('NEW')}
                    className={`px-2 py-0.5 font-bold rounded-md cursor-pointer transition-colors ${
                      customerMode === 'NEW' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    {isUrdu ? '+ نیا گاہک' : '+ New'}
                  </button>
                </div>
              </div>

              {customerMode === 'EXISTING' && (
                <div className="space-y-1.5">
                  <select
                    value={selectedCustomerName}
                    onChange={(e) => setSelectedCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                  >
                    <option value="">{isUrdu ? '-- گاہک کا نام منتخب کریں --' : '-- Select Customer --'}</option>
                    {state.customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - {isUrdu ? 'بقایا:' : 'Balance:'} Rs. {c.totalCredit}
                      </option>
                    ))}
                  </select>
                  {matchedCustomer && (
                    <p className="text-[10px] text-slate-500 font-semibold px-1">
                      {isUrdu ? 'موجودہ ادھار بیلنس:' : 'Current Credit Balance:'}{' '}
                      <strong className="text-amber-700 font-bold">{formatMoney(matchedCustomer.totalCredit)}</strong>
                    </p>
                  )}
                </div>
              )}

              {customerMode === 'NEW' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={isUrdu ? 'گاہک کا نام (لازمی)' : 'Customer Name (Required)'}
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                  />
                  <input
                    type="text"
                    placeholder={isUrdu ? 'موبائل نمبر (اختیاری)' : 'Mobile Number (Optional)'}
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                  />
                </div>
              )}
            </div>

            {/* Date, Invoice No & Optional Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  {isUrdu ? 'تاریخ (Date):' : 'Date:'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  {isUrdu ? 'رسید نمبر:' : 'Invoice No:'}
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  {isUrdu ? 'تفصیل / نوٹ:' : 'Notes / Remarks:'}
                </label>
                <input
                  type="text"
                  placeholder={isUrdu ? 'اختیاری نوٹ...' : 'Optional notes...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions Frame */}
          <div className="max-w-2xl mx-auto w-full flex gap-3 pt-4 mt-4 border-t border-slate-250">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
            >
              {isUrdu ? 'منسوخ' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isInsufficientStock}
              className={`flex-2 py-3 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5 ${
                isInsufficientStock
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#126A49] hover:bg-[#0e543a] active:scale-98'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isUrdu
                  ? `فروخت درج کریں (${formatMoney(totalAmount)})`
                  : `Record Sale & Deduct Stock (${formatMoney(totalAmount)})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
