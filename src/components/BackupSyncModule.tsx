import React from 'react';
import { AppState } from '../types';
import { BackupSyncSection } from './BackupSyncSection';
import { FolderSync, Shield, Download, ArrowLeft, ArrowRight } from 'lucide-react';
import { AutoScrollText } from './AutoScrollText';

interface BackupSyncModuleProps {
  state: AppState;
  isUrdu: boolean;
  onRestoreState: (newState: AppState) => void;
  onBack?: () => void;
}

export const BackupSyncModule: React.FC<BackupSyncModuleProps> = ({
  state,
  isUrdu,
  onRestoreState,
  onBack,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4 pb-24 text-left rtl:text-right max-w-5xl mx-auto">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto overflow-hidden">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title={isUrdu ? 'واپس جائیں' : 'Go Back'}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer shrink-0"
            >
              {isUrdu ? <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
            </button>
          )}
          <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-emerald-700 to-teal-600 text-white rounded-xl shadow-xs shrink-0">
            <FolderSync className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className="text-xs sm:text-sm font-bold text-slate-900 leading-tight"
            >
              {isUrdu ? 'بیک اپ، ری سٹور اور خودکار سنک' : 'Backup, Restore & Auto Sync'}
            </AutoScrollText>
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full mt-0.5"
              className="text-[10px] sm:text-[11px] text-slate-500 font-medium"
            >
              {isUrdu
                ? 'گوگل ڈرائیو کلاؤڈ، لوکل اسٹوریج اور خودکار سنک'
                : 'Google Drive Cloud, Local Storage & Automatic Background Sync'}
            </AutoScrollText>
          </div>
        </div>

        {/* Quick Status Badges */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-end sm:self-center">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-800 text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{isUrdu ? 'محفوظ و تصدیق شدہ' : 'Verified Secure'}</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN BACKUP, RESTORE & AUTO SYNC ENGINE */}
      <div className="space-y-4">
        <BackupSyncSection
          state={state}
          onRestoreState={onRestoreState}
          isUrdu={isUrdu}
        />
      </div>

      {/* 3. NATIVE ANDROID PROJECT SOURCE CODE (ZIP) EXPORT CARD */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xs space-y-2.5 overflow-hidden">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl shrink-0">
            <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <AutoScrollText
              isUrdu={isUrdu}
              containerClassName="max-w-full"
              className="font-bold text-xs sm:text-sm text-slate-900 leading-tight"
            >
              {isUrdu ? 'اینڈرائیڈ اسٹوڈیو پروجیکٹ سورس کوڈ (ZIP)' : 'Android Studio Native Project Source Code'}
            </AutoScrollText>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">
              {isUrdu
                ? 'اپنے فون یا ٹیبلٹ کے لیے حقیقی اینڈرائیڈ ایپ بنانا چاہتے ہیں؟ آپ اس کا مکمل اینڈرائیڈ ویب ویو اور جاوا/کوٹلن پروجیکٹ سورس کوڈ ڈاؤن لوڈ کر کے اینڈرائیڈ اسٹوڈیو میں اے پی کے (APK) بنا سکتے ہیں۔'
                : 'Deploy your ledger natively on Android devices! Download the complete Android Studio Kotlin/Java WebView wrapper project source code to build and install an APK file.'}
            </p>
          </div>
        </div>

        <div className="pt-1">
          <a
            href="/MyShopManager.zip"
            download="MyShopManager.zip"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl transition-all active:scale-[0.98] shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isUrdu ? 'اینڈرائیڈ اسٹوڈیو پروجیکٹ زپ ڈاؤن لوڈ کریں' : 'Download Android Studio Project (ZIP)'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
