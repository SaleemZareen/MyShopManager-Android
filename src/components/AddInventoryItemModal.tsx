import React, { useState, useEffect } from 'react';
import { AppState, InventoryItem, PaymentMethod } from '../types';
import { formatMoney, isDecimalAllowed, sanitizeQuantity, formatQuantity } from '../utils/format';
import {
  X,
  QrCode,
  Truck,
  Plus,
  Package,
  Sparkles,
  Banknote,
  BookOpen,
  CreditCard,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface AddInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUrdu: boolean;
  state: AppState;
  onAddItem: (item: Omit<InventoryItem, 'id'> & { id?: string }) => void;
  onRecordPurchase?: (purchaseData: {
    item: InventoryItem;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    partyName?: string;
    date: string;
    notes?: string;
    newSalePrice?: number;
  }) => void;
  prefilledBarcode?: string | null;
  prefilledItem?: InventoryItem | null;
  initialMode?: 'ADD' | 'PURCHASE';
}

export const AddInventoryItemModal: React.FC<AddInventoryItemModalProps> = ({
  isOpen,
  onClose,
  isUrdu,
  state,
  onAddItem,
  onRecordPurchase,
  prefilledBarcode = null,
  prefilledItem = null,
  initialMode = 'ADD',
}) => {
  const [mode, setMode] = useState<'ADD' | 'PURCHASE'>(initialMode);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Fields for ADD mode
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('kg');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minAlert, setMinAlert] = useState('5');
  const [barcode, setBarcode] = useState(prefilledBarcode || '');

  // Fields for PURCHASE mode
  const [purchaseQty, setPurchaseQty] = useState('1');
  const [unitPurchaseCost, setUnitPurchaseCost] = useState('');
  const [updatedSalePrice, setUpdatedSalePrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [supplierMode, setSupplierMode] = useState<'NONE' | 'EXISTING' | 'NEW'>('NONE');
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (prefilledItem) {
        setMode('PURCHASE');
        setSelectedItemId(prefilledItem.id);
        setName(prefilledItem.name);
        setCategory(prefilledItem.category);
        setUnit(prefilledItem.unit);
        setUnitPurchaseCost(prefilledItem.purchasePrice.toString());
        setUpdatedSalePrice(prefilledItem.salePrice.toString());
        setPurchasePrice(prefilledItem.purchasePrice.toString());
        setSalePrice(prefilledItem.salePrice.toString());
        setBarcode(prefilledItem.barcode || '');
      } else {
        setMode(initialMode || 'ADD');
        if (prefilledBarcode) {
          setBarcode(prefilledBarcode);
        }
      }
      setPurchaseQty('1');
      setPaymentMethod('CASH');
      setSupplierMode('NONE');
      setSelectedSupplierName('');
      setNewSupplierName('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setPurchaseNotes('');
    }
  }, [isOpen, prefilledItem, prefilledBarcode, initialMode]);

  const activePurchaseItem =
    state.inventory.find((i) => i.id === selectedItemId) || prefilledItem;

  const handleSelectPurchaseItem = (id: string) => {
    setSelectedItemId(id);
    const item = state.inventory.find((i) => i.id === id);
    if (item) {
      setUnitPurchaseCost(item.purchasePrice.toString());
      setUpdatedSalePrice(item.salePrice.toString());
    }
  };

  if (!isOpen) return null;

  // Handling submission for ADD NEW ITEM
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = Number(quantity) || 0;
    const qty = sanitizeQuantity(parsedQty, unit);
    const pPrice = Number(purchasePrice) || 0;
    const sPrice = Number(salePrice) || 0;

    onAddItem({
      name: name.trim(),
      category: category.trim() || (isUrdu ? 'عام پروڈکٹس' : 'General'),
      unit,
      purchasePrice: pPrice,
      salePrice: sPrice,
      quantity: qty,
      minStockAlert: Number(minAlert) || 5,
      barcode: barcode.trim() || `8964${Math.floor(100000000 + Math.random() * 900000000)}`,
      openingStock: qty,
      purchasedQty: qty,
      soldQty: 0,
      damagedQty: 0,
      returnedQty: 0,
    });

    onClose();
  };

  // Handling submission for PURCHASE / RESTOCK EXISTING ITEM
  const handlePurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePurchaseItem) return;

    const rawQty = parseFloat(purchaseQty) || 0;
    const numQty = sanitizeQuantity(rawQty, activePurchaseItem.unit);
    const numCost = parseFloat(unitPurchaseCost) || 0;
    const numNewSalePrice = parseFloat(updatedSalePrice) || activePurchaseItem.salePrice;

    if (numQty <= 0) {
      alert(isUrdu ? 'براہ کرم درست تعداد درج کریں!' : 'Please enter a valid purchase quantity!');
      return;
    }

    let finalSupplier: string | undefined = undefined;
    if (supplierMode === 'EXISTING' && selectedSupplierName.trim()) {
      finalSupplier = selectedSupplierName.trim();
    } else if (supplierMode === 'NEW' && newSupplierName.trim()) {
      finalSupplier = newSupplierName.trim();
    } else if (paymentMethod === 'CREDIT') {
      alert(
        isUrdu
          ? 'ادھار خریداری کے لیے سپلائر کا نام منتخب یا درج کرنا لازمی ہے!'
          : 'Supplier name is required for Credit (Udhaar) purchases!'
      );
      return;
    }

    const totalAmount = numQty * numCost;
    const notes = purchaseNotes.trim()
      ? purchaseNotes.trim()
      : `Purchase Restock: ${activePurchaseItem.name} (${numQty} ${activePurchaseItem.unit} @ Rs. ${numCost})`;

    if (onRecordPurchase) {
      onRecordPurchase({
        item: activePurchaseItem,
        quantity: numQty,
        unitPrice: numCost,
        totalAmount,
        paymentMethod,
        partyName: finalSupplier,
        date: purchaseDate ? new Date(purchaseDate + 'T12:00:00').toISOString() : new Date().toISOString(),
        notes,
        newSalePrice: numNewSalePrice,
      });
    }

    onClose();
  };

  const handleScanResult = (scanned: string) => {
    setBarcode(scanned);
    setShowBarcodeScanner(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200 pt-[env(safe-area-inset-top,0px)] sm:pt-0">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden flex flex-col rounded-none">
        {/* Modal Header */}
        <div className="bg-[#126A49] text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2">
            {mode === 'PURCHASE' ? <Truck className="w-5 h-5 text-emerald-300" /> : <Package className="w-5 h-5 text-emerald-300" />}
            <div>
              <h3 className="font-bold text-sm sm:text-base tracking-tight">
                {mode === 'PURCHASE'
                  ? isUrdu
                    ? 'خریداری کا اندراج و اسٹاک اضافہ'
                    : 'Add Purchase / Restock Item'
                  : isUrdu
                  ? 'نیا انوینٹری آئٹم شامل کریں'
                  : 'Add New Inventory Item'}
              </h3>
              {prefilledBarcode && mode === 'ADD' && (
                <p className="text-[10px] text-emerald-200 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  {isUrdu ? `بارکوڈ: ${prefilledBarcode}` : `Barcode Attached: ${prefilledBarcode}`}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-emerald-800 transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs if existing items are present */}
        {state.inventory.length > 0 && !prefilledItem && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setMode('ADD')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                mode === 'ADD'
                  ? 'bg-white text-[#126A49] border-b-2 border-[#126A49]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isUrdu ? 'نیا آئٹم رجسٹر کریں' : 'Register New Item'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('PURCHASE');
                if (!selectedItemId && state.inventory[0]) {
                  handleSelectPurchaseItem(state.inventory[0].id);
                }
              }}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                mode === 'PURCHASE'
                  ? 'bg-white text-[#126A49] border-b-2 border-[#126A49]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{isUrdu ? 'موجودہ آئٹم میں اسٹاک بڑھائیں' : 'Purchase / Add Stock'}</span>
            </button>
          </div>
        )}

        {/* ======================= PURCHASE MODE FORM ======================= */}
        {mode === 'PURCHASE' && activePurchaseItem ? (
          <form onSubmit={handlePurchaseSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs">
            {/* Product Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <label className="block text-[11px] font-extrabold text-slate-700">
                {isUrdu ? 'پروڈکٹ برائے خریداری:' : 'Select Product to Restock:'}
              </label>
              <select
                value={activePurchaseItem.id}
                onChange={(e) => handleSelectPurchaseItem(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              >
                {state.inventory.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} (Stock: {formatQuantity(inv.quantity, inv.unit)} {inv.unit} - Buy: Rs. {inv.purchasePrice})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">{isUrdu ? 'موجودہ اسٹاک' : 'Current Stock'}</span>
                  <span className="font-extrabold text-slate-800 text-xs">
                    {formatQuantity(activePurchaseItem.quantity, activePurchaseItem.unit)} {activePurchaseItem.unit}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block">{isUrdu ? 'نیا کل اسٹاک ہو جائے گا' : 'New Stock After'}</span>
                  <span className="font-black text-emerald-800 text-xs">
                    {formatQuantity(activePurchaseItem.quantity + (parseFloat(purchaseQty) || 0), activePurchaseItem.unit)} {activePurchaseItem.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Qty and Purchase Cost */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  {isUrdu ? `خریداری تعداد (${activePurchaseItem.unit}):` : `Purchase Qty (${activePurchaseItem.unit}):`}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPurchaseQty((prev) => Math.max(1, (parseFloat(prev) || 1) - 1).toString())}
                    className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg flex items-center justify-center cursor-pointer border border-slate-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-full text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                  />
                  <button
                    type="button"
                    onClick={() => setPurchaseQty((prev) => ((parseFloat(prev) || 0) + 1).toString())}
                    className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg flex items-center justify-center cursor-pointer border border-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  {isUrdu ? 'فی یونٹ خرید قیمت (Rs.):' : 'Unit Purchase Cost (Rs.):'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={unitPurchaseCost}
                  onChange={(e) => setUnitPurchaseCost(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>
            </div>

            {/* Total Cost Strip */}
            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
              <span className="font-extrabold text-emerald-950 text-xs">
                {isUrdu ? 'کل خریداری لاگت:' : 'Total Purchase Amount:'}
              </span>
              <span className="font-black text-sm sm:text-base text-[#126A49]">
                {formatMoney((parseFloat(purchaseQty) || 0) * (parseFloat(unitPurchaseCost) || 0))}
              </span>
            </div>

            {/* Optional update retail price */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                {isUrdu ? 'نئی فروخت قیمت (اگر تبدیل کرنی ہو):' : 'New Retail Sale Price (Optional):'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={updatedSalePrice}
                onChange={(e) => setUpdatedSalePrice(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                {isUrdu ? 'ادائیگی کا ذریعہ:' : 'Payment Outflow Account:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 cursor-pointer font-bold text-[11px] ${
                    paymentMethod === 'CASH'
                      ? 'bg-[#126A49] text-white border-[#126A49]'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'نقد (Cash)' : 'Cash'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 cursor-pointer font-bold text-[11px] ${
                    paymentMethod === 'CREDIT'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'ادھار (Payable)' : 'Credit / Payable'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 cursor-pointer font-bold text-[11px] ${
                    paymentMethod === 'BANK'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'بینک' : 'Bank'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('EASYPAISA')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 cursor-pointer font-bold text-[11px] ${
                    ['EASYPAISA', 'JAZZCASH', 'NAYAPAY', 'SADAPAY'].includes(paymentMethod)
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'والٹ' : 'Wallet'}</span>
                </button>
              </div>
            </div>

            {/* Supplier Link */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-slate-700">
                  {isUrdu ? 'سپلائر / ڈیلر:' : 'Supplier / Vendor:'}
                </label>
                <div className="flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSupplierMode('NONE')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                      supplierMode === 'NONE' ? 'bg-slate-700 text-white' : 'text-slate-600 bg-white border border-slate-200'
                    }`}
                  >
                    {isUrdu ? 'نقد مارکیٹ' : 'Cash Market'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupplierMode('EXISTING')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                      supplierMode === 'EXISTING' ? 'bg-[#126A49] text-white' : 'text-slate-600 bg-white border border-slate-200'
                    }`}
                  >
                    {isUrdu ? 'سپلائر لسٹ' : 'Suppliers'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSupplierMode('NEW')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer ${
                      supplierMode === 'NEW' ? 'bg-amber-600 text-white' : 'text-slate-600 bg-white border border-slate-200'
                    }`}
                  >
                    {isUrdu ? '+ نیا' : '+ New'}
                  </button>
                </div>
              </div>

              {supplierMode === 'EXISTING' && (
                <select
                  value={selectedSupplierName}
                  onChange={(e) => setSelectedSupplierName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none"
                >
                  <option value="">{isUrdu ? '-- سپلائر منتخب کریں --' : '-- Select Supplier --'}</option>
                  {state.suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} (Payable: Rs. {s.totalPayable})
                    </option>
                  ))}
                </select>
              )}

              {supplierMode === 'NEW' && (
                <input
                  type="text"
                  placeholder={isUrdu ? 'سپلائر / کمپنی کا نام' : 'Supplier / Company Name'}
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none"
                />
              )}
            </div>

            {/* Actions Button */}
            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 bg-[#126A49] hover:bg-[#0e543a] text-white font-black text-xs rounded-xl cursor-pointer shadow-md flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isUrdu
                    ? `خریداری مکمل کریں (+${purchaseQty} اسٹاک)`
                    : `Confirm Purchase (+${purchaseQty} Stock)`}
                </span>
              </button>
            </div>
          </form>
        ) : (
          /* ======================= ADD NEW ITEM FORM ======================= */
          <form onSubmit={handleCreateItem} className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 text-xs">
            {prefilledBarcode && (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between text-amber-900">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  {isUrdu ? 'اسکین شدہ بارکوڈ منسلک ہے:' : 'Attached Scanned Barcode:'}
                </span>
                <span className="font-mono font-black text-xs bg-white px-2 py-0.5 rounded border border-amber-200">
                  {prefilledBarcode}
                </span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isUrdu ? 'آئٹم کا نام:' : 'Item Name:'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Super Kernel Rice / Lipton Tea 400g"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isUrdu ? 'کیٹیگری:' : 'Category:'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grocery, Drinks, Snax"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isUrdu ? 'پیمائش اکائی (Unit):' : 'Unit:'}
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="kg">kg (کلو)</option>
                  <option value="pcs">pcs (عدد)</option>
                  <option value="box">box (ڈبہ)</option>
                  <option value="packet">packet (پیکٹ)</option>
                  <option value="meter">meter (میٹر)</option>
                  <option value="tin">tin (ٹن)</option>
                  <option value="bottle">bottle (بوتل)</option>
                  <option value="gram">gram (گرام)</option>
                  <option value="litre">litre (لیٹر)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isUrdu ? 'خرید قیمت (Rs.):' : 'Purchase Price (Rs.):'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isUrdu ? 'فروخت قیمت (Rs.):' : 'Sale Price (Rs.):'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isUrdu ? 'ابتدائی اسٹاک تعداد:' : 'Initial Stock Qty:'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {isUrdu ? 'کم از کم الرٹ:' : 'Min Stock Alert:'}
                </label>
                <input
                  type="number"
                  placeholder="5"
                  value={minAlert}
                  onChange={(e) => setMinAlert(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {isUrdu ? 'بارکوڈ نمبر:' : 'Barcode / EAN:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 8964000112233"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
                />
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#126A49]" />
                  <span>{isUrdu ? 'اسکین' : 'Scan'}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                {isUrdu ? 'منسوخ' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#126A49] hover:bg-[#0e543a] text-white font-black text-xs rounded-xl cursor-pointer shadow-md"
              >
                {isUrdu ? 'اسٹاک میں شامل کریں' : 'Save to Inventory'}
              </button>
            </div>
          </form>
        )}
      </div>

      {showBarcodeScanner && (
        <BarcodeScannerModal
          isOpen={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          isUrdu={isUrdu}
          state={state}
          onScanResult={handleScanResult}
        />
      )}
    </div>
  );
};
