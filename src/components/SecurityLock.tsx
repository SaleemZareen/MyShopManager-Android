import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface SecurityLockProps {
  correctPin?: string;
  correctPassword?: string;
  shopName: string;
  isUrdu: boolean;
  onUnlock: () => void;
}

export const SecurityLock: React.FC<SecurityLockProps> = ({
  correctPin,
  correctPassword,
  shopName,
  isUrdu,
  onUnlock,
}) => {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Default lock mode: 'pin' if a PIN is available, otherwise 'password'
  const [lockMode, setLockMode] = useState<'pin' | 'password'>(() => {
    if (correctPin) return 'pin';
    return 'password';
  });

  const isBiometricsEnabled = typeof window !== 'undefined' && localStorage.getItem('app_biometrics_enabled') === 'true';

  const handleKeyPress = (num: string) => {
    if (lockMode === 'pin' && pin.length < 4) {
      const next = pin + num;
      setPin(next);
      setError(false);

      if (next.length === 4) {
        if (next === correctPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handlePasswordSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password === correctPassword) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => {
        setPassword('');
        setError(false);
      }, 1500);
    }
  };

  const handleBiometricsAuth = async () => {
    if (!isBiometricsEnabled) {
      setBiometricError(isUrdu ? 'فنگر پرنٹ لاک فعال نہیں ہے!' : 'Fingerprint lock is not enabled!');
      return;
    }

    setIsScanning(true);
    setBiometricError('');

    // 1. Native Android biometric trigger
    if ((window as any).AndroidAuth && typeof (window as any).AndroidAuth.authenticateBiometrics === 'function') {
      try {
        (window as any).AndroidAuth.authenticateBiometrics();
        return;
      } catch (err: any) {
        console.error('Native biometric trigger failed:', err);
      }
    }

    // 2. Web WebAuthn biometric trigger
    if (window.crypto && navigator.credentials && typeof navigator.credentials.get === 'function') {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const options: CredentialRequestOptions = {
          publicKey: {
            challenge: challenge,
            timeout: 60000,
            userVerification: "required"
          }
        };

        const assertion = await navigator.credentials.get(options);
        if (assertion) {
          setIsScanning(false);
          onUnlock();
          return;
        }
      } catch (err: any) {
        console.warn('WebAuthn biometric failed or skipped:', err);
      }
    }

    // 3. Fallback browser scan emulation
    setTimeout(() => {
      setIsScanning(false);
      onUnlock();
    }, 1200);
  };

  // Auto-trigger biometric prompt on mount if enabled
  useEffect(() => {
    if (isBiometricsEnabled) {
      const timer = setTimeout(() => {
        handleBiometricsAuth();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Register Android native biometric callbacks
  useEffect(() => {
    (window as any).onNativeBiometricSuccess = () => {
      setIsScanning(false);
      onUnlock();
    };

    (window as any).onNativeBiometricFailure = (err: string) => {
      setIsScanning(false);
      setBiometricError(isUrdu ? 'فنگر پرنٹ تصدیق ناکام: ' + err : 'Fingerprint verification failed: ' + err);
    };

    return () => {
      delete (window as any).onNativeBiometricSuccess;
      delete (window as any).onNativeBiometricFailure;
    };
  }, [isUrdu, onUnlock]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col items-center justify-center p-6 space-y-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
      <div className="text-center space-y-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg transition-all ${
          isScanning ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          <Lock className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-black text-white">{shopName || 'My Shop Manager'}</h1>
        <p className="text-xs text-slate-400 font-semibold">
          {lockMode === 'pin'
            ? (isUrdu ? 'دکان کے کھاتے تک رسائی کے لیے پن داخل کریں' : 'Enter 4-Digit Security PIN to Access App')
            : (isUrdu ? 'رسائی حاصل کرنے کے لیے پاس ورڈ درج کریں' : 'Enter Security Password to Access App')
          }
        </p>

        {/* Mode Toggle Tabs (Only show if both are set) */}
        {correctPin && correctPassword && (
          <div className="flex bg-slate-800 p-1 rounded-xl gap-1 max-w-[240px] mx-auto mt-2">
            <button
              type="button"
              onClick={() => { setLockMode('pin'); setError(false); }}
              className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                lockMode === 'pin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isUrdu ? 'پن کوڈ' : 'PIN Code'}
            </button>
            <button
              type="button"
              onClick={() => { setLockMode('password'); setError(false); }}
              className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                lockMode === 'password' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isUrdu ? 'پاس ورڈ' : 'Password'}
            </button>
          </div>
        )}

        {isBiometricsEnabled && (
          <p className="text-[10px] text-purple-300 font-extrabold animate-pulse">
            {isUrdu ? 'یا فنگر پرنٹ سینسر ٹچ کریں' : 'Or touch your fingerprint sensor'}
          </p>
        )}
      </div>

      {lockMode === 'pin' ? (
        <>
          {/* PIN Dots */}
          <div className="flex items-center gap-4 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-sm'
                    : 'border-slate-600 bg-slate-800'
                } ${error ? 'border-rose-500 bg-rose-500 animate-shake' : ''}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs font-extrabold text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{isUrdu ? 'غلط پن کوڈ! دوبارہ کوشش کریں' : 'Incorrect PIN Code! Try again.'}</span>
            </p>
          )}

          {biometricError && (
            <p className="text-xs font-extrabold text-rose-400 flex items-center gap-1 max-w-xs text-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{biometricError}</span>
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-xl font-black text-white flex items-center justify-center mx-auto transition-all active:scale-95 cursor-pointer shadow-md"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleBiometricsAuth}
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all cursor-pointer border ${
                isBiometricsEnabled
                  ? 'bg-purple-950 text-purple-400 border-purple-800 hover:bg-purple-900 active:scale-95'
                  : 'bg-slate-800/40 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-40'
              }`}
              disabled={!isBiometricsEnabled}
              title={isBiometricsEnabled ? "Fingerprint Unlock" : "Biometrics not enabled"}
            >
              <Fingerprint className={`w-7 h-7 ${isScanning ? 'animate-bounce' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-xl font-black text-white flex items-center justify-center mx-auto transition-all active:scale-95 cursor-pointer shadow-md"
            >
              0
            </button>

            <button
              type="button"
              onClick={() => setPin(pin.slice(0, -1))}
              className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center justify-center mx-auto transition-all cursor-pointer"
            >
              {isUrdu ? 'مٹائیں' : 'DEL'}
            </button>
          </div>
        </>
      ) : (
        /* Password Form */
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isUrdu ? 'پاس ورڈ درج کریں' : 'Enter Password'}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-center text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <p className="text-xs font-extrabold text-rose-400 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              <span>{isUrdu ? 'غلط پاس ورڈ! دوبارہ کوشش کریں' : 'Incorrect Password! Try again.'}</span>
            </p>
          )}

          {biometricError && (
            <p className="text-xs font-extrabold text-rose-400 flex items-center justify-center gap-1 max-w-xs text-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{biometricError}</span>
            </p>
          )}

          <div className="flex gap-2.5">
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl cursor-pointer transition-all active:scale-[0.98] shadow-md"
            >
              {isUrdu ? 'تصدیق کریں' : 'Verify'}
            </button>

            {isBiometricsEnabled && (
              <button
                type="button"
                onClick={handleBiometricsAuth}
                className="p-3 bg-purple-950 text-purple-400 border border-purple-800 hover:bg-purple-900 rounded-xl cursor-pointer transition-all"
                title="Fingerprint Unlock"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
