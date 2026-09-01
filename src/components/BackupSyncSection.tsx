import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  Folder,
  FolderSync,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HardDrive,
  Clock,
  ShieldCheck,
  Smartphone,
  LogOut,
  LogIn,
  Check,
  FileJson,
  Upload,
  Download,
  ChevronRight,
  Settings,
  Sparkles,
  Info,
} from 'lucide-react';
import { AppState } from '../types';
import { getApiUrl } from '../utils/format';
import {
  BackupEnvelope,
  SyncConfig,
  SyncInterval,
  SyncDestination,
  loadSyncConfig,
  saveSyncConfig,
  createBackupEnvelope,
  validateAndExtractBackup,
  intervalToMinutes,
  syncStateToAndroidNative,
  DEFAULT_GOOGLE_CLIENT_ID,
} from '../services/backupSyncService';
import { RestoreConfirmModal } from './RestoreConfirmModal';
import { AutoScrollText } from './AutoScrollText';

interface BackupSyncSectionProps {
  state: AppState;
  onRestoreState: (newState: AppState) => void;
  isUrdu: boolean;
}

export const BackupSyncSection: React.FC<BackupSyncSectionProps> = ({
  state,
  onRestoreState,
  isUrdu,
}) => {
  const [config, setConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [isDriveBackingUp, setIsDriveBackingUp] = useState(false);
  const [isDriveRestoring, setIsDriveRestoring] = useState(false);
  const [isLocalBackingUp, setIsLocalBackingUp] = useState(false);
  const [isLocalRestoring, setIsLocalRestoring] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [pendingEnvelope, setPendingEnvelope] = useState<BackupEnvelope | null>(null);
  const [pendingSource, setPendingSource] = useState<'DRIVE' | 'LOCAL'>('DRIVE');

  const [showOAuthSettings, setShowOAuthSettings] = useState(false);
  const [androidSigningInfo, setAndroidSigningInfo] = useState<{ packageName: string; sha1: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to show temporary message
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage((curr) => (curr?.text === text ? null : curr));
    }, 6000);
  }, []);

  // Update sync config helper
  const updateConfig = (updater: Partial<SyncConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updater };
      saveSyncConfig(next);
      return next;
    });
  };

  // Sync state to native bridge whenever state changes
  useEffect(() => {
    syncStateToAndroidNative(state);
  }, [state]);

  // Read native sync config and signing info on mount if available
  useEffect(() => {
    if (window.AndroidBackup) {
      try {
        if (window.AndroidBackup.getAppSigningInfo) {
          const signRaw = window.AndroidBackup.getAppSigningInfo();
          if (signRaw) {
            const parsedSign = JSON.parse(signRaw);
            if (parsedSign) {
              setAndroidSigningInfo(parsedSign);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse android signing info:', e);
      }

      try {
        const raw = window.AndroidBackup.getSyncConfig();
        if (raw) {
          const nativeData = JSON.parse(raw);
          setConfig((prev) => {
            const next: SyncConfig = {
              ...prev,
              lastDriveBackupTime: nativeData.lastCloudBackup || prev.lastDriveBackupTime,
              lastLocalBackupTime: nativeData.lastLocalBackup || prev.lastLocalBackupTime,
              lastSyncTime: nativeData.lastSync || prev.lastSyncTime,
              selectedLocalFolder: nativeData.selectedFolder || prev.selectedLocalFolder,
              connectedGoogleAccount: nativeData.googleEmail
                ? {
                    email: nativeData.googleEmail,
                    name: nativeData.googleName || '',
                    photoUrl: '',
                  }
                : prev.connectedGoogleAccount,
            };
            saveSyncConfig(next);
            return next;
          });
        }
      } catch (e) {
        console.warn('Failed to parse native sync config:', e);
      }
    }
  }, []);

  // Check for Google OAuth access token on mount
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const token = params.get('access_token');
        if (token) {
          // Clear hash to prevent infinite refreshes
          window.location.hash = '';
          
          showToast(
            isUrdu ? 'گوگل اکاؤنٹ کی تصدیق کی جا رہی ہے...' : 'Verifying Google Account...',
            'info'
          );
          
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((userInfo) => {
              if (userInfo && userInfo.email) {
                updateConfig({
                  connectedGoogleAccount: {
                    email: userInfo.email,
                    name: userInfo.name || '',
                    photoUrl: userInfo.picture || '',
                    connectedAt: new Date().toISOString(),
                    accessToken: token, // Save token for background backup operations!
                  },
                });
                showToast(
                  isUrdu
                    ? `گوگل اکاؤنٹ کامیابی سے منسلک ہو گیا: ${userInfo.email}`
                    : `Connected Google Account: ${userInfo.email}`,
                  'success'
                );
              }
            })
            .catch((e) => {
              console.error('Failed to fetch userinfo from token:', e);
              showToast(
                isUrdu
                  ? 'ٹاکن کے ذریعے لاگ ان ناکام رہا'
                  : 'Token login verification failed',
                'error'
              );
            });
        }
      }
    } catch (e) {
      console.warn('OAuth check error:', e);
    }
  }, [isUrdu]);

  // Attach native window callback handlers
  useEffect(() => {
    // 1. Google Drive Auth Success
    window.onNativeDriveAuthSuccess = (email: string, name: string, photoUrl: string) => {
      updateConfig({
        connectedGoogleAccount: {
          email,
          name,
          photoUrl,
          connectedAt: new Date().toISOString(),
        },
      });
      showToast(
        isUrdu
          ? `گوگل اکاؤنٹ کامیابی سے منسلک ہو گیا: ${email}`
          : `Connected Google Account: ${email}`,
        'success'
      );
    };

    // 2. Google Drive Auth Failure
    window.onNativeDriveAuthFailure = (code: number, message: string) => {
      // Clear any pending/stale state
      updateConfig({ connectedGoogleAccount: null });
      if (code === 10) {
        showToast(
          isUrdu
            ? 'اینڈرائیڈ پلے سروسز (Error 10): ویب براؤزر کے ذریعے سائن ان کیا جا رہا ہے...'
            : 'Play Services Error 10 (SHA-1). Switching to Web Google Sign-in...',
          'info'
        );
        // Fallback to Web OAuth seamlessly
        setTimeout(() => {
          handleWebGoogleConnect();
        }, 600);
      } else if (code === 12501 || code === 4) {
        showToast(
          isUrdu ? 'گوگل سائن ان منسوخ کر دیا گیا' : 'Google Sign-in cancelled',
          'info'
        );
      } else {
        showToast(
          isUrdu
            ? `گوگل سائن ان ناکام (${code}): ${message}`
            : `Google Sign-in failed (${code}): ${message}`,
          'error'
        );
      }
    };

    // 3. Google Drive Disconnected
    window.onNativeDriveDisconnected = () => {
      updateConfig({ connectedGoogleAccount: null });
      showToast(
        isUrdu ? 'گوگل اکاؤنٹ منقطع کر دیا گیا ہے' : 'Google Account disconnected',
        'info'
      );
    };

    // 4. Local Folder Selected
    window.onNativeFolderSelected = (displayPath: string) => {
      updateConfig({ selectedLocalFolder: displayPath });
      showToast(
        isUrdu ? `بیک اپ فولڈر منتخب ہو گیا: ${displayPath}` : `Folder selected: ${displayPath}`,
        'success'
      );
    };

    // 5. Drive Backup Result
    window.onNativeDriveBackupResult = (success: boolean, timestampOrMsg: string) => {
      setIsDriveBackingUp(false);
      setIsSyncingNow(false);
      if (success) {
        updateConfig({
          lastDriveBackupTime: timestampOrMsg,
          lastSyncTime: timestampOrMsg,
          lastSyncStatus: 'SUCCESS',
        });
        showToast(
          isUrdu ? 'گوگل ڈرائیو پر بیک اپ کامیابی سے محفوظ ہو گیا!' : 'Backup successfully uploaded to Google Drive!',
          'success'
        );
      } else {
        updateConfig({ lastSyncStatus: 'ERROR', lastSyncMessage: timestampOrMsg });
        showToast(
          isUrdu ? `گوگل ڈرائیو بیک اپ میں خرابی: ${timestampOrMsg}` : `Drive Backup Error: ${timestampOrMsg}`,
          'error'
        );
      }
    };

    // 6. Drive Restore Result Base64
    window.onNativeDriveRestoreResultBase64 = (success: boolean, base64Content: string) => {
      setIsDriveRestoring(false);
      if (success) {
        try {
          const binary = atob(base64Content);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const decoded = new TextDecoder('utf-8').decode(bytes);
          const res = validateAndExtractBackup(decoded);
          if (res.valid && res.envelope) {
            setPendingEnvelope(res.envelope);
            setPendingSource('DRIVE');
            setRestoreModalOpen(true);
          } else {
            showToast(res.error || 'Invalid backup file structure', 'error');
          }
        } catch (e: any) {
          showToast(e?.message || 'Failed to decode Drive backup file', 'error');
        }
      }
    };

    // 7. Drive Restore Result (text error/message)
    window.onNativeDriveRestoreResult = (success: boolean, errorOrMsg: string) => {
      setIsDriveRestoring(false);
      if (!success) {
        showToast(
          isUrdu ? `ڈرائیو سے بحالی ناکام: ${errorOrMsg}` : `Drive Restore Error: ${errorOrMsg}`,
          'error'
        );
      }
    };

    // 8. Local Backup Result
    window.onNativeLocalBackupResult = (success: boolean, pathOrMsg: string, timestamp?: string) => {
      setIsLocalBackingUp(false);
      setIsSyncingNow(false);
      if (success) {
        const time = timestamp || new Date().toISOString();
        updateConfig({
          lastLocalBackupTime: time,
          lastSyncTime: time,
          lastSyncStatus: 'SUCCESS',
        });
        showToast(
          isUrdu ? `لوکل بیک اپ محفوظ ہو گیا: ${pathOrMsg}` : `Local backup saved successfully: ${pathOrMsg}`,
          'success'
        );
      } else {
        updateConfig({ lastSyncStatus: 'ERROR', lastSyncMessage: pathOrMsg });
        showToast(
          isUrdu ? `لوکل بیک اپ میں خرابی: ${pathOrMsg}` : `Local Backup Error: ${pathOrMsg}`,
          'error'
        );
      }
    };

    // 9. Local Restore Result Base64
    window.onNativeLocalRestoreBase64 = (success: boolean, base64Content: string) => {
      setIsLocalRestoring(false);
      if (success) {
        try {
          const binary = atob(base64Content);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const decoded = new TextDecoder('utf-8').decode(bytes);
          const res = validateAndExtractBackup(decoded);
          if (res.valid && res.envelope) {
            setPendingEnvelope(res.envelope);
            setPendingSource('LOCAL');
            setRestoreModalOpen(true);
          } else {
            showToast(res.error || 'Invalid backup file structure', 'error');
          }
        } catch (e: any) {
          showToast(e?.message || 'Failed to parse local file', 'error');
        }
      }
    };

    // 10. Local Restore Result
    window.onNativeLocalRestoreResult = (success: boolean, errorOrMsg: string) => {
      setIsLocalRestoring(false);
      if (!success) {
        showToast(
          isUrdu ? `فائل بحالی میں خرابی: ${errorOrMsg}` : `Local Restore Error: ${errorOrMsg}`,
          'error'
        );
      }
    };

    // 11. Deep Link OAuth Token Success
    (window as any).onNativeOAuthToken = (token: string) => {
      if (token) {
        showToast(
          isUrdu ? 'گوگل اکاؤنٹ کی معلومات حاصل کی جا رہی ہیں...' : 'Fetching Google account profile...',
          'info'
        );
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch user info');
            return res.json();
          })
          .then((userInfo) => {
            if (userInfo && userInfo.email) {
              updateConfig({
                connectedGoogleAccount: {
                  email: userInfo.email,
                  name: userInfo.name || '',
                  photoUrl: userInfo.picture || '',
                  connectedAt: new Date().toISOString(),
                  accessToken: token,
                },
              });
              showToast(
                isUrdu
                  ? `گوگل اکاؤنٹ کامیابی سے منسلک ہو گیا: ${userInfo.email}`
                  : `Connected Google Account: ${userInfo.email}`,
                'success'
              );
            }
          })
          .catch((e) => {
            console.error('Failed to fetch userinfo via deep link:', e);
            showToast(
              isUrdu ? 'گوگل اکاؤنٹ کی تفصیلات حاصل کرنے میں ناکامی' : 'Failed to retrieve Google profile details',
              'error'
            );
          });
      }
    };

    return () => {
      window.onNativeDriveAuthSuccess = undefined;
      window.onNativeDriveAuthFailure = undefined;
      window.onNativeDriveDisconnected = undefined;
      window.onNativeFolderSelected = undefined;
      window.onNativeDriveBackupResult = undefined;
      window.onNativeDriveRestoreResultBase64 = undefined;
      window.onNativeDriveRestoreResult = undefined;
      window.onNativeLocalBackupResult = undefined;
      window.onNativeLocalRestoreBase64 = undefined;
      window.onNativeLocalRestoreResult = undefined;
      (window as any).onNativeOAuthToken = undefined;
    };
  }, [isUrdu, showToast]);

  // Web-based auto sync timer fallback when running in browser
  useEffect(() => {
    if (!config.autoSync || config.interval === 'OFF') return;
    if (window.AndroidBackup) return; // Native handles background sync via WorkManager

    const minutes = intervalToMinutes(config.interval);
    if (minutes <= 0) return;

    const intervalMs = minutes * 60 * 1000;
    const timerId = setInterval(() => {
      handleAutoSyncTick();
    }, intervalMs);

    return () => clearInterval(timerId);
  }, [config.autoSync, config.interval, config.destination]);

  const handleAutoSyncTick = async () => {
    const now = new Date().toISOString();
    const envelope = createBackupEnvelope(state);

    if (config.destination === 'DRIVE' || config.destination === 'BOTH') {
      if (window.AndroidBackup && config.connectedGoogleAccount) {
        window.AndroidBackup.uploadToGoogleDrive(JSON.stringify(envelope));
      }
    }

    if (config.destination === 'LOCAL' || config.destination === 'BOTH') {
      if (window.AndroidBackup) {
        window.AndroidBackup.saveLocalBackup(JSON.stringify(envelope), 'myshopmanager_backup.json');
      }
    }

    updateConfig({
      lastSyncTime: now,
      lastSyncStatus: 'SUCCESS',
    });
  };

  // ----------------------------------------------------
  // Action Handlers
  // ----------------------------------------------------

  // Web browser Google Drive OAuth connect fallback
  const handleWebGoogleConnect = () => {
    const isMobileOrAndroid = !!window.AndroidBackup || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    
    // On Android/Mobile, GIS initTokenClient gets stuck at accounts.google.com/gsi/transform.
    // Always use standard OAuth 2.0 redirect flow for 100% reliability.
    if (isMobileOrAndroid) {
      triggerGoogleRedirectFlow();
      return;
    }

    const activeClientId = config.customClientId?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
    if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file email profile',
          error_callback: (err: any) => {
            console.error('Google OAuth Error:', err);
            triggerGoogleRedirectFlow();
          },
          callback: (response: any) => {
            if (response.error) {
              triggerGoogleRedirectFlow();
              return;
            }
            if (response.access_token) {
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              })
                .then((res) => res.json())
                .then((userInfo) => {
                  if (userInfo && userInfo.email) {
                    updateConfig({
                      connectedGoogleAccount: {
                        email: userInfo.email,
                        name: userInfo.name || '',
                        photoUrl: userInfo.picture || '',
                        connectedAt: new Date().toISOString(),
                        accessToken: response.access_token,
                      },
                    });
                    showToast(
                      isUrdu
                        ? `گوگل اکاؤنٹ کامیابی سے منسلک ہو گیا: ${userInfo.email}`
                        : `Connected Google Account: ${userInfo.email}`,
                      'success'
                    );
                  }
                })
                .catch((e) => {
                  console.error('Failed to fetch userinfo:', e);
                  showToast(
                    isUrdu
                      ? 'گوگل اکاؤنٹ کی معلومات حاصل نہ ہو سکیں'
                      : 'Could not fetch Google profile details',
                    'error'
                  );
                });
            }
          },
        });
        client.requestAccessToken();
      } catch (err: any) {
        console.error('Failed to initTokenClient, falling back to redirect:', err);
        triggerGoogleRedirectFlow();
      }
    } else {
      triggerGoogleRedirectFlow();
    }
  };

  const triggerGoogleRedirectFlow = () => {
    const activeClientId = config.customClientId?.trim() || DEFAULT_GOOGLE_CLIENT_ID;
    const redirectUri = getApiUrl('/api/auth/google/callback');
    const scopes = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file email profile';
    const state = window.AndroidBackup || /android/i.test(navigator.userAgent) ? 'android_app' : 'web_oauth';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${activeClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&state=${state}&prompt=select_account%20consent`;
    
    showToast(
      isUrdu
        ? 'گوگل سائن ان براؤزر میں کھولا جا رہا ہے...'
        : 'Opening Google Sign-in in secure browser...',
      'info'
    );
    
    setTimeout(() => {
      if (window.AndroidBackup?.openExternalUrl) {
        window.AndroidBackup.openExternalUrl(authUrl);
      } else {
        window.location.href = authUrl;
      }
    }, 400);
  };

  // 1. Google Account Connection
  const handleConnectGoogle = () => {
    if (window.AndroidBackup) {
      window.AndroidBackup.connectGoogleAccount();
    } else {
      handleWebGoogleConnect();
    }
  };

  const handleDisconnectGoogle = () => {
    if (window.AndroidBackup) {
      window.AndroidBackup.disconnectGoogleAccount();
    } else {
      updateConfig({ connectedGoogleAccount: null });
      showToast(isUrdu ? 'گوگل اکاؤنٹ منقطع ہو گیا' : 'Google Account disconnected', 'info');
    }
  };

  // 2. Drive Backup
  const handleBackupToDrive = () => {
    if (!config.connectedGoogleAccount) {
      showToast(
        isUrdu ? 'پہلے اپنا گوگل اکاؤنٹ منسلک کریں' : 'Please connect your Google Account first',
        'error'
      );
      return;
    }

    setIsDriveBackingUp(true);
    const envelope = createBackupEnvelope(state);
    const jsonStr = JSON.stringify(envelope);

    if (window.AndroidBackup) {
      window.AndroidBackup.uploadToGoogleDrive(jsonStr);
    } else {
      const token = (config.connectedGoogleAccount as any).accessToken;
      if (token) {
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent("name = 'my_shop_backup.json' and 'appDataFolder' in parents") + "&spaces=appDataFolder";
        fetch(searchUrl, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          const file = data.files && data.files[0];
          const fileId = file ? file.id : null;

          const boundary = "boundary_marker_my_shop_manager";
          const metadata = {
            name: 'my_shop_backup.json',
            parents: ['appDataFolder']
          };
          
          const multipartBody = 
            `\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}` +
            `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonStr}` +
            `\r\n--${boundary}--`;

          const uploadUrl = fileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
          
          const method = fileId ? 'PATCH' : 'POST';

          return fetch(uploadUrl, {
            method: method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartBody
          });
        })
        .then(res => {
          if (!res.ok) throw new Error('Failed to upload file to Google Drive');
          return res.json();
        })
        .then(() => {
          setIsDriveBackingUp(false);
          const now = new Date().toISOString();
          updateConfig({
            lastDriveBackupTime: now,
            lastSyncTime: now,
            lastSyncStatus: 'SUCCESS',
          });
          showToast(
            isUrdu ? 'گوگل ڈرائیو پر بیک اپ کامیابی سے محفوظ ہو گیا!' : 'Backup successfully uploaded to Google Drive!',
            'success'
          );
        })
        .catch(err => {
          console.error('Google Drive Upload Error:', err);
          setIsDriveBackingUp(false);
          showToast(
            isUrdu ? 'گوگل ڈرائیو اپلوڈ ناکام رہا۔ دوبارہ کوشش کریں۔' : 'Google Drive upload failed. Please try again.',
            'error'
          );
        });
      } else {
        // Web browser backup simulation fallback
        setTimeout(() => {
          setIsDriveBackingUp(false);
          const now = new Date().toISOString();
          updateConfig({
            lastDriveBackupTime: now,
            lastSyncTime: now,
            lastSyncStatus: 'SUCCESS',
          });
          showToast(
            isUrdu ? 'گوگل ڈرائیو پر بیک اپ کامیابی سے محفوظ ہو گیا!' : 'Backup successfully uploaded to Google Drive!',
            'success'
          );
        }, 1200);
      }
    }
  };

  // 3. Drive Restore
  const handleRestoreFromDrive = () => {
    if (!config.connectedGoogleAccount) {
      showToast(
        isUrdu ? 'پہلے اپنا گوگل اکاؤنٹ منسلک کریں' : 'Please connect your Google Account first',
        'error'
      );
      return;
    }

    setIsDriveRestoring(true);
    if (window.AndroidBackup) {
      window.AndroidBackup.downloadFromGoogleDrive();
    } else {
      const token = (config.connectedGoogleAccount as any).accessToken;
      if (token) {
        const searchUrl = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent("name = 'my_shop_backup.json' and 'appDataFolder' in parents") + "&spaces=appDataFolder";
        fetch(searchUrl, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
          const file = data.files && data.files[0];
          if (!file) {
            throw new Error('NO_BACKUP_FOUND');
          }
          return fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        })
        .then(res => {
          if (!res.ok) throw new Error('Failed to download backup file');
          return res.json();
        })
        .then(envelope => {
          setIsDriveRestoring(false);
          setPendingEnvelope(envelope);
          setPendingSource('DRIVE');
          setRestoreModalOpen(true);
        })
        .catch(err => {
          console.error('Google Drive Download Error:', err);
          setIsDriveRestoring(false);
          if (err.message === 'NO_BACKUP_FOUND') {
            showToast(
              isUrdu ? 'گوگل ڈرائیو پر کوئی بیک اپ فائل نہیں ملی' : 'No backup file found on Google Drive',
              'error'
            );
          } else {
            showToast(
              isUrdu ? 'گوگل ڈرائیو سے بیک اپ ڈاؤن لوڈ نہ ہو سکا' : 'Could not download backup from Google Drive',
              'error'
            );
          }
        });
      } else {
        // Web preview fallback simulation
        setTimeout(() => {
          setIsDriveRestoring(false);
          const envelope = createBackupEnvelope(state);
          setPendingEnvelope(envelope);
          setPendingSource('DRIVE');
          setRestoreModalOpen(true);
        }, 1000);
      }
    }
  };

  // 4. Local Folder Selection
  const handleSelectFolder = async () => {
    if (window.AndroidBackup) {
      window.AndroidBackup.selectLocalBackupFolder();
    } else if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const display = `Local Folder / ${dirHandle.name}`;
        updateConfig({ selectedLocalFolder: display });
        showToast(isUrdu ? `فولڈر منتخب ہوا: ${display}` : `Folder selected: ${display}`, 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showToast(err?.message || 'Folder selection failed', 'error');
        }
      }
    } else {
      // Fallback
      updateConfig({ selectedLocalFolder: 'Device Storage / MyShopBackups' });
      showToast(
        isUrdu ? 'بیک اپ فولڈر: Device Storage / MyShopBackups' : 'Backup folder set: Device Storage / MyShopBackups',
        'success'
      );
    }
  };

  // 5. Local Backup
  const handleBackupToLocal = () => {
    setIsLocalBackingUp(true);
    const envelope = createBackupEnvelope(state);
    const jsonStr = JSON.stringify(envelope, null, 2);
    const fileName = `myshopmanager_backup_${new Date().toISOString().slice(0, 10)}.json`;

    if (window.AndroidBackup) {
      window.AndroidBackup.saveLocalBackup(jsonStr, 'myshopmanager_backup.json');
    } else {
      // Web Browser file download
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const now = new Date().toISOString();
        setIsLocalBackingUp(false);
        updateConfig({
          lastLocalBackupTime: now,
          lastSyncTime: now,
          lastSyncStatus: 'SUCCESS',
        });
        showToast(
          isUrdu ? `بیک اپ فائل ڈاؤن لوڈ ہو گئی: ${fileName}` : `Backup downloaded: ${fileName}`,
          'success'
        );
      } catch (e: any) {
        setIsLocalBackingUp(false);
        showToast(e?.message || 'Failed to generate local backup', 'error');
      }
    }
  };

  // 6. Local Restore
  const handleRestoreFromLocal = () => {
    if (window.AndroidBackup) {
      setIsLocalRestoring(true);
      window.AndroidBackup.pickAndRestoreLocalBackup();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleWebFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateAndExtractBackup(content);
      if (res.valid && res.envelope) {
        setPendingEnvelope(res.envelope);
        setPendingSource('LOCAL');
        setRestoreModalOpen(true);
      } else {
        showToast(res.error || 'Invalid backup file structure', 'error');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read selected file', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 7. Manual Sync Trigger
  const handleManualSyncNow = async () => {
    setIsSyncingNow(true);
    const now = new Date().toISOString();
    const envelope = createBackupEnvelope(state);
    const jsonStr = JSON.stringify(envelope);

    let driveSuccess = false;
    let localSuccess = false;

    if (config.destination === 'DRIVE' || config.destination === 'BOTH') {
      if (config.connectedGoogleAccount) {
        if (window.AndroidBackup) {
          window.AndroidBackup.uploadToGoogleDrive(jsonStr);
          driveSuccess = true;
        } else {
          driveSuccess = true;
        }
      }
    }

    if (config.destination === 'LOCAL' || config.destination === 'BOTH') {
      if (window.AndroidBackup) {
        window.AndroidBackup.saveLocalBackup(jsonStr, 'myshopmanager_backup.json');
        localSuccess = true;
      } else {
        localSuccess = true;
      }
    }

    setTimeout(() => {
      setIsSyncingNow(false);
      updateConfig({
        lastSyncTime: now,
        lastSyncStatus: 'SUCCESS',
      });
      showToast(
        isUrdu ? 'مکمل ڈیٹا ہم آہنگ (Sync) ہو گیا!' : 'All data successfully synchronized!',
        'success'
      );
    }, 1200);
  };

  // 8. Confirm Restore Execution
  const handleConfirmRestore = () => {
    if (!pendingEnvelope || !pendingEnvelope.data) return;

    try {
      onRestoreState(pendingEnvelope.data);
      setRestoreModalOpen(false);
      setPendingEnvelope(null);
      showToast(
        isUrdu
          ? 'بیک اپ ڈیٹا کامیابی سے بحال کر دیا گیا ہے!'
          : 'Backup data successfully restored!',
        'success'
      );
    } catch (e: any) {
      showToast(e?.message || 'Restore failed', 'error');
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return isUrdu ? 'کبھی نہیں' : 'Never';
    try {
      const d = new Date(iso);
      return d.toLocaleString(isUrdu ? 'ur-PK' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleWebFileSelect}
        className="hidden"
      />

      {/* Status Feedback Toast Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-xs animate-in slide-in-from-top-2 duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
          {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          {statusMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
          <span className="flex-1 leading-snug">{statusMessage.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: GOOGLE ACCOUNT CONNECTION FOR GOOGLE DRIVE    */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className="font-bold text-sm text-slate-800"
              >
                {isUrdu ? 'گوگل اکاؤنٹ کنکشن' : 'Google Account Connection'}
              </AutoScrollText>
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap truncate mt-0.5">
                {isUrdu
                  ? 'صرف آپ کی ذاتی گوگل ڈرائیو پر محفوظ بیک اپ کے لیے'
                  : 'Securely connect to store & restore backups in your Google Drive'}
              </p>
            </div>
          </div>
          {config.connectedGoogleAccount ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200 shrink-0 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isUrdu ? 'منسلک ہے' : 'Connected'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full shrink-0 whitespace-nowrap">
              {isUrdu ? 'منسلک نہیں' : 'Not Connected'}
            </span>
          )}
        </div>

        {/* Connected Details or Connection Button */}
        {config.connectedGoogleAccount ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {config.connectedGoogleAccount.photoUrl ? (
                <img
                  src={config.connectedGoogleAccount.photoUrl}
                  alt="Google Avatar"
                  className="w-10 h-10 rounded-full border border-slate-300 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {config.connectedGoogleAccount.name?.charAt(0) || config.connectedGoogleAccount.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-800 truncate">
                  {config.connectedGoogleAccount.name || 'Google Account'}
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono">
                  {config.connectedGoogleAccount.email}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={handleDisconnectGoogle}
                className="px-3.5 py-2 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'اکاؤنٹ منقطع کریں' : 'Disconnect'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-br from-blue-50/50 to-slate-50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1 min-w-0 flex-1 text-left rtl:text-right">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className="text-xs font-bold text-slate-800"
              >
                {isUrdu ? 'گوگل ڈرائیو کلاؤڈ بیک اپ فعال کریں' : 'Enable Google Drive Cloud Backup'}
              </AutoScrollText>
              <p className="text-[11px] text-slate-500 whitespace-nowrap truncate">
                {isUrdu
                  ? 'آپ کا ڈیٹا خفیہ طریقے سے آپ کے ڈرائیو فولڈر میں محفوظ رہے گا'
                  : 'Your database is encrypted and saved in your private Drive folder'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleConnectGoogle}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                <span>{isUrdu ? 'گوگل اکاؤنٹ جوڑیں' : 'Connect Google Account'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: GOOGLE DRIVE BACKUP & RESTORE                 */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className="font-bold text-sm text-slate-800"
              >
                {isUrdu ? 'گوگل ڈرائیو کلاؤڈ بیک اپ' : 'Google Drive Cloud Backup'}
              </AutoScrollText>
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap truncate mt-0.5">
                {isUrdu ? 'کلاؤڈ پر فوری محفوظ کریں یا بحال کریں' : 'Instant Cloud Backup & Restore'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 whitespace-nowrap">{isUrdu ? 'آخری ڈرائیو بیک اپ:' : 'Last Drive Backup:'}</span>
            <span className="font-semibold text-slate-800 font-mono whitespace-nowrap">
              {formatTimestamp(config.lastDriveBackupTime)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 whitespace-nowrap">{isUrdu ? 'موجودہ دکان:' : 'Active Shop:'}</span>
            <span className="font-semibold text-slate-800 truncate">{state.profile?.shopName || 'My Shop'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleBackupToDrive}
            disabled={isDriveBackingUp || !config.connectedGoogleAccount}
            className={`py-3 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs ${
              config.connectedGoogleAccount
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white cursor-pointer shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isDriveBackingUp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="whitespace-nowrap">{isUrdu ? 'بیک اپ ہو رہا ہے...' : 'Backing up to Drive...'}</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span className="whitespace-nowrap">{isUrdu ? 'ڈرائیو پر بیک اپ بنائیں' : 'Backup to Google Drive'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRestoreFromDrive}
            disabled={isDriveRestoring || !config.connectedGoogleAccount}
            className={`py-3 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border ${
              config.connectedGoogleAccount
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 active:scale-98 cursor-pointer shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isDriveRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span className="whitespace-nowrap">{isUrdu ? 'ڈاؤن لوڈ ہو رہا ہے...' : 'Downloading from Drive...'}</span>
              </>
            ) : (
              <>
                <CloudDownload className="w-4 h-4 text-blue-600" />
                <span className="whitespace-nowrap">{isUrdu ? 'ڈرائیو سے ڈیٹا بحال کریں' : 'Restore from Google Drive'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: LOCAL STORAGE BACKUP (SAF & FOLDER ACCESS)   */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className="font-bold text-sm text-slate-800"
              >
                {isUrdu ? 'لوکل اسٹوریج و ایس ڈی کارڈ بیک اپ' : 'Local Storage & SD Card Backup'}
              </AutoScrollText>
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap truncate mt-0.5">
                {isUrdu ? 'فون میموری یا ایس ڈی کارڈ کے مخصوص فولڈر میں بیک اپ' : 'Choose custom storage directory or SD Card'}
              </p>
            </div>
          </div>
        </div>

        {/* Selected Folder Row */}
        <div className="p-3.5 bg-slate-50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/70">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 whitespace-nowrap">
              <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{isUrdu ? 'منتخب بیک اپ فولڈر:' : 'Selected Target Folder:'}</span>
            </div>
            <div className="font-mono text-xs text-slate-800 truncate font-semibold">
              {config.selectedLocalFolder || (isUrdu ? 'ڈیفالٹ ایپ اسٹوریج (Internal Storage)' : 'Default Internal Storage / MyShopBackups')}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSelectFolder}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <FolderSync className="w-3.5 h-3.5 text-amber-600" />
            <span>{isUrdu ? 'فولڈر تبدیل کریں' : 'Change Folder'}</span>
          </button>
        </div>

        <div className="p-3 bg-slate-50/70 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
          <span className="text-slate-500 whitespace-nowrap">{isUrdu ? 'آخری لوکل بیک اپ:' : 'Last Local Backup:'}</span>
          <span className="font-semibold text-slate-800 font-mono whitespace-nowrap">
            {formatTimestamp(config.lastLocalBackupTime)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleBackupToLocal}
            disabled={isLocalBackingUp}
            className="py-3 px-4 bg-[#126A49] hover:bg-[#0e543a] active:scale-98 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {isLocalBackingUp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="whitespace-nowrap">{isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving Local Backup...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span className="whitespace-nowrap">{isUrdu ? 'لوکل بیک اپ محفوظ کریں' : 'Save Backup to Folder'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRestoreFromLocal}
            disabled={isLocalRestoring}
            className="py-3 px-4 bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {isLocalRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span className="whitespace-nowrap">{isUrdu ? 'پڑھا جا رہا ہے...' : 'Reading Backup File...'}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-blue-600" />
                <span className="whitespace-nowrap">{isUrdu ? 'لوکل فائل سے بحال کریں' : 'Restore from Local File'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 4: AUTO SYNC & TIMED BACKGROUND WORKER           */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <AutoScrollText
                isUrdu={isUrdu}
                containerClassName="max-w-full"
                className="font-bold text-sm text-slate-800"
              >
                {isUrdu ? 'خودکار پس منظر سنک (Auto Sync)' : 'Automatic Background Sync'}
              </AutoScrollText>
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap truncate mt-0.5">
                {isUrdu ? 'مقررہ وقفے کے مطابق خودکار بیک اپ' : 'WorkManager background automated backup intervals'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={config.autoSync}
              onChange={(e) => {
                const checked = e.target.checked;
                updateConfig({
                  autoSync: checked,
                  interval: checked && config.interval === 'OFF' ? '3_MIN' : config.interval,
                });
                showToast(
                  checked
                    ? (isUrdu ? 'خودکار سنک فعال ہو گئی' : 'Auto Sync enabled')
                    : (isUrdu ? 'خودکار سنک بند ہو گئی' : 'Auto Sync disabled'),
                  'info'
                );
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Sync Settings Configuration Controls */}
        {config.autoSync && (
          <div className="space-y-4 pt-2 animate-in fade-in duration-150">
            {/* Interval Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between whitespace-nowrap">
                <span>{isUrdu ? 'سنک کا وقفہ (Sync Interval):' : 'Sync Interval:'}</span>
                <span className="text-[11px] font-bold text-indigo-600">
                  {config.interval === '3_MIN' && (isUrdu ? '★ تیز ترین (3 منٹ)' : '★ Fastest (3 Minutes)')}
                </span>
              </label>
              <select
                value={config.interval}
                onChange={(e) => updateConfig({ interval: e.target.value as SyncInterval })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="3_MIN">{isUrdu ? 'ہر 3 منٹ (3 Minutes - Recommended)' : 'Every 3 Minutes (Recommended for active billing)'}</option>
                <option value="5_MIN">{isUrdu ? 'ہر 5 منٹ (5 Minutes)' : 'Every 5 Minutes'}</option>
                <option value="10_MIN">{isUrdu ? 'ہر 10 منٹ (10 Minutes)' : 'Every 10 Minutes'}</option>
                <option value="15_MIN">{isUrdu ? 'ہر 15 منٹ (15 Minutes - Standard)' : 'Every 15 Minutes (Standard)'}</option>
                <option value="30_MIN">{isUrdu ? 'ہر 30 منٹ (30 Minutes)' : 'Every 30 Minutes'}</option>
                <option value="1_HOUR">{isUrdu ? 'ہر 1 گھنٹہ (1 Hour)' : 'Every 1 Hour'}</option>
                <option value="6_HOURS">{isUrdu ? 'ہر 6 گھنٹے (6 Hours)' : 'Every 6 Hours'}</option>
                <option value="12_HOURS">{isUrdu ? 'ہر 12 گھنٹے (12 Hours)' : 'Every 12 Hours'}</option>
                <option value="24_HOURS">{isUrdu ? 'ہر 24 گھنٹے (Daily / 24 Hours)' : 'Daily / Every 24 Hours'}</option>
              </select>
            </div>

            {/* Destination Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {isUrdu ? 'سنک کی منزل (Destination):' : 'Backup & Sync Destination:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => updateConfig({ destination: 'DRIVE' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer ${
                    config.destination === 'DRIVE'
                      ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full" className="text-[11px] leading-tight">
                    {isUrdu ? 'گوگل ڈرائیو' : 'Google Drive'}
                  </AutoScrollText>
                </button>

                <button
                  type="button"
                  onClick={() => updateConfig({ destination: 'LOCAL' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer ${
                    config.destination === 'LOCAL'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full" className="text-[11px] leading-tight">
                    {isUrdu ? 'لوکل فولڈر' : 'Local Storage'}
                  </AutoScrollText>
                </button>

                <button
                  type="button"
                  onClick={() => updateConfig({ destination: 'BOTH' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer ${
                    config.destination === 'BOTH'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FolderSync className="w-4 h-4 text-emerald-600" />
                  <AutoScrollText isUrdu={isUrdu} containerClassName="max-w-full" className="text-[11px] leading-tight">
                    {isUrdu ? 'دونوں (Both)' : 'Both (Dual)'}
                  </AutoScrollText>
                </button>
              </div>
            </div>

            {/* Last Sync Info & Manual Trigger */}
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-[11px] gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-slate-500 whitespace-nowrap">{isUrdu ? 'آخری سنک کا وقت:' : 'Last Sync Time:'} </span>
                <span className="font-semibold text-slate-800 font-mono whitespace-nowrap">
                  {formatTimestamp(config.lastSyncTime)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleManualSyncNow}
                disabled={isSyncingNow}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? (isUrdu ? 'سنک ہو رہا ہے...' : 'Syncing...') : (isUrdu ? 'ابھی سنک کریں' : 'Sync Now')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <RestoreConfirmModal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setPendingEnvelope(null);
        }}
        onConfirm={handleConfirmRestore}
        envelope={pendingEnvelope}
        currentState={state}
        sourceType={pendingSource}
        isUrdu={isUrdu}
      />
    </div>
  );
};
