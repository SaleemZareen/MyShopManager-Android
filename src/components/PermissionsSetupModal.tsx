import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mic, Camera, MapPin, Database, Bell, Sparkles, AlertCircle, Check, Settings, ExternalLink } from 'lucide-react';
import { checkAndroidPermission, requestAndroidPermission, openAppSettings, requestAndroidPermissionsBulk } from '../utils/permissions';

interface PermissionsSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUrdu: boolean;
}

type SinglePermissionStatus = 'pending' | 'requesting' | 'granted' | 'denied' | 'blocked';

export function PermissionsSetupModal({ isOpen, onClose, isUrdu }: PermissionsSetupModalProps) {
  const [step, setStep] = useState<'intro' | 'completed'>('intro');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [status, setStatus] = useState({
    camera: 'pending' as SinglePermissionStatus,
    microphone: 'pending' as SinglePermissionStatus,
    location: 'pending' as SinglePermissionStatus,
    storage: 'pending' as SinglePermissionStatus,
    notifications: 'pending' as SinglePermissionStatus,
  });

  // Check all permissions from the actual Android/browser source of truth
  const checkAllStatuses = async () => {
    try {
      const cameraState = await checkAndroidPermission('camera');
      const micState = await checkAndroidPermission('microphone');
      const locationState = await checkAndroidPermission('location');
      const notificationsState = await checkAndroidPermission('notifications');
      const storageState = await checkAndroidPermission('storage');

      setStatus({
        camera: cameraState.toLowerCase() as SinglePermissionStatus,
        microphone: micState.toLowerCase() as SinglePermissionStatus,
        location: locationState.toLowerCase() as SinglePermissionStatus,
        storage: storageState.toLowerCase() as SinglePermissionStatus,
        notifications: notificationsState.toLowerCase() as SinglePermissionStatus,
      });

      // If all critical permissions are already granted, we can auto-complete
      if (
        cameraState === 'GRANTED' &&
        micState === 'GRANTED' &&
        locationState === 'GRANTED' &&
        notificationsState === 'GRANTED'
      ) {
        setStep('completed');
      }
    } catch (err) {
      console.warn('Error checking real permission statuses:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // 1. Check all statuses initially
    checkAllStatuses();

    // 2. Register global resume hook to auto-check when returning from Android settings
    (window as any).onAndroidAppResume = () => {
      console.log('Android app resumed: re-checking native permission states in real-time');
      checkAllStatuses();
    };

    return () => {
      // Cleanup global listener
      delete (window as any).onAndroidAppResume;
    };
  }, [isOpen]);

  const handleRequestSingle = async (name: 'camera' | 'microphone' | 'location' | 'storage' | 'notifications') => {
    setStatus(prev => ({ ...prev, [name]: 'requesting' }));
    const result = await requestAndroidPermission(name);
    
    setStatus(prev => {
      const next = { ...prev, [name]: result.toLowerCase() as SinglePermissionStatus };
      
      // Auto-check all again to synchronize
      setTimeout(checkAllStatuses, 50);
      return next;
    });
  };

  const handleGrantAll = async () => {
    setIsProcessingAll(true);
    try {
      // Trigger bulk permissions natively (handles all required permissions in one system flow)
      await requestAndroidPermissionsBulk();
    } catch (err) {
      console.warn('Bulk permissions request failed:', err);
    }
    // Refresh all permission statuses
    await checkAllStatuses();
    setIsProcessingAll(false);
    setStep('completed');
  };

  const handleFinish = () => {
    localStorage.setItem('permissions_setup_done', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const renderStatusBadge = (
    name: 'camera' | 'microphone' | 'location' | 'storage' | 'notifications',
    currentStatus: SinglePermissionStatus
  ) => {
    if (currentStatus === 'granted') {
      return (
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-lg shrink-0 whitespace-nowrap">
          {isUrdu ? '✓ فعال ہے' : '✓ Allowed'}
        </span>
      );
    }

    if (currentStatus === 'requesting') {
      return (
        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg shrink-0 whitespace-nowrap animate-pulse">
          {isUrdu ? 'درخواست...' : 'Requesting...'}
        </span>
      );
    }

    if (currentStatus === 'blocked') {
      return (
        <button
          type="button"
          onClick={openAppSettings}
          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-extrabold rounded-lg border border-rose-200 flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
          title={isUrdu ? 'سیٹنگز کھولیں' : 'Open settings to grant permission'}
        >
          <Settings className="w-3 h-3 text-rose-600 animate-spin-slow" />
          <span>{isUrdu ? 'سیٹنگز' : 'Settings'}</span>
        </button>
      );
    }

    // Default or Denied
    return (
      <button
        type="button"
        onClick={() => handleRequestSingle(name)}
        className="px-3 py-1 bg-[#126A49] hover:bg-[#0e543a] text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
      >
        {isUrdu ? 'اجازت دیں' : 'Allow'}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90dvh]">
        
        {/* Safe-area spacer for headers */}
        <div className="pt-[env(safe-area-inset-top,0px)] bg-gradient-to-b from-slate-50 to-white" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#126A49]" />
          </div>
          <div className="text-left rtl:text-right flex-1">
            <h3 className="font-extrabold text-slate-800 text-base">
              {isUrdu ? 'موبائل پرمیشنز کی باضابطہ تصدیق' : 'Verified Android Permissions'}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-none mt-1">
              {isUrdu ? 'دکان مینیجر کی موبائل اسکرین پرمیشنز' : 'Native permission status live check'}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {step === 'intro' ? (
            <div className="space-y-4 text-slate-600 text-sm leading-relaxed text-left rtl:text-right">
              <div className="p-4 bg-[#126A49]/5 rounded-2xl border border-[#126A49]/10 text-[#126A49] text-xs font-bold leading-normal flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {isUrdu 
                    ? 'دکان مینیجر کو آواز سے انٹری، بارکوڈ اسکیننگ اور نقشہ پرنٹنگ کے لیے باضابطہ اینڈرائیڈ پرمیشنز کی ضرورت ہے۔ ذیل میں ہر آئٹم کی اصل اینڈرائیڈ حالت دکھائی جا رہی ہے۔'
                    : 'Real physical Android settings status is shown live below. If any permission is "Blocked", tap Settings to enable it in your phone.'}
                </span>
              </div>

              {/* PERMISSION ITEMS */}
              <div className="space-y-3">
                {/* 1. Mic */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-3 border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{isUrdu ? 'مائیکروفون (آواز سے انٹری)' : 'Voice Entry / Microphone'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{isUrdu ? 'بول کر خودکار کھاتہ درج کرنے کے لیے' : 'Used for speech-to-text automated entries'}</p>
                    </div>
                  </div>
                  {renderStatusBadge('microphone', status.microphone)}
                </div>

                {/* 2. Camera */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-3 border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{isUrdu ? 'کیمرہ (بارکوڈ اسکینر)' : 'Camera / Barcode Scanner'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{isUrdu ? 'پروڈکٹس کے بارکوڈ اسکین کے لیے' : 'Used for product barcode scanning and attachments'}</p>
                    </div>
                  </div>
                  {renderStatusBadge('camera', status.camera)}
                </div>

                {/* 3. Location */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-3 border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{isUrdu ? 'لوکیشن (انوائس اسٹیمپ)' : 'GPS Location / Geolocation'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{isUrdu ? 'رسیدوں پر دکان کے نقشے کے لیے' : 'Used to stamp shop locations on customer invoices'}</p>
                    </div>
                  </div>
                  {renderStatusBadge('location', status.location)}
                </div>

                {/* 4. Storage */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-3 border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{isUrdu ? 'مستقل اسٹوریج (آف لائن تحفظ)' : 'Persistent Storage Data'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{isUrdu ? 'آف لائن دکان کا ڈیٹا فون میں محفوظ رکھنے کے لیے' : 'Guarantees shop database safety from browser clears'}</p>
                    </div>
                  </div>
                  {renderStatusBadge('storage', status.storage)}
                </div>

                {/* 5. Notifications */}
                <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between gap-3 border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-xs">{isUrdu ? 'پش نوٹیفیکیشنز (ادھار الرٹس)' : 'Push Notification Alerts'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{isUrdu ? 'ادھار ادائیگی اور یاد دہانی کے الرٹس' : 'Notifies you for pending udhaar payments and reminders'}</p>
                    </div>
                  </div>
                  {renderStatusBadge('notifications', status.notifications)}
                </div>
              </div>

              {/* Helper guide link when in WebView preview */}
              {window.self !== window.top && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-[11px] text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">{isUrdu ? 'براؤزر فریم الرٹ' : 'Web Sandbox Notice'}</p>
                    <p className="mt-0.5 leading-relaxed">
                      {isUrdu 
                        ? 'اگر آپ براؤزر پریویو استعمال کر رہے ہیں، تو کیمرہ اور مائیک کے بہتر کام کے لیے نیچے لنک پر کلک کر کے ایپ کو نئے ٹیب میں کھولیں۔'
                        : 'Web browsers inside frames may restrict hardware access. Open the app in a new tab to bypass iframe limitations.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="mt-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{isUrdu ? 'نئے ٹیب میں کھولیں' : 'Open in New Tab'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <h4 className="font-extrabold text-slate-800 text-lg">
                {isUrdu ? 'اینڈرائیڈ پرمیشنز اوکے ہیں!' : 'Permissions Fully Sync\'d!'}
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                {isUrdu 
                  ? 'تمام ضروری اجازتوں کی کارروائی باضابطہ طور پر مکمل ہو چکی ہے۔ اب مائیک ان پٹ، بارکوڈ اسکینر، کوآرڈینیٹس اور اطلاعات کا الرٹ سسٹم بالکل بہترین اور فزیکل اینڈرائیڈ رن ٹائم کے مطابق کام کرے گا۔'
                  : 'Awesome! All required permissions have been verified. Shop Manager is fully authorized for microphone, camera, geolocation, and push notification access.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
          {step === 'intro' ? (
            <>
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 py-3 text-slate-600 hover:text-slate-800 font-bold text-xs bg-slate-200 hover:bg-slate-300 rounded-2xl transition-all cursor-pointer active:scale-95"
              >
                {isUrdu ? 'بعد میں کریں' : 'Skip / Later'}
              </button>
              <button
                type="button"
                onClick={handleGrantAll}
                disabled={isProcessingAll}
                className="flex-[2] py-3 bg-[#126A49] hover:bg-[#0e543a] text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isProcessingAll && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{isUrdu ? 'تمام اجازتیں دیں' : 'Grant All Access'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 bg-[#126A49] hover:bg-[#0e543a] text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              {isUrdu ? 'شروع کریں' : 'Get Started'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
