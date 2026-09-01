import React from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, X, FileText, Database, Package, Users, Building2 } from 'lucide-react';
import { BackupEnvelope } from '../services/backupSyncService';
import { AppState } from '../types';

interface RestoreConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  envelope: BackupEnvelope | null;
  currentState: AppState;
  sourceType: 'DRIVE' | 'LOCAL';
  isUrdu: boolean;
  isLoading?: boolean;
}

export const RestoreConfirmModal: React.FC<RestoreConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  envelope,
  currentState,
  sourceType,
  isUrdu,
  isLoading = false,
}) => {
  if (!isOpen || !envelope) return null;

  const backupSummary = envelope.summary || {
    shopName: envelope.data?.profile?.shopName || 'Unknown Shop',
    transactionCount: envelope.data?.transactions?.length || 0,
    inventoryCount: envelope.data?.inventory?.length || 0,
    customerCount: envelope.data?.customers?.length || 0,
    supplierCount: envelope.data?.suppliers?.length || 0,
  };

  const currentSummary = {
    shopName: currentState.profile?.shopName || 'Current Shop',
    transactionCount: currentState.transactions?.length || 0,
    inventoryCount: currentState.inventory?.length || 0,
    customerCount: currentState.customers?.length || 0,
    supplierCount: currentState.suppliers?.length || 0,
  };

  const formattedBackupDate = new Date(envelope.createdAt || envelope.updatedAt || Date.now()).toLocaleString(
    isUrdu ? 'ur-PK' : 'en-US',
    { dateStyle: 'medium', timeStyle: 'short' }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-500/30">
              <RefreshCw className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isUrdu ? 'بیک اپ ڈیٹا بحال کریں' : 'Confirm Backup Restore'}
              </h3>
              <p className="text-xs text-slate-300">
                {sourceType === 'DRIVE' 
                  ? (isUrdu ? 'گوگل ڈرائیو بیک اپ' : 'Source: Google Drive Cloud') 
                  : (isUrdu ? 'لوکل فائل بیک اپ' : 'Source: Local Storage')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">
              {isUrdu ? 'اہم انتباہ: موجودہ ڈیٹا تبدیل ہو جائے گا' : 'Warning: Current data will be replaced'}
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              {isUrdu
                ? 'بیک اپ بحال کرنے سے آپ کا موجودہ کھاتہ، اسٹاک اور لین دین اس بیک اپ فائل کے ڈیٹا سے اوور رائٹ ہو جائیں گے۔'
                : 'Restoring will safely replace your current ledger, inventory, and transactions with the records stored in this backup.'}
            </p>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isUrdu ? 'ڈیٹا کا موازنہ' : 'Data Comparison'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Current State */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>{isUrdu ? 'موجودہ ڈیٹا' : 'Current on Device'}</span>
              </div>
              <div className="font-bold text-xs text-slate-800 truncate">
                {currentSummary.shopName}
              </div>
              <div className="space-y-1 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span>{isUrdu ? 'لین دین:' : 'Transactions:'}</span>
                  <span className="font-semibold text-slate-800">{currentSummary.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isUrdu ? 'اسٹاک آئٹمز:' : 'Inventory Items:'}</span>
                  <span className="font-semibold text-slate-800">{currentSummary.inventoryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isUrdu ? 'گاہک:' : 'Customers:'}</span>
                  <span className="font-semibold text-slate-800">{currentSummary.customerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isUrdu ? 'سپلائرز:' : 'Suppliers:'}</span>
                  <span className="font-semibold text-slate-800">{currentSummary.supplierCount}</span>
                </div>
              </div>
            </div>

            {/* Target Backup */}
            <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isUrdu ? 'بیک اپ فائل' : 'Restore Target'}</span>
              </div>
              <div className="font-bold text-xs text-emerald-900 truncate">
                {backupSummary.shopName}
              </div>
              <div className="space-y-1 text-[11px] text-emerald-800">
                <div className="flex justify-between">
                  <span>{isUrdu ? 'لین دین:' : 'Transactions:'}</span>
                  <span className="font-bold text-emerald-950">{backupSummary.transactionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isUrdu ? 'اسٹاک آئٹمز:' : 'Inventory Items:'}</span>
                  <span className="font-bold text-emerald-950">{backupSummary.inventoryCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isUrdu ? 'گاہک:' : 'Customers:'}</span>
                  <span className="font-bold text-emerald-950">{backupSummary.customerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isUrdu ? 'سپلائرز:' : 'Suppliers:'}</span>
                  <span className="font-bold text-emerald-950">{backupSummary.supplierCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-100/70 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">{isUrdu ? 'بیک اپ تاریخ و وقت:' : 'Backup Timestamp:'}</span>
            <span className="font-semibold text-slate-800">{formattedBackupDate}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {isUrdu ? 'منسوخ کریں' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isUrdu ? 'بحال کیا جا رہا ہے...' : 'Restoring Data...'}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{isUrdu ? 'ہاں، ڈیٹا بحال کریں' : 'Confirm & Restore'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
