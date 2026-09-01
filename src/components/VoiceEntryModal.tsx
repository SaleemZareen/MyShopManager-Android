import React, { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType } from '../types';
import { Mic, MicOff, Sparkles, X, Check, Send, AlertCircle, RefreshCw, ArrowLeft, RotateCcw, ExternalLink, Settings } from 'lucide-react';
import { checkAndroidPermission, requestAndroidPermission, openAppSettings } from '../utils/permissions';
import { getApiUrl, fetchWithFailover } from '../utils/format';

interface VoiceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tx: Omit<Transaction, 'id'>) => void;
  isUrdu: boolean;
}

interface ParsedVoiceResult {
  type: TransactionType;
  amount: number;
  partyName?: string;
  category?: string;
  notes: string;
  urduSummary?: string;
}

export const VoiceEntryModal: React.FC<VoiceEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isUrdu,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedVoiceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [autoParse, setAutoParse] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const lastCapturedTextRef = useRef<string>('');
  const autoParseRef = useRef<boolean>(autoParse);
  const isListeningRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    autoParseRef.current = autoParse;
  }, [autoParse]);

  const clearSilenceTimer = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  };

  const sampleCommands = [
    'آج سیلز 20000',
    'کرایہ 12000 نقد',
    'پرچیز 35000 نیسلے ڈیپو',
    'علی بھائی سے 5000 ادھار وصولی',
    'سپلائر کو 15000 ادائیگی',
  ];

  // Initialize and Reset on modal open/close
  useEffect(() => {
    if (!isOpen) {
      clearSilenceTimer();
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    // Reset state whenever modal opens
    clearSilenceTimer();
    setInputText('');
    setTranscript('');
    setParsedData(null);
    setErrorMessage(null);
    setIsListening(false);
    isListeningRef.current = false;
    finalTranscriptRef.current = '';
    lastCapturedTextRef.current = '';

    const hasAndroidSpeech = !!(window as any).AndroidSpeech;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (hasAndroidSpeech) {
      (window as any).onAndroidSpeechStart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMessage(null);
        setPermissionGranted(true);
        lastCapturedTextRef.current = '';
        finalTranscriptRef.current = '';
      };

      (window as any).onAndroidSpeechEnd = () => {
        clearSilenceTimer();
        setIsListening(false);
        isListeningRef.current = false;
        const captured = lastCapturedTextRef.current.trim();
        if (autoParseRef.current && captured && !parsedData) {
          handleProcessText(captured);
        }
      };

      (window as any).onAndroidSpeechResult = (text: string) => {
        setTranscript(text);
        setInputText(text);
        lastCapturedTextRef.current = text;
        clearSilenceTimer();
        if (autoParseRef.current) {
          handleProcessText(text);
        }
      };

      (window as any).onAndroidSpeechPartial = (text: string) => {
        setTranscript(text);
        setInputText(text);
        lastCapturedTextRef.current = text;
      };

      (window as any).onAndroidSpeechError = (error: string) => {
        console.warn('Android speech recognition error:', error);
        clearSilenceTimer();
        setIsListening(false);
        isListeningRef.current = false;
        if (error === 'not-allowed') {
          setPermissionGranted(false);
          setErrorMessage(
            isUrdu
              ? 'مائیکروفون کی اجازت بلاکڈ ہے۔ مائیک آن کرنے کے لیے نیچے دیے گئے "سیٹنگز" بٹن پر کلک کریں اور مائیکروفون مینوئل آن کریں۔'
              : 'Microphone permission is permanently blocked. Please tap "Settings" below and allow Microphone access manually.'
          );
        } else {
          setErrorMessage(
            isUrdu
              ? 'آواز ریکارڈ کرنے میں مسئلہ پیش آیا۔ آپ نیچے براہ راست ٹیکسٹ بھی لکھ سکتے ہیں۔'
              : 'Voice capture failed. You can type your command below.'
          );
        }
      };

      const setupDone = localStorage.getItem('permissions_setup_done') === 'true';
      if (setupDone) {
        startRecordingProcess(null);
      } else {
        setPermissionGranted(null);
      }
    } else if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Continuous listening prevents cutting off mid-sentence
      recognition.interimResults = true;
      recognition.lang = isUrdu ? 'ur-PK' : 'en-PK';

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
        setErrorMessage(null);
        setPermissionGranted(true);
        lastCapturedTextRef.current = '';
        finalTranscriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let fullFinalText = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            fullFinalText += result[0].transcript + ' ';
          } else {
            interimText += result[0].transcript;
          }
        }

        finalTranscriptRef.current = fullFinalText;
        const completeSpeech = (fullFinalText + interimText).trim();

        if (completeSpeech) {
          setTranscript(completeSpeech);
          setInputText(completeSpeech);
          lastCapturedTextRef.current = completeSpeech;

          // Reset silence timer: Wait 3.2 seconds of complete silence before auto-processing
          clearSilenceTimer();
          if (autoParseRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (isListeningRef.current) {
                handleStopListening();
              }
            }, 3200);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // If no speech detected in continuous mode, don't kill immediately
          return;
        }
        clearSilenceTimer();
        setIsListening(false);
        isListeningRef.current = false;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionGranted(false);
          setErrorMessage(
            isUrdu
              ? 'مائیکروفون کی اجازت بلاکڈ ہے۔ مائیک آن کرنے کے لیے نیچے دیے گئے "اجازت دیں" بٹن پر کلک کریں یا ہاتھ سے ٹائپ کریں۔'
              : 'Microphone permission blocked. Click "Allow Mic" below or type your entry manually.'
          );
        } else {
          setErrorMessage(
            isUrdu
              ? 'آواز ریکارڈ کرنے میں مسئلہ پیش آیا۔ آپ نیچے براہ راست ٹیکسٹ بھی لکھ سکتے ہیں۔'
              : 'Voice capture failed. You can type your command below.'
          );
        }
      };

      recognition.onend = () => {
        clearSilenceTimer();
        // If the browser closed recognition but user was still speaking or wants auto-parse
        setIsListening(false);
        isListeningRef.current = false;
        const captured = lastCapturedTextRef.current.trim();
        if (autoParseRef.current && captured && !parsedData) {
          handleProcessText(captured);
        }
      };

      recognitionRef.current = recognition;

      // Only auto-start if setup is already complete and permission was already granted previously
      const setupDone = localStorage.getItem('permissions_setup_done') === 'true';
      if (setupDone) {
        startRecordingProcess(recognition);
      } else {
        setPermissionGranted(null);
      }
    } else {
      const setupDone = localStorage.getItem('permissions_setup_done') === 'true';
      if (setupDone) {
        startRecordingProcess(null);
      } else {
        setPermissionGranted(null);
      }
    }

    // Register resume listener if modal is open
    if (isOpen) {
      (window as any).onAndroidAppResume = async () => {
        console.log('VoiceEntryModal resumed: rechecking native mic state');
        const state = await checkAndroidPermission('microphone');
        if (state === 'GRANTED') {
          setPermissionGranted(true);
          setErrorMessage(null);
          startRecordingProcess(recognitionRef.current);
        }
      };
    }

    return () => {
      clearSilenceTimer();
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (hasAndroidSpeech) {
        try {
          (window as any).AndroidSpeech.stopSpeechRecognition();
        } catch (_) {}
        delete (window as any).onAndroidSpeechStart;
        delete (window as any).onAndroidSpeechEnd;
        delete (window as any).onAndroidSpeechResult;
        delete (window as any).onAndroidSpeechPartial;
        delete (window as any).onAndroidSpeechError;
      }
      delete (window as any).onAndroidAppResume;
    };
  }, [isOpen, isUrdu]);

  const startRecordingProcess = async (recInstance?: any) => {
    const rec = recInstance || recognitionRef.current;
    setErrorMessage(null);
    setParsedData(null);

    // Real native permission checks
    const nativeState = await checkAndroidPermission('microphone');
    if (nativeState === 'BLOCKED') {
      setPermissionGranted(false);
      setIsListening(false);
      setErrorMessage(
        isUrdu
          ? 'مائیکروفون کی اجازت بلاکڈ ہے۔ مائیک آن کرنے کے لیے نیچے دیے گئے "سیٹنگز" بٹن پر کلک کریں اور مائیکروفون مینوئل آن کریں۔'
          : 'Microphone permission is permanently blocked. Please tap "Settings" below and allow Microphone access manually.'
      );
      return;
    }

    if (nativeState === 'DENIED') {
      const result = await requestAndroidPermission('microphone');
      if (result !== 'GRANTED') {
        setPermissionGranted(false);
        setIsListening(false);
        setErrorMessage(
          isUrdu
            ? 'مائیکروفون کی اجازت نہیں مل سکی۔ آواز ان پٹ کے لیے مائیکروفون کی اجازت درکار ہے۔'
            : 'Microphone permission denied. Access is required for hands-free voice ledger entry.'
        );
        return;
      }
    }

    // Permission is GRANTED, proceed safely with Media Stream and speech recognition
    setPermissionGranted(true);

    const hasAndroidSpeech = !!(window as any).AndroidSpeech;
    if (hasAndroidSpeech) {
      try {
        (window as any).AndroidSpeech.startSpeechRecognition(isUrdu);
      } catch (err) {
        console.error('Failed to start Android Speech Recognition:', err);
        simulateVoiceListening();
      }
      return;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // release mic immediately, recognition will trigger it

        if (rec) {
          try {
            rec.lang = isUrdu ? 'ur-PK' : 'en-PK';
            rec.start();
          } catch (e) {
            // ignore
          }
        } else {
          simulateVoiceListening();
        }
      } catch (err) {
        console.warn('Mic getUserMedia error:', err);
        setPermissionGranted(false);
        setIsListening(false);
        setErrorMessage(
          isUrdu
            ? 'مائیکروفون رسائی میں عارضی خرابی۔ براؤزر یا ڈیوائس میڈیا کنٹرولز کی جانچ کریں۔'
            : 'Microphone acquisition failed. Please verify browser or device media inputs.'
        );
      }
    } else if (rec) {
      try {
        rec.lang = isUrdu ? 'ur-PK' : 'en-PK';
        rec.start();
      } catch (e) {
        setIsListening(false);
      }
    } else {
      simulateVoiceListening();
    }
  };

  const simulateVoiceListening = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const randomCmd = sampleCommands[Math.floor(Math.random() * sampleCommands.length)];
      setTranscript(randomCmd);
      setInputText(randomCmd);
      handleProcessText(randomCmd);
    }, 2000);
  };

  const handleStopListening = () => {
    clearSilenceTimer();
    isListeningRef.current = false;

    const hasAndroidSpeech = !!(window as any).AndroidSpeech;
    if (hasAndroidSpeech) {
      try {
        (window as any).AndroidSpeech.stopSpeechRecognition();
      } catch (err) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    const textToProcess = (lastCapturedTextRef.current || inputText || transcript).trim();
    if (textToProcess) {
      handleProcessText(textToProcess);
    }
  };

  const handleProcessText = async (textToParse?: string) => {
    const query = (textToParse || inputText || transcript).trim();
    if (!query) return;

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const res = await fetchWithFailover('/api/ai/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, isUrdu }),
      });

      const data = await res.json();
      if (data.parsed) {
        setParsedData(data.parsed);
      } else {
        throw new Error('Could not parse voice entry');
      }
    } catch (err) {
      console.error('Parsing error:', err);
      // Fallback local parser
      setParsedData(localFallbackParse(query));
    } finally {
      setIsParsing(false);
    }
  };

  const localFallbackParse = (text: string): ParsedVoiceResult => {
    let type: TransactionType = 'SALE';
    let category = 'General Goods';
    let amount = 0;

    const numMatch = text.match(/\d+/g);
    if (numMatch && numMatch.length > 0) {
      amount = parseInt(numMatch.join(''), 10);
    }

    if (text.includes('ادھار') || text.includes('وصول') || text.includes('collect')) {
      type = 'RECEIPT';
    } else if (text.includes('سپلائر') || text.includes('ادائیگی') || text.includes('supplier')) {
      type = 'PAYMENT';
    } else if (text.includes('پرچیز') || text.includes('خریداری') || text.includes('purchase')) {
      type = 'PURCHASE';
      category = 'Stock Resale';
    } else if (text.includes('کرایہ') || text.includes('خرچ') || text.includes('expense')) {
      type = 'EXPENSE';
      category = text.includes('کرایہ') ? 'SHOP_RENT' : 'MISCELLANEOUS';
    } else {
      type = 'SALE';
    }

    return {
      type,
      amount: amount || 2000,
      category,
      notes: `Voice Command: "${text}"`,
      urduSummary: `${type === 'SALE' ? 'فروخت' : 'اندراج'}: ${amount || 2000} روپے`,
    };
  };

  const handleSaveParsed = () => {
    if (!parsedData) return;

    let finalType = parsedData.type;
    if ((finalType as string) === 'UDHAAR_COLLECT') {
      finalType = 'RECEIPT';
    } else if ((finalType as string) === 'SUPPLIER_PAYMENT') {
      finalType = 'PAYMENT';
    }

    onSubmit({
      type: finalType,
      amount: parsedData.amount,
      category: parsedData.category || 'General Goods',
      paymentMethod: 'CASH',
      partyName: parsedData.partyName || undefined,
      date: new Date().toISOString(),
      notes: parsedData.notes,
    });
    onClose();
  };

  const handleCancelAndRecordNew = () => {
    setParsedData(null);
    setInputText('');
    setTranscript('');
    setErrorMessage(null);
    lastCapturedTextRef.current = '';
    setTimeout(() => {
      startRecordingProcess();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white sm:bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-0 sm:p-4 pt-[env(safe-area-inset-top,0px)] sm:pt-8 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-100 overflow-hidden flex flex-col h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:max-h-[88vh] mt-0 mb-auto rounded-none">
        {/* Header */}
        <div className="bg-[#126A49] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-300 animate-pulse" />
            <h3 className="font-bold text-base">
              {isUrdu ? 'اردو اے آئی وائس اینٹری' : 'Urdu AI Voice Entry'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-emerald-800 text-white cursor-pointer"
              title={isUrdu ? 'واپس' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-emerald-800 text-white cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 text-center space-y-4 overflow-y-auto">
          {/* Auto Parse Toggle Option */}
          <div className="flex items-center justify-between bg-emerald-50/80 p-2 px-3.5 rounded-xl border border-emerald-200 text-xs">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
              <Sparkles className="w-4 h-4 text-[#126A49]" />
              <span>{isUrdu ? 'خودکار اے آئی تجزیہ (Auto Parse)' : 'Auto Parse Voice Entry'}</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoParse(!autoParse)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                autoParse
                  ? 'bg-[#126A49] text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {autoParse ? (isUrdu ? 'آن (ON)' : 'ON') : (isUrdu ? 'آف (OFF)' : 'OFF')}
            </button>
          </div>

          <p className="text-xs font-semibold text-slate-600">
            {isUrdu
              ? 'اردو میں بولیے جیسے: "آج سیلز 20,000" یا "علی بھائی سے 5,000 ادھار وصولی"'
              : 'Speak Urdu command e.g. "Aaj sales 20,000" or "Ali bhai 5,000 udhaar collect"'}
          </p>

          {/* Big Mic Button & Live Listening Controls */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={isListening ? handleStopListening : () => startRecordingProcess()}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 transition-all shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse ring-8 ring-rose-200 shadow-rose-300/50'
                    : 'bg-[#126A49] hover:bg-[#0e543a] text-white hover:scale-105 shadow-emerald-700/30'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-8 h-8" />
                    <span className="text-[10px] font-extrabold">سن رہا ہے...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8" />
                    <span className="text-[10px] font-bold">
                      {isUrdu ? 'بولیں (Mic)' : 'Speak'}
                    </span>
                  </>
                )}
              </button>

              {/* Active Sound Ring when listening */}
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                </span>
              )}
            </div>

            {/* Live Status and Done Button while Listening */}
            {isListening && (
              <div className="space-y-2 w-full max-w-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>
                    {isUrdu
                      ? 'پوری بات آرام سے بولیں، مائیک سن رہا ہے...'
                      : 'Listening continuously... speak freely'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleStopListening}
                  className="w-full py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUrdu ? 'بات مکمل ہوگئی (Done Speaking)' : 'Done Speaking (Process)'}</span>
                </button>
              </div>
            )}

            {permissionGranted === false && (
              <div className="flex flex-col sm:flex-row gap-2 items-center justify-center mt-2">
                <button
                  type="button"
                  onClick={() => startRecordingProcess()}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'دوبارہ کوشش کریں' : 'Try Again'}</span>
                </button>

                <button
                  type="button"
                  onClick={openAppSettings}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'موبائل سیٹنگز کھولیں' : 'Open Settings'}</span>
                </button>

                {window.self !== window.top && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'نئے ٹیب میں کھولیں' : 'Open in New Tab'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-medium flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Text Input / Speech Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isUrdu ? 'یہاں بھی لکھ سکتے ہیں...' : 'Or type your entry here...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProcessText();
                  }
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#126A49] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleProcessText()}
                disabled={isParsing || !inputText.trim()}
                className="px-4 py-2.5 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'پراسس' : 'Parse'}</span>
              </button>
            </div>

            {/* Quick Sample Chips */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {sampleCommands.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => {
                    setInputText(cmd);
                    handleProcessText(cmd);
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-[#126A49] text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition-all cursor-pointer"
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>

          {/* Gemini AI Processing Spinner */}
          {isParsing && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-[#126A49] font-bold text-xs animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{isUrdu ? 'اے آئی کھاتہ تجزیہ کر رہا ہے...' : 'AI Gemini is parsing entry...'}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedData && !isParsing && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-3 shadow-sm animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between text-[#126A49] font-bold text-xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>{isUrdu ? 'اے آئی کا تیار کردہ اندراج:' : 'AI Parsed Result:'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-200/80 text-emerald-900 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase">
                    {parsedData.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedData(null);
                      setInputText('');
                      setTranscript('');
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                    title={isUrdu ? 'منسوخ کریں' : 'Cancel'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 bg-white/70 p-3 rounded-xl border border-emerald-100">
                <p className="text-base font-extrabold text-slate-900">
                  Rs. {parsedData.amount.toLocaleString()}
                </p>
                {parsedData.partyName && (
                  <p className="text-xs font-bold text-slate-700">
                    {isUrdu ? 'نام/کھاتہ:' : 'Party:'} {parsedData.partyName}
                  </p>
                )}
                <p className="text-xs font-semibold text-slate-600">
                  {isUrdu ? 'کیٹیگری/نوٹ:' : 'Category:'} {parsedData.category || 'General Goods'} ({parsedData.notes})
                </p>
                {parsedData.urduSummary && (
                  <p className="text-xs font-bold text-[#126A49] bg-emerald-100/60 px-2 py-1 rounded-md mt-1">
                    "{parsedData.urduSummary}"
                  </p>
                )}
              </div>

              {/* Action Buttons: Save or Cancel & Record Again */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveParsed}
                  className="w-full py-2.5 px-3 bg-[#126A49] hover:bg-[#0e543a] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUrdu ? 'اینٹری محفوظ کریں (Save)' : 'Save Entry'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelAndRecordNew}
                  className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title={isUrdu ? 'اینٹری غلط سمجھی ہے؟ منسوخ کریں اور دوبارہ بولیں' : 'Cancel and start a new voice recording'}
                >
                  <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{isUrdu ? 'منسوخ کریں، دوبارہ بولیں' : 'Cancel & Record Again'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
