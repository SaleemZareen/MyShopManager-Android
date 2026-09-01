import React, { useState, useEffect } from 'react';
import { AppState, ShopProfile, StoreMode } from '../types';
import { 
  Settings, Store, Lock, Download, Upload, Check, Trash2, 
  Shield, AlertTriangle, AlertCircle, ChevronDown, ChevronUp,
  FolderSync, RefreshCw, Globe, QrCode
} from 'lucide-react';
import { AutoScrollText } from './AutoScrollText';

const isRTLText = (text: string): boolean => {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
};

function validateAndMigrateBackup(payload: any): AppState {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload is not a valid JSON object.');
  }

  let version = payload.schemaVersion;
  if (version === undefined) {
    if (payload.profile && payload.transactions) {
      version = 1;
    } else {
      throw new Error('Unsupported format: Missing schemaVersion and unable to recognize as legacy v1 format.');
    }
  }

  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported schema version: Version ${version} is not supported.`);
  }

  const migrated = { ...payload };
  if (version === 1) {
    migrated.schemaVersion = 2;
    if (!migrated.taxRecord) {
      migrated.taxRecord = {
        adjustableTax: 0,
        advanceTax: 0,
        psidPayments: 0,
        bankWithholding: 0,
        utilityWithholding: 0,
        vehicleTax: 0,
        propertyTax: 0,
        otherTaxCertificates: 0,
        selectedTaxYear: '2026',
        openingOwnerEquity: {
          '2024': 120000,
          '2025': 120000,
          '2026': 120000,
        },
        openingBusinessLoanBalance: {
          '2024': 0,
          '2025': 0,
          '2026': 0,
        }
      };
    } else {
      if (!migrated.taxRecord.openingOwnerEquity) {
        migrated.taxRecord.openingOwnerEquity = {
          '2024': 120000,
          '2025': 120000,
          '2026': 120000,
        };
      }
      if (!migrated.taxRecord.openingBusinessLoanBalance) {
        migrated.taxRecord.openingBusinessLoanBalance = {
          '2024': 0,
          '2025': 0,
          '2026': 0,
        };
      }
    }
  }

  const requiredArrays = [
    'transactions',
    'inventory',
    'customers',
    'suppliers',
    'bankAccounts',
    'businessAssets',
    'personalAssets',
    'loans'
  ];

  for (const field of requiredArrays) {
    if (!Array.isArray(migrated[field])) {
      throw new Error(`Malformed backup: "${field}" is missing or is not an array.`);
    }
  }

  if (!migrated.profile || typeof migrated.profile !== 'object') {
    throw new Error('Malformed backup: "profile" object is missing or invalid.');
  }

  const seenTxIds = new Set<string>();
  for (const t of migrated.transactions) {
    if (!t || typeof t !== 'object') throw new Error('Malformed transaction entry.');
    if (typeof t.id !== 'string' || !t.id) throw new Error('Transaction ID is missing or empty.');
    if (seenTxIds.has(t.id)) throw new Error(`Duplicate transaction ID found: ${t.id}`);
    seenTxIds.add(t.id);

    if (typeof t.amount !== 'number' || isNaN(t.amount) || t.amount < 0) {
      throw new Error(`Transaction ${t.id} has an invalid or negative amount.`);
    }
    if (!t.type || typeof t.type !== 'string') {
      throw new Error(`Transaction ${t.id} has an invalid or missing type.`);
    }
    if (!t.date || typeof t.date !== 'string') {
      throw new Error(`Transaction ${t.id} has an invalid or missing date.`);
    }
  }

  for (const item of migrated.inventory) {
    if (!item || typeof item !== 'object') throw new Error('Malformed inventory item.');
    if (typeof item.id !== 'string' || !item.id) throw new Error('Inventory item ID is missing or malformed.');
    if (typeof item.purchasePrice !== 'number' || isNaN(item.purchasePrice) || item.purchasePrice < 0) {
      throw new Error(`Inventory item ${item.id} has an invalid purchase price.`);
    }
    if (typeof item.salePrice !== 'number' || isNaN(item.salePrice) || item.salePrice < 0) {
      throw new Error(`Inventory item ${item.id} has an invalid sale price.`);
    }
    if (typeof item.quantity !== 'number' || isNaN(item.quantity)) {
      throw new Error(`Inventory item ${item.id} has an invalid quantity.`);
    }
  }

  return migrated as AppState;
}

interface SettingsModuleProps {
  state: AppState;
  isUrdu: boolean;
  onUpdateProfile: (profile: ShopProfile) => void;
  onResetData: () => void;
  onRestoreState: (newState: AppState) => void;
  onNavigateToBackup?: () => void;
  onTriggerPermissionsSetup?: () => void;
  onTriggerScanner?: (context?: 'SALE' | 'PURCHASE' | 'API_URL') => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  state,
  isUrdu,
  onUpdateProfile,
  onResetData,
  onRestoreState,
  onNavigateToBackup,
  onTriggerScanner,
}) => {
  const [profile, setProfile] = useState<ShopProfile>(state.profile);
  const [pinInput, setPinInput] = useState(state.profile.pinCode || '');
  const [passwordInput, setPasswordInput] = useState(state.profile.passwordCode || '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [customApiUrl, setCustomApiUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('my_shop_custom_api_url') || '';
    } catch {
      return '';
    }
  });

  // Sync profile when state updates from parent
  useEffect(() => {
    setProfile(state.profile);
    setPinInput(state.profile.pinCode || '');
    setPasswordInput(state.profile.passwordCode || '');
  }, [state.profile]);
  
  // Track expanded state for accordion tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'mode' | 'security' | 'connection' | 'danger' | null>(null);
  
  // Custom Confirmation Modal State for Data Wipe
  const [showWipeModal, setShowWipeModal] = useState<boolean>(false);
  const [wipeConfirmText, setWipeConfirmText] = useState<string>('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...profile,
      pinCode: pinInput.trim() || undefined,
      passwordCode: passwordInput.trim() || undefined,
    };
    onUpdateProfile(updated);
    setSaveMessage(isUrdu ? 'ترتیبات کامیابی سے محفوظ ہو گئیں' : 'Settings saved successfully!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const executeWipeAndStartFresh = () => {
    onResetData();
    setShowWipeModal(false);
    setWipeConfirmText('');
    setActiveTab(null);
    setSaveMessage(isUrdu ? 'تمام ڈیٹا صاف کر کے نیا آغاز کر دیا گیا ہے!' : 'All data wiped and fresh application loaded!');
    setTimeout(() => setSaveMessage(null), 4000);
  };

  // Toggle active tab function helper
  const toggleTab = (tab: 'profile' | 'mode' | 'security' | 'connection' | 'danger') => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="space-y-4 pb-24 text-left rtl:text-right">
      {saveMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-[#126A49] font-bold text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* ----------------- INLINE ACCORDION SECTION LIST ----------------- */}
      <div className="divide-y divide-slate-100">
        
        {/* Row 1: Shop Profile */}
        <div className="py-2 transition-all duration-200">
          <div 
            onClick={() => toggleTab('profile')}
            className="py-3 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-all active:scale-[0.985] duration-75"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-[#126A49] rounded-xl shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {isUrdu ? 'دکان کا پروفائل (Shop Profile)' : 'Shop Profile Information'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isUrdu ? 'دکان کا نام، مالک کا نام، این ٹی این اور پتہ تبدیل کریں' : 'Edit shop details, owner info, NTN, CNIC and address'}
                </p>
              </div>
            </div>
            <div className="text-slate-400 transition-transform duration-200">
              {activeTab === 'profile' ? <ChevronUp className="w-5 h-5 text-[#126A49]" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {activeTab === 'profile' && (
            <div className="py-4 px-1 space-y-4 animate-in fade-in duration-150">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-medium">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isUrdu ? 'دکان کا نام:' : 'Shop Name:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.shopName}
                      onChange={(e) => setProfile({ ...profile, shopName: e.target.value })}
                      dir={isRTLText(profile.shopName) ? 'rtl' : 'ltr'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[#126A49] outline-none transition-all ${
                        isRTLText(profile.shopName) ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isUrdu ? 'دکاندار کا نام:' : 'Owner Name:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.ownerName}
                      onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                      dir={isRTLText(profile.ownerName) ? 'rtl' : 'ltr'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[#126A49] outline-none transition-all ${
                        isRTLText(profile.ownerName) ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isUrdu ? 'موبائل نمبر:' : 'Mobile Number:'}
                    </label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      dir={isRTLText(profile.phone) ? 'rtl' : 'ltr'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[#126A49] outline-none transition-all ${
                        isRTLText(profile.phone) ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isUrdu ? 'شناختی کارڈ (CNIC):' : 'CNIC Number:'}
                    </label>
                    <input
                      type="text"
                      value={profile.cnic}
                      onChange={(e) => setProfile({ ...profile, cnic: e.target.value })}
                      dir={isRTLText(profile.cnic) ? 'rtl' : 'ltr'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[#126A49] outline-none transition-all ${
                        isRTLText(profile.cnic) ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isUrdu ? 'این ٹی این (NTN Number):' : 'NTN Number:'}
                    </label>
                    <input
                      type="text"
                      value={profile.ntn}
                      onChange={(e) => setProfile({ ...profile, ntn: e.target.value })}
                      dir={isRTLText(profile.ntn) ? 'rtl' : 'ltr'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[#126A49] outline-none transition-all ${
                        isRTLText(profile.ntn) ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {isUrdu ? 'دکان کا پتہ:' : 'Shop Address:'}
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      dir={isRTLText(profile.address) ? 'rtl' : 'ltr'}
                      className={`w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[#126A49] outline-none transition-all ${
                        isRTLText(profile.address) ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] shadow-xs"
                  >
                    {isUrdu ? 'تبدیلیاں محفوظ کریں' : 'Save Profile Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(null)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>{isUrdu ? 'بند کریں' : 'Collapse'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Row 2: Store Mode */}
        <div className="py-2 transition-all duration-200">
          <div 
            onClick={() => toggleTab('mode')}
            className="py-3 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-all active:scale-[0.985] duration-75"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {isUrdu ? 'دکان کا آپریٹنگ موڈ (Store Mode)' : 'Select Store Operating Mode'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isUrdu ? 'سادہ ریٹیل موڈ بمقابلہ مخصوص کسٹمرز لیجر موڈ' : 'Choose between Simple Retail mode or Specialized wholesale mode'}
                </p>
              </div>
            </div>
            <div className="text-slate-400 transition-transform duration-200">
              {activeTab === 'mode' ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {activeTab === 'mode' && (
            <div className="py-4 px-1 space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {isUrdu 
                  ? 'دکان کا موڈ تبدیل کرنے سے پورے انٹرفیس کی فیلڈز اور لے آؤٹ اس کاروبار کے معیار کے مطابق ڈھل جاتے ہیں۔' 
                  : 'Changing store operating mode immediately fine-tunes database layouts and inputs tailored to your specific business format.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div
                  onClick={() => setProfile({ ...profile, storeMode: StoreMode.SIMPLE })}
                  className={`p-4 rounded-2xl text-left rtl:text-right transition-all cursor-pointer active:scale-[0.98] ${
                    profile.storeMode === StoreMode.SIMPLE
                      ? 'bg-emerald-50/60 text-slate-900 font-bold'
                      : 'bg-slate-50/60 text-slate-700'
                  }`}
                >
                  <h4 className="font-bold text-xs text-[#126A49] flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-[#126A49] flex items-center justify-center p-0.5 shrink-0">
                      {profile.storeMode === StoreMode.SIMPLE && <span className="w-full h-full rounded-full bg-[#126A49]" />}
                    </span>
                    <span>{isUrdu ? 'سادہ ریٹیل موڈ (Simple Retail)' : 'Simple Retail Mode'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    {isUrdu
                      ? 'جنرل اسٹور، کریانہ، پرچون، گروسری دکان کے لیے انتہائی تیز اور سادہ ترین بلنگ سسٹم'
                      : 'Tailored for general stores, grocery, and retail shops. Instant invoices and high-speed workflow.'}
                  </p>
                </div>

                <div
                  onClick={() => setProfile({ ...profile, storeMode: StoreMode.SPECIALIZED })}
                  className={`p-4 rounded-2xl text-left rtl:text-right transition-all cursor-pointer active:scale-[0.98] ${
                    profile.storeMode === StoreMode.SPECIALIZED
                      ? 'bg-emerald-50/60 text-slate-900 font-bold'
                      : 'bg-slate-50/60 text-slate-700'
                  }`}
                >
                  <h4 className="font-bold text-xs text-[#126A49] flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-[#126A49] flex items-center justify-center p-0.5 shrink-0">
                      {profile.storeMode === StoreMode.SPECIALIZED && <span className="w-full h-full rounded-full bg-[#126A49]" />}
                    </span>
                    <span>{isUrdu ? 'مخصوص اسٹور موڈ (Specialized Store)' : 'Specialized Store Mode'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                    {isUrdu
                      ? 'موبائل شاپ، فارمیسی، کپڑے، ہارڈویئر، الیکٹرانکس کی انوینٹری، فلیٹ پارٹیز اور بارکوڈ مینیجر'
                      : 'Designed for mobile, electronics, clothing, pharmacy, or hardware. Features heavy ledger/party options & barcode tracking.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] shadow-xs"
                >
                  {isUrdu ? 'موڈ کی ترتیبات محفوظ کریں' : 'Save Operational Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>{isUrdu ? 'بند کریں' : 'Collapse'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Security PIN Lock */}
        <div className="py-2 transition-all duration-200">
          <div 
            onClick={() => toggleTab('security')}
            className="py-3 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 transition-all active:scale-[0.985] duration-75"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {isUrdu ? 'سیکیورٹی پن لاک (Security PIN Lock)' : 'Security PIN Code Lock'}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isUrdu ? 'ایپلی کیشن کی حفاظت کے لیے 4 ہندسوں کا خفیہ پن لگائیں' : 'Manage 4-digit security code lock for unauthorized users'}
                </p>
              </div>
            </div>
            <div className="text-slate-400 transition-transform duration-200">
              {activeTab === 'security' ? <ChevronUp className="w-5 h-5 text-rose-600" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {activeTab === 'security' && (
            <div className="py-4 px-1 space-y-6 animate-in fade-in duration-150">
              {/* PIN Code Configuration */}
              <div className="space-y-3">
                <div className="space-y-1 text-left rtl:text-right">
                  <label className="block text-xs font-bold text-slate-800">
                    {isUrdu ? '4 ہندسوں کا پن کوڈ درج کریں:' : 'Set 4-Digit PIN Lock:'}
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isUrdu
                      ? 'ہر بار ایپلیکیشن اوپن کرنے پر یہ 4 ہندسوں کا کوڈ دینا لازمی ہوگا۔ اسے خالی چھوڑنے پر پن لاک لاگو نہیں ہوگا۔'
                      : 'Enter a 4-digit numeric code to protect your ledger data. Keep it blank if you do not want a PIN lock.'}
                  </p>
                </div>

                <div className="flex justify-center py-1">
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full max-w-xs px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-center tracking-widest font-bold text-lg focus:ring-2 focus:ring-[#126A49] outline-none"
                  />
                </div>
              </div>

              {/* Alphanumeric Password Configuration */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="space-y-1 text-left rtl:text-right">
                  <label className="block text-xs font-bold text-slate-800">
                    {isUrdu ? 'سیکیورٹی پاس ورڈ درج کریں (حروف اور نمبر):' : 'Set Alphanumeric Password Lock:'}
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {isUrdu
                      ? 'پن کے علاوہ آپ حروف اور ہندسوں پر مشتمل پاس ورڈ بھی منتخب کر سکتے ہیں۔ اسے خالی چھوڑنے پر کوئی پاس ورڈ نہیں مانگا جائے گا۔'
                      : 'Set a custom alphanumeric text password (letters, numbers) to protect your application. Keep it blank to disable password lock.'}
                  </p>
                </div>

                <div className="flex justify-center py-1">
                  <input
                    type="text"
                    placeholder="e.g. MyLedger123"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full max-w-xs px-4 py-3 bg-white border border-slate-200 rounded-xl text-center font-bold text-sm focus:ring-2 focus:ring-[#126A49] outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] shadow-xs"
                >
                  {isUrdu ? 'سیکیورٹی ترتیبات محفوظ کریں' : 'Save Security Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>{isUrdu ? 'بند کریں' : 'Collapse'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Backup, Restore & Auto Sync Page Link */}
        <div className="py-2 transition-all duration-200">
          <div 
            onClick={() => {
              if (onNavigateToBackup) onNavigateToBackup();
            }}
            className="py-3 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-all active:scale-[0.985] duration-75 min-w-0 overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                <FolderSync className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0">
                  <AutoScrollText
                    isUrdu={isUrdu}
                    containerClassName="flex-1 min-w-0"
                    className="font-bold text-sm text-slate-800"
                  >
                    {isUrdu ? 'بیک اپ، ری سٹور اور سنک' : 'Backup, Restore & Auto Sync'}
                  </AutoScrollText>
                  <span className="px-2 py-0.5 bg-blue-100/70 text-blue-700 text-[10px] font-extrabold rounded-md shrink-0">
                    {isUrdu ? 'نیا صفحہ' : 'Page'}
                  </span>
                </div>
                <AutoScrollText
                  isUrdu={isUrdu}
                  containerClassName="max-w-full mt-0.5"
                  className="text-[11px] text-slate-400 font-medium"
                >
                  {isUrdu ? 'گوگل ڈرائیو کلاؤڈ، لوکل اسٹوریج/ایس ڈی کارڈ اور خودکار سنک صفحہ کھولیں' : 'Open dedicated Google Drive Cloud, Local SD Card & Background Sync page'}
                </AutoScrollText>
              </div>
            </div>
            <div className="text-slate-400 shrink-0">
              <ChevronDown className="w-5 h-5 -rotate-90 rtl:rotate-90 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Row 5: Danger Zone */}
        <div className="py-2 transition-all duration-200">
          <div 
            onClick={() => toggleTab('danger')}
            className="p-3.5 px-1 flex items-center justify-between gap-3 cursor-pointer hover:bg-rose-50/50 transition-all active:scale-[0.985] duration-75"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-800">
                  {isUrdu ? 'خطرناک زون (Danger Zone - Wipe Data)' : 'Danger Zone / Reset Application'}
                </h3>
                <p className="text-[11px] text-rose-500/80 font-medium">
                  {isUrdu ? 'ایپلیکیشن کا تمام ڈیٹا صاف کریں اور نیا کاروبار شروع کریں' : 'Wipe all shop data, transactions, inventory, and start fully fresh'}
                </p>
              </div>
            </div>
            <div className="text-rose-400 transition-transform duration-200">
              {activeTab === 'danger' ? <ChevronUp className="w-5 h-5 text-rose-600" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {activeTab === 'danger' && (
            <div className="py-4 px-1 space-y-4 animate-in fade-in duration-150">
              <div className="p-4 bg-rose-50 rounded-2xl text-left rtl:text-right">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 font-medium leading-relaxed">
                    <p className="font-bold text-rose-950">
                      {isUrdu ? 'انتباہ (Irreversible Action):' : 'CRITICAL WARNING:'}
                    </p>
                    <p className="mt-1 text-[11px] text-rose-800">
                      {isUrdu
                        ? 'اس بٹن پر کلک کرنے سے آپ کی دکان کا نام، تمام فروخت، کسٹمرز کے کھاتے، سپلائرز کی ادائیگیاں، اور انوینٹری کا سارا سٹاک مکمل طور پر ختم ہو جائے گا اور اسے واپس نہیں لایا جا سکے گا۔'
                        : 'This action cannot be undone. Clicking this will permanently delete all cash/bank ledger, inventory, customers balances, bills and reset your shop to its fresh installation stage.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowWipeModal(true); setWipeConfirmText(''); }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isUrdu ? 'تمام ڈیٹا مستقل طور پر حذف کریں' : 'Wipe All Data & Start Fresh'}</span>
              </button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab(null)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>{isUrdu ? 'بند کریں' : 'Collapse'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ----------------- SECURE OVERLAY MODAL: DATA WIPE CONFIRMATION ----------------- */}
      {showWipeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">
                {isUrdu ? 'حتمی تصدیق درکار ہے' : 'Security Verification'}
              </h3>
            </div>

            <div className="text-[11px] text-slate-500 leading-normal font-medium text-left rtl:text-right space-y-2">
              <p>
                {isUrdu
                  ? 'برائے کرم تصدیق کریں کہ آپ یہ خود کر رہے ہیں۔ دکان کا ڈیٹا مستقل صاف کرنے کے لیے نیچے دیے گئے فیلڈ میں بڑے حروف میں '
                  : 'To confirm that you want to wipe all records, please type '}
                <strong className="text-rose-600 font-mono font-bold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">DELETE</strong> 
                {isUrdu ? ' لکھیں:' : ' in the field below:'}
              </p>
            </div>

            <input
              type="text"
              placeholder="DELETE"
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center tracking-widest font-bold text-sm focus:ring-2 focus:ring-rose-500 outline-none"
            />

            <div className="flex gap-2 text-xs pt-1">
              <button
                type="button"
                onClick={() => { setShowWipeModal(false); setWipeConfirmText(''); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                {isUrdu ? 'کینسل کریں' : 'Cancel'}
              </button>
              
              <button
                type="button"
                disabled={wipeConfirmText !== 'DELETE'}
                onClick={executeWipeAndStartFresh}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-all ${
                  wipeConfirmText === 'DELETE'
                    ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer active:scale-[0.98]'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                {isUrdu ? 'صاف کریں' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
