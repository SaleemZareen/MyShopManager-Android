import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AppState, InventoryItem } from '../types';
import { formatMoney } from '../utils/format';
import {
  X,
  Camera,
  Upload,
  Keyboard,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Copy,
  Check,
  RefreshCw,
  ShoppingBag,
  Zap,
  ZapOff,
  ScanLine,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';
import { checkAndroidPermission, requestAndroidPermission, openAppSettings } from '../utils/permissions';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isUrdu: boolean;
  state: AppState;
  onScanResult: (code: string, matchedItem?: InventoryItem) => void;
  onOpenSaleModal?: (item: InventoryItem) => void;
  onOpenPurchaseModal?: (item: InventoryItem) => void;
  onAddNewWithBarcode?: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  isUrdu,
  state,
  onScanResult,
  onOpenSaleModal,
  onOpenPurchaseModal,
  onAddNewWithBarcode,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(() => {
    try {
      return localStorage.getItem('my_shop_scanner_camera_id') || '';
    } catch {
      return '';
    }
  });

  // Photo Upload State
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Hardware Controls
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [supportedZoom, setSupportedZoom] = useState<{ min: number; max: number } | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const isStartingCameraRef = useRef<boolean>(false);
  const activeTabRef = useRef<'camera' | 'upload' | 'manual'>('camera');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const historyPushedRef = useRef<boolean>(false);

  const scannerRegionId = 'qr-reader-fullscreen-viewport';
  const dummyFileRegionId = 'qr-file-decoder-persistent';

  // Keep activeTabRef in sync
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Hardware USB/Bluetooth Barcode Scanner Buffer
  const barcodeGunBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Mobile Back Navigation & History Management
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ scannerModal: true }, '');
    historyPushedRef.current = true;

    const handlePopState = () => {
      historyPushedRef.current = false;
      handleModalClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    // Live App Resume synchronization for camera
    (window as any).onAndroidAppResume = async () => {
      console.log('BarcodeScannerModal resumed: checking native camera permission');
      const state = await checkAndroidPermission('camera');
      if (state === 'GRANTED') {
        setScannerError(null);
        if (activeTabRef.current === 'camera') {
          // Quickly toggle tab to force restart the camera streaming stream
          setActiveTab('manual');
          setTimeout(() => setActiveTab('camera'), 50);
        }
      }
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).onAndroidAppResume;
    };
  }, [isOpen]);

  // Web Audio Beep & Haptic
  const playBeep = useCallback(() => {
    if (soundEnabled) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 clear tone
          gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.12);
        }
      } catch {
        // Audio error silently ignored
      }
    }
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([70, 30, 70]);
      } catch {
        // ignore
      }
    }
  }, [soundEnabled]);

  // Code Found Handler
  const handleCodeFound = useCallback(
    (code: string) => {
      const cleanCode = (code || '').trim();
      if (!cleanCode) return;

      if (isHandlingScanRef.current && scannedCode === cleanCode) return;
      isHandlingScanRef.current = true;
      setTimeout(() => {
        isHandlingScanRef.current = false;
      }, 1200);

      playBeep();
      setScannedCode(cleanCode);
      setScannerError(null);

      setRecentScans((prev) => {
        if (prev.includes(cleanCode)) return prev;
        return [cleanCode, ...prev.slice(0, 7)];
      });

      const match = (state?.inventory || []).find(
        (i) => i?.barcode && i.barcode.trim().toLowerCase() === cleanCode.toLowerCase()
      );

      onScanResult(cleanCode, match);
    },
    [playBeep, scannedCode, state?.inventory, onScanResult]
  );

  // Hardware Barcode Gun Keydown Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        activeTab === 'manual'
      ) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeGunBufferRef.current.length >= 3) {
          e.preventDefault();
          const gunScannedCode = barcodeGunBufferRef.current;
          barcodeGunBufferRef.current = '';
          handleCodeFound(gunScannedCode);
        }
        barcodeGunBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          barcodeGunBufferRef.current = '';
        }
        barcodeGunBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, activeTab, handleCodeFound]);

  // Stop camera helper
  const stopCurrentCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        console.warn('Camera stop ignored:', err);
      }
    }
    videoTrackRef.current = null;
    setIsScanning(false);
    setTorchOn(false);
  };

  // Flashlight Torch
  const toggleTorch = async () => {
    const nextState = !torchOn;

    const getTrack = (): MediaStreamTrack | null => {
      if (videoTrackRef.current && videoTrackRef.current.readyState === 'live') {
        return videoTrackRef.current;
      }
      try {
        const videoEl = document.querySelector(`#${scannerRegionId} video`) as HTMLVideoElement | null;
        if (videoEl && videoEl.srcObject) {
          const stream = videoEl.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          if (track) {
            videoTrackRef.current = track;
            return track;
          }
        }
      } catch (err) {
        console.warn('Track query error:', err);
      }
      return null;
    };

    const track = getTrack();
    if (track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: nextState } as MediaTrackConstraintSet],
        });
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }
    setTorchOn(nextState);
  };

  // Zoom
  const applyZoom = async (newZoom: number) => {
    if (!videoTrackRef.current) return;
    try {
      await videoTrackRef.current.applyConstraints({
        advanced: [{ zoom: newZoom } as MediaTrackConstraintSet],
      });
      setZoomLevel(newZoom);
    } catch (err) {
      console.warn('Zoom apply failed:', err);
    }
  };

  // Switch Camera Device
  const handleSwitchCamera = useCallback(
    (targetId?: string) => {
      if (targetId) {
        setSelectedCameraId(targetId);
        try {
          localStorage.setItem('my_shop_scanner_camera_id', targetId);
        } catch {
          // ignore
        }
        return;
      }

      if (availableCameras.length > 1) {
        const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
        const nextIndex = (currentIndex + 1) % availableCameras.length;
        const nextCam = availableCameras[nextIndex];
        if (nextCam) {
          setSelectedCameraId(nextCam.id);
          try {
            localStorage.setItem('my_shop_scanner_camera_id', nextCam.id);
          } catch {
            // ignore
          }
        }
      } else {
        setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
      }
    },
    [availableCameras, selectedCameraId]
  );

  // Initialize & Manage Camera Stream
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    if (activeTab === 'camera') {
      setScannerError(null);
      setTorchOn(false);
      setZoomLevel(1);

      const startCamera = async () => {
        if (isStartingCameraRef.current) return;
        isStartingCameraRef.current = true;

        try {
          // Verify native Android camera permission before starting the browser scanner stream
          const nativeCamState = await checkAndroidPermission('camera');
          if (nativeCamState === 'BLOCKED') {
            setScannerError(
              isUrdu
                ? 'کیمرے کی اجازت مستقل طور پر بلاک ہے۔ اسے بحال کرنے کے لیے نیچے "موبائل سیٹنگز" پر کلک کریں۔'
                : 'Camera permission is permanently blocked. Please tap "Open Settings" below to allow camera access.'
            );
            setIsScanning(false);
            isStartingCameraRef.current = false;
            return;
          }

          if (nativeCamState === 'DENIED') {
            const reqResult = await requestAndroidPermission('camera');
            if (reqResult !== 'GRANTED') {
              setScannerError(
                isUrdu
                  ? 'کیمرے کی اجازت مسترد کر دی گئی۔ بارکوڈ اسکین کرنے کے لیے کیمرے کی اجازت درکار ہے۔'
                  : 'Camera permission denied. Access is required to scan barcodes.'
              );
              setIsScanning(false);
              isStartingCameraRef.current = false;
              return;
            }
          }

          await stopCurrentCamera();

          if (!isMounted || activeTabRef.current !== 'camera') {
            isStartingCameraRef.current = false;
            return;
          }

          const qrElement = document.getElementById(scannerRegionId);
          if (!qrElement) {
            isStartingCameraRef.current = false;
            return;
          }

          const html5Qrcode = new Html5Qrcode(scannerRegionId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
            ],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
            verbose: false,
          });

          html5QrcodeRef.current = html5Qrcode;

          const config = {
            fps: 30,
            aspectRatio: 1.333333,
            disableFlip: false,
          };

          let started = false;
          let lastErr: unknown = null;

          try {
            const cameras = await Html5Qrcode.getCameras().catch(() => []);
            if (cameras && cameras.length > 0) {
              if (isMounted) {
                setAvailableCameras(cameras);
              }

              let targetId = selectedCameraId;
              const hasSelected = targetId && cameras.some((c) => c.id === targetId);

              if (!hasSelected) {
                const mobileKeywords = [
                  'droidcam',
                  'iriun',
                  'camo',
                  'epoccam',
                  'phone',
                  'mobile',
                  'continuity',
                  'wireless',
                  'usb video',
                  'usb camera',
                  'external',
                  'rear',
                  'back',
                ];
                const laptopKeywords = ['integrated', 'facetime', 'internal', 'built-in', 'easycamera'];

                const mobileCam =
                  cameras.find(
                    (c) =>
                      mobileKeywords.some((k) => (c.label || '').toLowerCase().includes(k)) &&
                      !laptopKeywords.some((lk) => (c.label || '').toLowerCase().includes(lk))
                  ) ||
                  cameras.find((c) =>
                    mobileKeywords.some((k) => (c.label || '').toLowerCase().includes(k))
                  );

                if (mobileCam) {
                  targetId = mobileCam.id;
                } else if (cameras.length > 1) {
                  targetId = cameras[1].id;
                } else {
                  targetId = cameras[0].id;
                }

                if (isMounted && targetId !== selectedCameraId) {
                  setSelectedCameraId(targetId);
                }
              }

              if (isMounted && activeTabRef.current === 'camera') {
                await html5Qrcode.start(
                  targetId || cameras[0].id,
                  config,
                  (decodedText) => {
                    if (isMounted) handleCodeFound(decodedText);
                  },
                  () => {}
                );
                started = true;
              }
            }
          } catch (e1) {
            lastErr = e1;
          }

          if (!started && isMounted && activeTabRef.current === 'camera') {
            try {
              await html5Qrcode.start(
                { facingMode: cameraFacing },
                config,
                (decodedText) => {
                  if (isMounted) handleCodeFound(decodedText);
                },
                () => {}
              );
              started = true;
            } catch (e2) {
              lastErr = e2;
            }
          }

          if (!started && isMounted && activeTabRef.current === 'camera') {
            throw lastErr || new Error('Failed to start camera');
          }

          if (!isMounted || activeTabRef.current !== 'camera') {
            await stopCurrentCamera();
            isStartingCameraRef.current = false;
            return;
          }

          setIsScanning(true);

          // Get track capabilities for torch & zoom
          try {
            const videoEl = document.querySelector(`#${scannerRegionId} video`) as HTMLVideoElement | null;
            if (videoEl && videoEl.srcObject) {
              const stream = videoEl.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              if (track) {
                videoTrackRef.current = track;
                const capabilities = (track as unknown as { getCapabilities?: () => Record<string, unknown> })
                  .getCapabilities
                  ? (track as unknown as { getCapabilities: () => Record<string, unknown> }).getCapabilities()
                  : {};
                if (capabilities && 'torch' in capabilities) {
                  setHasTorch(true);
                }
                if (capabilities && 'zoom' in capabilities) {
                  const zoomObj = capabilities.zoom as { min?: number; max?: number } | undefined;
                  const zMin = zoomObj?.min || 1;
                  const zMax = zoomObj?.max || 3;
                  setSupportedZoom({ min: zMin, max: zMax });
                }
              }
            }
          } catch (capErr) {
            console.warn('Capabilities error:', capErr);
          }
        } catch (err) {
          if (!isMounted) return;
          console.warn('Camera start error:', err);
          const errStr = String(err);
          if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
            setScannerError(
              isUrdu
                ? 'کیمرے کی اجازت نہیں ملی۔ اپنے فون کی سیٹنگز (App Info) یا براؤزر میں جا کر کیمرہ کی اجازت دیں، یا تصویر اپلوڈ اور دستی کوڈ استعمال کریں۔'
                : 'Camera permission denied. Please allow Camera access in your Phone Settings (App Info) or browser, or use Photo Upload / Type Code.'
            );
          } else {
            setScannerError(
              isUrdu
                ? 'کیمرہ شروع نہیں ہو سکا۔ تصویر اپلوڈ یا دستی کوڈ سے اسکین کریں۔'
                : 'Camera unavailable. Please try Photo Upload or Type Code.'
            );
          }
          setIsScanning(false);
        } finally {
          isStartingCameraRef.current = false;
        }
      };

      const timer = setTimeout(() => {
        startCamera();
      }, 80);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        stopCurrentCamera();
      };
    } else {
      // Pause camera when tab is not 'camera'
      stopCurrentCamera();
    }
  }, [isOpen, activeTab, cameraFacing, selectedCameraId, handleCodeFound, isUrdu]);

  // Focus manual input when tab opens
  useEffect(() => {
    if (activeTab === 'manual' && manualInputRef.current) {
      const t = setTimeout(() => {
        try {
          manualInputRef.current?.focus();
        } catch {
          // ignore
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  // Clean up on unmount or modal close
  const handleModalClose = async (onComplete?: () => void) => {
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      try {
        window.history.back();
      } catch {
        // ignore
      }
    }

    await stopCurrentCamera();
    setScannedCode(null);
    setManualInput('');
    setUploadedImagePreview(null);
    setScannerError(null);
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  // Robust Multi-Engine Photo Scanner
  const processImageFile = async (file: File) => {
    if (!file) return;
    setScannerError(null);
    setIsProcessingImage(true);

    let previewUrl = '';
    try {
      previewUrl = URL.createObjectURL(file);
      setUploadedImagePreview(previewUrl);
    } catch {
      // ignore
    }

    let detectedCode: string | null = null;

    // Strategy 1: Native BarcodeDetector
    try {
      const winAny = window as unknown as {
        BarcodeDetector?: new (options?: { formats: string[] }) => {
          detect: (source: ImageBitmap | HTMLImageElement) => Promise<Array<{ rawValue: string }>>;
        };
      };
      if (winAny.BarcodeDetector && typeof window.createImageBitmap === 'function') {
        const detector = new winAny.BarcodeDetector({
          formats: [
            'ean_13',
            'ean_8',
            'code_128',
            'code_39',
            'upc_a',
            'upc_e',
            'itf',
            'qr_code',
            'data_matrix',
          ],
        });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          detectedCode = barcodes[0].rawValue;
        }
      }
    } catch (nativeErr) {
      console.warn('Native BarcodeDetector pass failed:', nativeErr);
    }

    // Strategy 2: Html5Qrcode scanFile
    if (!detectedCode) {
      try {
        const dummyEl = document.getElementById(dummyFileRegionId);
        if (dummyEl) {
          const html5Qrcode = new Html5Qrcode(dummyFileRegionId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
            ],
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
            verbose: false,
          });

          const res = await html5Qrcode.scanFile(file, false);
          if (res) {
            detectedCode = res;
          }
          try {
            html5Qrcode.clear();
          } catch {
            // ignore
          }
        }
      } catch (fileErr) {
        console.warn('Html5Qrcode scanFile fallback error:', fileErr);
      }
    }

    setIsProcessingImage(false);

    if (detectedCode) {
      handleCodeFound(detectedCode);
    } else {
      setScannerError(
        isUrdu
          ? 'اس تصویر میں کوئی بارکوڈ نہیں مل سکا۔ براہ کرم واضح اور روشن تصویر آزمائیں۔'
          : 'No valid barcode or QR code found in this photo. Please try a clearer, well-lit picture.'
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      processImageFile(files[0]);
    } catch (err) {
      console.warn('File upload handler error:', err);
      setIsProcessingImage(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleCodeFound(manualInput.trim());
    }
  };

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  // Filtered matching items for live manual search
  const manualQuery = manualInput.trim().toLowerCase();
  const manualMatches = manualQuery
    ? (state?.inventory || []).filter((item) => {
        const barcodeMatch = item?.barcode && String(item.barcode).toLowerCase().includes(manualQuery);
        const nameMatch = item?.name && String(item.name).toLowerCase().includes(manualQuery);
        return Boolean(barcodeMatch || nameMatch);
      })
    : [];

  // Matched item for the current scanned code
  const matchedItem = scannedCode
    ? (state?.inventory || []).find(
        (i) => i?.barcode && String(i.barcode).trim().toLowerCase() === scannedCode.trim().toLowerCase()
      )
    : undefined;

  if (!isOpen) return null;

  const BackIcon = isUrdu ? ArrowRight : ArrowLeft;

  const modalContent = (
    <div
      id="barcode-scanner-portal-root"
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
      className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col w-full h-[100dvh] text-slate-100 overflow-hidden select-none"
    >
      {/* SCOPED CSS: Removes HTML5-QRCode's Default White Square & Canvas Overlay */}
      <style>{`
        #qr-reader-fullscreen-viewport {
          border: none !important;
          background: transparent !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader-fullscreen-viewport video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 1.25rem !important;
          border: none !important;
        }
        #qr-reader-fullscreen-viewport__scan_region {
          border: none !important;
        }
        #qr-reader-fullscreen-viewport__scan_region video {
          border: none !important;
        }
        #qr-shaded-region {
          display: none !important;
          border-width: 0 !important;
        }
        #qr-reader-fullscreen-viewport canvas {
          display: none !important;
        }
        #qr-reader-fullscreen-viewport div[style*="border"] {
          border: none !important;
        }
      `}</style>

      {/* Permanent hidden dummy div for html5-qrcode file decoding */}
      <div id={dummyFileRegionId} style={{ display: 'none' }} />

      {/* 1. TOP APP BAR / HEADER (Pinned Right at Top: 0) */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between shrink-0 shadow-md pt-[calc(env(safe-area-inset-top,0px)+0.625rem)]">
        {/* Left: Mobile Back Button & Screen Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => handleModalClose()}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700/80 shadow-xs"
            title={isUrdu ? 'واپس جائیں (Back)' : 'Go Back'}
          >
            <BackIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold hidden xs:inline">
              {isUrdu ? 'واپس' : 'Back'}
            </span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ScanLine className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-tight">
                {isUrdu ? 'بارکوڈ و کیو آر اسکینر' : 'Barcode & QR Scanner'}
              </h2>
              <p className="text-[11px] text-slate-400 font-normal leading-none mt-0.5 truncate hidden sm:block">
                {isUrdu ? 'تیز رفتار بارکوڈ، تصویر اپلوڈ یا دستی کوڈ' : 'Live Camera, Photo Upload, or Type Code'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Sound Beep Toggle & Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? (isUrdu ? 'بیپ آواز بند کریں' : 'Mute Beep') : isUrdu ? 'بیپ آواز آن کریں' : 'Enable Beep'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors border border-slate-700/80 shadow-xs"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleModalClose()}
            title={isUrdu ? 'بند کریں' : 'Close'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 flex items-center justify-center cursor-pointer transition-colors border border-slate-700/80 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. TAB SWITCHER AS CLEAN NAV LINKS (No chunky buttons or cards) */}
      <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-3 sm:px-6 shrink-0 flex items-center justify-center gap-6 sm:gap-10">
        {/* Link 1: Live Camera */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('camera');
            setScannerError(null);
          }}
          className={`flex items-center gap-2 py-3 px-1.5 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'camera'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Camera className={`w-4 h-4 shrink-0 ${activeTab === 'camera' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>{isUrdu ? 'لائیو کیمرہ' : 'Live Camera'}</span>
        </button>

        {/* Link 2: Photo Upload */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('upload');
            setScannerError(null);
          }}
          className={`flex items-center gap-2 py-3 px-1.5 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'upload'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Upload className={`w-4 h-4 shrink-0 ${activeTab === 'upload' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>{isUrdu ? 'تصویر اپلوڈ' : 'Photo Upload'}</span>
        </button>

        {/* Link 3: Type Code */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('manual');
            setScannerError(null);
          }}
          className={`flex items-center gap-2 py-3 px-1.5 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'manual'
              ? 'border-emerald-400 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Keyboard className={`w-4 h-4 shrink-0 ${activeTab === 'manual' ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span>{isUrdu ? 'دستی کوڈ' : 'Type Code'}</span>
        </button>
      </nav>

      {/* 3. MAIN FULL-SCREEN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col items-center">
        <div className="w-full max-w-2xl flex flex-col flex-1 space-y-4">
          
          {/* TAB 1: LIVE CAMERA VIEW */}
          <div className={`space-y-3 flex-1 flex flex-col ${activeTab === 'camera' ? 'block' : 'hidden'}`}>
            {/* Camera Device Switcher Bar */}
            <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 shadow-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  {availableCameras.length > 0 ? (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => handleSwitchCamera(e.target.value)}
                      className="bg-slate-800 text-emerald-300 font-semibold text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 truncate cursor-pointer w-full"
                    >
                      {availableCameras.map((cam, idx) => {
                        const labelLower = (cam.label || '').toLowerCase();
                        const isMobile = [
                          'droidcam',
                          'iriun',
                          'camo',
                          'epoccam',
                          'phone',
                          'mobile',
                          'continuity',
                          'wireless',
                          'usb video',
                          'usb camera',
                        ].some((k) => labelLower.includes(k));
                        const isLaptop = [
                          'integrated',
                          'facetime',
                          'internal',
                          'built-in',
                          'easycamera',
                        ].some((k) => labelLower.includes(k));
                        const tag = isMobile
                          ? '📱 [Phone / فون]'
                          : isLaptop
                          ? '💻 [Laptop / لیپ ٹاپ]'
                          : `📷 [Camera ${idx + 1}]`;
                        return (
                          <option key={cam.id} value={cam.id} className="bg-slate-900 text-white">
                            {tag} {cam.label || `Camera ${idx + 1}`}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <span className="text-slate-300 text-xs font-semibold px-2">
                      {isUrdu ? `کیمرہ موڈ: ${cameraFacing === 'environment' ? 'بیک کیمرہ (Back)' : 'فرنٹ کیمرہ (Front)'}` : `Camera Mode: ${cameraFacing === 'environment' ? 'Back (Rear)' : 'Front (Selfie)'}`}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSwitchCamera()}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isUrdu ? 'بدلیں' : 'Switch'}</span>
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden min-h-[300px] sm:min-h-[360px] flex-1 flex flex-col items-center justify-center border border-slate-800 shadow-inner">
              {/* html5-qrcode mount element */}
              <div id={scannerRegionId} className="w-full h-full max-w-[500px] overflow-hidden rounded-2xl" />

              {/* SINGLE ELEGANT GREEN RETICLE (No White Box) */}
              {isScanning && !scannerError && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4 z-30">
                  <div className="w-[84%] max-w-[340px] h-44 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)] bg-emerald-500/5">
                    {/* Rounded Accent Corner Brackets */}
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-xl" />
                    {/* Laser Scan Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent absolute top-1/2 -translate-y-1/2 shadow-[0_0_12px_#34d399] animate-pulse" />
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{isUrdu ? 'بارکوڈ کیمرے کے سامنے لائیں' : 'Point camera at barcode'}</span>
                  </div>
                </div>
              )}

              {/* Ambient Light Boost Border when Flash is ON */}
              {torchOn && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl border-4 border-amber-400/40 shadow-[inset_0_0_50px_rgba(251,191,36,0.2)] z-10" />
              )}

              {/* Viewport Top Controls (Torch, Zoom, Switch) */}
              {isScanning && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl text-xs font-bold border backdrop-blur-md transition-all cursor-pointer flex items-center justify-center ${
                      torchOn
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.7)]'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title={torchOn ? (isUrdu ? 'فلیش لائٹ بند کریں' : 'Flashlight Off') : (isUrdu ? 'فلیش لائٹ آن کریں' : 'Flashlight On')}
                  >
                    {torchOn ? <Zap className="w-4 h-4 fill-current text-slate-950" /> : <ZapOff className="w-4 h-4 text-amber-400" />}
                  </button>

                  {supportedZoom && (
                    <div className="flex bg-slate-900/80 backdrop-blur-md rounded-xl p-0.5 border border-slate-700 text-white text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => applyZoom(1)}
                        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          zoomLevel === 1 ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        1x
                      </button>
                      <button
                        type="button"
                        onClick={() => applyZoom(1.5)}
                        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          zoomLevel === 1.5 ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        1.5x
                      </button>
                      <button
                        type="button"
                        onClick={() => applyZoom(2)}
                        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          zoomLevel === 2 ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        2x
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSwitchCamera()}
                    className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md text-white text-xs font-semibold p-2 rounded-xl border border-slate-700 flex items-center justify-center cursor-pointer shadow-sm"
                    title={isUrdu ? 'کیمرہ بدلیں' : 'Switch Camera'}
                  >
                    <RefreshCw className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              )}
            </div>

            {/* DEDICATED FLASHLIGHT / TORCH CONTROL BAR (Always visible in Live Camera) */}
            <div className="flex items-center justify-between p-3 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    torchOn
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                      : 'bg-slate-800 text-amber-400 border border-slate-700'
                  }`}
                >
                  {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      {isUrdu ? 'موبائل کیمرہ فلیش لائٹ' : 'Mobile Camera Flashlight'}
                    </h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-all ${
                        torchOn
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {torchOn ? (isUrdu ? '⚡ آن (ON)' : '⚡ ON') : (isUrdu ? 'بند (OFF)' : 'OFF')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {isUrdu
                      ? (torchOn
                          ? 'کم روشنی میں بارکوڈ اسکیننگ کے لیے فلیش فعال ہے'
                          : 'اندھیرے یا کم روشنی میں فلیش لائٹ آن کریں')
                      : (torchOn
                          ? 'Flash is active for low-light barcode scanning'
                          : 'Turn ON flash for low-light environments')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTorch}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                  torchOn
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                    : 'bg-slate-800 hover:bg-slate-750 text-amber-300 hover:text-white border border-amber-500/30'
                }`}
              >
                <Zap className={`w-4 h-4 ${torchOn ? 'fill-current text-slate-950' : 'text-amber-400'}`} />
                <span>
                  {torchOn
                    ? (isUrdu ? 'فلیش بند کریں' : 'Turn Off')
                    : (isUrdu ? 'فلیش آن کریں' : 'Turn On')}
                </span>
              </button>
            </div>

            {/* Camera Error Recovery Card */}
            {scannerError && (
              <div className="p-4 bg-rose-950/70 border border-rose-800/80 rounded-2xl space-y-3 text-rose-100 text-xs">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">
                      {isUrdu ? 'کیمرہ رسائی کا مسئلہ' : 'Camera Access Issue'}
                    </p>
                    <p className="text-rose-200 mt-0.5">{scannerError}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUrdu ? 'تصویر اپلوڈ کریں' : 'Upload Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm border border-slate-700"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>{isUrdu ? 'دستی کوڈ لکھیں' : 'Type Barcode'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openAppSettings}
                    className="px-3.5 py-2 bg-rose-800 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm border border-rose-700"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{isUrdu ? 'موبائل سیٹنگز' : 'Open Settings'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TAB 2: PHOTO UPLOAD VIEW */}
          {activeTab === 'upload' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-md">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="portal-photo-upload-input"
              />

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-950/60 hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto transition-transform group-hover:scale-105">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm sm:text-base font-bold text-white">
                    {isUrdu ? 'بارکوڈ کی تصویر منتخب کریں' : 'Click to Upload Barcode Photo'}
                  </p>
                  <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                    {isUrdu
                      ? 'گیلری یا فائلز سے بارکوڈ کی واضح تصویر منتخب کریں'
                      : 'Supports PNG, JPG, WEBP — EAN-13, UPC, Code 128, QR Code'}
                  </p>
                </div>
              </div>

              {/* Phone Native Camera Direct Snapshot */}
              <label className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-colors text-center">
                <Camera className="w-4 h-4" />
                <span>{isUrdu ? 'موبائل کیمرے سے فوری تصویر لیں' : 'Snap Photo with Phone Camera'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Uploaded Image Preview & Scanning Status */}
              {uploadedImagePreview && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                    <img
                      src={uploadedImagePreview}
                      alt="Uploaded Barcode Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {isUrdu ? 'منتخب کردہ تصویر' : 'Selected Image'}
                    </p>
                    {isProcessingImage ? (
                      <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{isUrdu ? 'بارکوڈ تلاش کیا جا رہا ہے...' : 'Scanning photo...'}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isUrdu ? 'اسکین مکمل' : 'Scan complete'}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedImagePreview(null);
                      setScannerError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 cursor-pointer"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Upload Error Display */}
              {scannerError && (
                <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{scannerError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TYPE CODE VIEW */}
          {activeTab === 'manual' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-md">
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  {isUrdu ? 'بارکوڈ نمبر یا پروڈکٹ کا نام لکھیں:' : 'Enter Barcode Number or Product Name:'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={manualInputRef}
                      type="text"
                      placeholder="e.g. 8964000112233"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {manualInput && (
                      <button
                        type="button"
                        onClick={() => setManualInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!manualInput.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
                  >
                    {isUrdu ? 'درج کریں' : 'Submit'}
                  </button>
                </div>
              </form>

              {/* Live Inventory Auto-Suggest Match List */}
              {manualQuery && manualMatches.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <p className="text-xs font-semibold text-slate-400">
                    {isUrdu ? 'مماثل پروڈکٹس (کلک کر کے منتخب کریں):' : 'Matching Inventory Items:'}
                  </p>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {manualMatches.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.barcode) {
                            handleCodeFound(item.barcode);
                          } else {
                            handleCodeFound(item.id);
                          }
                        }}
                        className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {item.barcode ? `Barcode: ${item.barcode}` : item.category} | {isUrdu ? 'اسٹاک:' : 'Stock:'}{' '}
                            <span className="text-emerald-400 font-semibold">{item.quantity} {item.unit}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-emerald-400">{formatMoney(item.salePrice)}</p>
                          <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md mt-1 inline-block">
                            {isUrdu ? 'منتخب کریں' : 'Select'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. SCANNED RESULT CARD */}
          {scannedCode && (
            <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <span>{isUrdu ? 'بارکوڈ کوڈ اسکین ہو گیا:' : 'Barcode Code Scanned:'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(scannedCode)}
                  className="px-2.5 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? (isUrdu ? 'کاپی ہوا' : 'Copied') : isUrdu ? 'کاپی' : 'Copy'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center font-mono font-bold text-lg text-emerald-300 tracking-wider shadow-inner">
                {scannedCode}
              </div>

              {/* MATCHED PRODUCT IN STOCK */}
              {matchedItem ? (
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        {isUrdu ? '✓ اسٹاک میں موجود ہے' : '✓ Matched in Stock'}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-white mt-1.5">{matchedItem.name}</h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {isUrdu ? 'کیٹیگری:' : 'Category:'} <span className="text-slate-300">{matchedItem.category}</span> |{' '}
                        {isUrdu ? 'موجودہ اسٹاک:' : 'Stock:'}{' '}
                        <strong className="text-emerald-400 font-bold">
                          {matchedItem.quantity} {matchedItem.unit}
                        </strong>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 font-semibold">{isUrdu ? 'قیمت فروخت' : 'Sale Price'}</p>
                      <p className="text-base font-bold text-emerald-400">{formatMoney(matchedItem.salePrice)}</p>
                      <p className="text-[10px] text-slate-500">{isUrdu ? 'خرید:' : 'Cost:'} {formatMoney(matchedItem.purchasePrice)}</p>
                    </div>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleModalClose(() => {
                            if (onOpenSaleModal) {
                              onOpenSaleModal(matchedItem);
                            }
                          });
                        }}
                        className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 shrink-0" />
                        <span>{isUrdu ? '1- فروخت درج کریں (Sale)' : '1- Record Sale'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleModalClose(() => {
                            if (onOpenPurchaseModal) {
                              onOpenPurchaseModal(matchedItem);
                            }
                          });
                        }}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>{isUrdu ? '2- خریداری درج کریں (Purchase)' : '2- Record Purchase'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setScannedCode(null)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isUrdu ? 'اگلا کوڈ اسکین کریں' : 'Scan Next Code'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* UNMATCHED PRODUCT */
                <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 text-xs space-y-3">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-amber-300">
                      {isUrdu ? 'یہ بارکوڈ اسٹاک میں موجود نہیں ہے' : 'Product Not Found in Stock'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isUrdu
                        ? 'کیا آپ اس بارکوڈ کے ساتھ نیا پروڈکٹ انوینٹری میں شامل کرنا چاہتے ہیں؟'
                        : 'Would you like to register this barcode into your inventory items?'}
                    </p>
                  </div>

                  {onAddNewWithBarcode && (
                    <button
                      type="button"
                      onClick={() => {
                        handleModalClose(() => {
                          onAddNewWithBarcode(scannedCode);
                        });
                      }}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {isUrdu
                          ? 'اس بارکوڈ سے نیا آئٹم شامل کریں (Add to Stock)'
                          : 'Add New Item with this Barcode'}
                      </span>
                    </button>
                  )}

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setScannedCode(null)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                    >
                      {isUrdu ? 'دوبارہ اسکین کریں' : 'Scan Again'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. RECENT SCANS LIST */}
          {recentScans.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <p className="text-xs font-semibold text-slate-400">
                {isUrdu ? 'حالیہ اسکین شدہ کوڈز:' : 'Recent Scanned Codes:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {recentScans.map((code, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCodeFound(code)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/40 text-slate-300 font-mono text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
