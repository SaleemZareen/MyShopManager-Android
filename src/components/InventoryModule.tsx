import React, { useState } from 'react';
import { AppState, InventoryItem, PaymentMethod, StoreMode } from '../types';
import { formatMoney, formatQuantity } from '../utils/format';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  Barcode,
  Trash2,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { AddInventoryItemModal } from './AddInventoryItemModal';
import { useBackHandler } from '../hooks/useBackHandler';
import { AutoScrollText } from './AutoScrollText';

interface InventoryModuleProps {
  state: AppState;
  isUrdu: boolean;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateQty: (id: string, newQty: number) => void;
  onDeleteItem: (id: string) => void;
  onOpenSaleModal?: (item: InventoryItem) => void;
  onOpenPurchaseModal?: (item: InventoryItem) => void;
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
  pendingScannedBarcode?: string | null;
  onClearPendingBarcode?: () => void;
  autoOpenAddModal?: boolean;
  onClearAutoOpenAddModal?: () => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  state,
  isUrdu,
  onAddItem,
  onUpdateQty,
  onDeleteItem,
  onOpenSaleModal,
  onOpenPurchaseModal,
  onRecordPurchase,
  pendingScannedBarcode,
  onClearPendingBarcode,
  autoOpenAddModal,
  onClearAutoOpenAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string | null>(null);
  const [selectedItemForPurchase, setSelectedItemForPurchase] = useState<InventoryItem | null>(null);

  // Register Back Handlers for local modals
  useBackHandler(showAddModal, () => setShowAddModal(false), 'InventoryAddModal');
  useBackHandler(showBarcodeScanner, () => setShowBarcodeScanner(false), 'InventoryScannerModal');

  React.useEffect(() => {
    if (pendingScannedBarcode) {
      setPrefilledBarcode(pendingScannedBarcode);
      setSelectedItemForPurchase(null);
      setShowAddModal(true);
      onClearPendingBarcode?.();
    }
  }, [pendingScannedBarcode, onClearPendingBarcode]);

  React.useEffect(() => {
    if (autoOpenAddModal) {
      setPrefilledBarcode(null);
      setSelectedItemForPurchase(null);
      setShowAddModal(true);
      onClearAutoOpenAddModal?.();
    }
  }, [autoOpenAddModal, onClearAutoOpenAddModal]);

  const filteredItems = state.inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode && item.barcode.includes(search))
  );

  const lowStockItems = state.inventory.filter((item) => item.quantity <= item.minStockAlert);
  const totalStockValuation = state.inventory.reduce(
    (sum, item) => sum + item.quantity * item.purchasePrice,
    0
  );

  const handleCreateItem = (newItem: Omit<InventoryItem, 'id'>) => {
    onAddItem({
      ...newItem,
      openingStock: newItem.quantity,
      purchasedQty: newItem.quantity,
      soldQty: 0,
      damagedQty: 0,
      returnedQty: 0,
    });
    setShowAddModal(false);
  };

  const handleOpenScanner = () => {
    setShowBarcodeScanner(true);
  };

  const handleScanResult = (code: string) => {
    setSearch(code);
  };

  const handleAddNewWithBarcode = (scannedBarcode: string) => {
    setPrefilledBarcode(scannedBarcode);
    setSelectedItemForPurchase(null);
    setShowAddModal(true);
  };

  const handleTriggerSale = (item: InventoryItem) => {
    if (onOpenSaleModal) {
      onOpenSaleModal(item);
    }
  };

  const handleTriggerPurchase = (item: InventoryItem) => {
    if (onOpenPurchaseModal) {
      onOpenPurchaseModal(item);
    } else {
      setSelectedItemForPurchase(item);
      setPrefilledBarcode(null);
      setShowAddModal(true);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
            <Package className="w-5 h-5 text-[#126A49] shrink-0" />
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="flex-1 min-w-0"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              {isUrdu ? 'اسٹاک مینیجر' : 'Stock & Inventory Management'}
            </AutoScrollText>
            <span className="text-[10px] font-bold bg-emerald-100 text-[#126A49] px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
              {state.profile.storeMode === StoreMode.SIMPLE ? 'Simple Mode' : 'Specialized Mode'}
            </span>
          </div>
          <AutoScrollText
            isUrdu={isUrdu}
            containerClassName="max-w-full mt-0.5"
            className="text-xs text-slate-500 font-medium"
          >
            {isUrdu
              ? `کل اسٹاک مالیت: ${formatMoney(totalStockValuation)}`
              : `Total Stock Valuation: ${formatMoney(totalStockValuation)}`}
          </AutoScrollText>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
          <button
            type="button"
            onClick={handleOpenScanner}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 min-w-0 overflow-hidden"
          >
            <Barcode className="w-4 h-4 text-[#126A49] shrink-0" />
            <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
              {isUrdu ? 'بارکوڈ اسکینر' : 'Scan Barcode'}
            </AutoScrollText>
          </button>

          <button
            type="button"
            onClick={() => {
              setPrefilledBarcode(null);
              setSelectedItemForPurchase(null);
              setShowAddModal(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 overflow-hidden"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full">
              {isUrdu ? 'نیا آئٹم' : 'Add Item'}
            </AutoScrollText>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-amber-900 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isUrdu
                ? `${lowStockItems.length} آئٹمز کا اسٹاک کم ہے! نیا آرڈر تیار کریں۔`
                : `${lowStockItems.length} items are running low on stock!`}{' '}
              ({lowStockItems.map((i) => i.name).join(', ')})
            </span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <input
          type="search"
          placeholder={isUrdu ? 'آئٹم کا نام، کیٹیگری یا بارکوڈ...' : 'Search by item name, category or barcode...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126A49]"
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-[#126A49] transition-colors cursor-pointer"
          title={isUrdu ? 'تلاش کریں' : 'Search'}
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Inventory Table / Cards */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs">
        <div className="divide-y divide-slate-100">
          {filteredItems.map((item) => {
            const isLow = item.quantity <= item.minStockAlert;

            return (
              <div
                key={item.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isLow ? 'bg-amber-50/40' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">{item.name}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    {isLow && (
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Low Stock
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      {isUrdu ? 'خرید:' : 'Buy:'} <strong className="text-slate-800">{formatMoney(item.purchasePrice)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {isUrdu ? 'فروخت:' : 'Sell:'} <strong className="text-[#126A49]">{formatMoney(item.salePrice)}</strong>
                    </span>
                    {item.barcode && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">Barcode: {item.barcode}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Direct Sale & Purchase Buttons and Qty Controls */}
                <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                  {/* Action 1: Add Sale / Less Stock */}
                  <button
                    type="button"
                    onClick={() => handleTriggerSale(item)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors border border-rose-200"
                    title="Less / Sale Stock"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'فروخت' : 'Sale'}</span>
                  </button>

                  {/* Action 2: Add Purchase / Restock */}
                  <button
                    type="button"
                    onClick={() => handleTriggerPurchase(item)}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors border border-emerald-200"
                    title="Add / Restock Stock"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'خریداری' : 'Purchase'}</span>
                  </button>

                  {/* Qty +/- quick stepper */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, Math.max(0, item.quantity - 1))}
                      className="w-6 h-6 rounded-lg bg-white font-black text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-black text-xs text-slate-900 min-w-[45px] text-center">
                      {formatQuantity(item.quantity, item.unit)} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-white font-black text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Restock Inventory Item Modal */}
      <AddInventoryItemModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedItemForPurchase(null);
          setPrefilledBarcode(null);
        }}
        isUrdu={isUrdu}
        state={state}
        onAddItem={handleCreateItem}
        onRecordPurchase={onRecordPurchase}
        prefilledBarcode={prefilledBarcode}
        prefilledItem={selectedItemForPurchase}
        initialMode={selectedItemForPurchase ? 'PURCHASE' : 'ADD'}
      />

      {/* Real QR & Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        isUrdu={isUrdu}
        state={state}
        onScanResult={handleScanResult}
        onOpenSaleModal={onOpenSaleModal}
        onOpenPurchaseModal={onOpenPurchaseModal}
        onAddNewWithBarcode={handleAddNewWithBarcode}
      />
    </div>
  );
};
