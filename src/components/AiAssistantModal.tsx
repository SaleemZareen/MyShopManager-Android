import React, { useState, useEffect, useRef } from 'react';
import { AppState } from '../types';
import { formatMoney, getApiUrl, fetchWithFailover } from '../utils/format';
import { globalGeminiAudio } from '../utils/geminiAudio';
import {
  Sparkles,
  X,
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Bot,
  Loader2,
  TrendingUp,
  CreditCard,
  Package,
  Volume2,
  VolumeX,
  Radio,
  AudioWaveform,
} from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoiceEntry: () => void;
  state: AppState;
  isUrdu: boolean;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenVoiceEntry,
  state,
  isUrdu,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(true);

  // Live shop Context calculation
  const todaySales = state.transactions
    .filter((t) => t.type === 'SALE')
    .reduce((s, t) => s + t.amount, 0);
  const todayExpenses = state.transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((s, t) => s + t.amount, 0);
  const totalCredit = state.customers.reduce((s, c) => s + c.totalCredit, 0);
  const totalPayable = state.suppliers.reduce((s, sp) => s + sp.totalPayable, 0);

  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'AI'; text: string }>>([
    {
      sender: 'AI',
      text: isUrdu
        ? `السلام علیکم ${state.profile.ownerName || 'محترم'}! میں آپ کا "دکان اے آئی بزنس مشیر" ہوں۔ آپ کی دکان کا لائیو مالیاتی ریکارڈ دیکھ رہا ہوں۔ آپ بزنس بڑھانے، منافع، ادھار کی وصولی یا سٹاک کے بارے میں کوئی بھی سوال پوچھ سکتے ہیں۔`
        : `Assalam-o-Alaikum ${state.profile.ownerName || 'Owner'}! I am your Dukan AI Business Advisor. Ask me anything about increasing sales, collecting Udhaar, or inventory management.`,
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef<string>('');
  const isHandsFreeRef = useRef<boolean>(isHandsFree);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  // Scroll ONLY the inner transcript message list container
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isSpeaking]);

  const stopAudioPlayback = () => {
    globalGeminiAudio.stop();
    setIsSpeaking(false);
  };

  // Voice recognition setup
  useEffect(() => {
    if (!isOpen) {
      stopAudioPlayback();
      return;
    }

    const hasAndroidSpeech = !!(window as any).AndroidSpeech;

    if (hasAndroidSpeech) {
      (window as any).onAndroidSpeechStart = () => {
        // Interruption: barge-in stops any active assistant audio immediately
        stopAudioPlayback();
        setIsListening(true);
        lastTranscriptRef.current = '';
      };

      (window as any).onAndroidSpeechEnd = () => {
        setIsListening(false);
        const spokenText = lastTranscriptRef.current.trim();
        lastTranscriptRef.current = ''; // Clear it immediately to avoid duplicate trigger
        if (spokenText && isHandsFreeRef.current) {
          handleSendPrompt(spokenText);
        }
      };

      (window as any).onAndroidSpeechResult = (text: string) => {
        stopAudioPlayback();
        setPrompt(text);
        lastTranscriptRef.current = text;
        setIsListening(false);
        const spokenText = text.trim();
        lastTranscriptRef.current = ''; // Clear it immediately to avoid duplicate trigger
        if (spokenText && isHandsFreeRef.current) {
          handleSendPrompt(spokenText);
        }
      };

      (window as any).onAndroidSpeechPartial = (text: string) => {
        stopAudioPlayback();
        setPrompt(text);
        lastTranscriptRef.current = text;
      };

      (window as any).onAndroidSpeechError = (error: string) => {
        console.warn('Android speech recognition error in Assistant:', error);
        setIsListening(false);
      };
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = isUrdu ? 'ur-PK' : 'en-PK';

      recognition.onstart = () => {
        // Interruption: barge-in stops any active assistant audio immediately
        stopAudioPlayback();
        setIsListening(true);
        lastTranscriptRef.current = '';
      };

      recognition.onresult = (event: any) => {
        stopAudioPlayback();
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        if (text) {
          setPrompt(text);
          lastTranscriptRef.current = text;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition error in Assistant:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const spokenText = lastTranscriptRef.current.trim();
        // Hands-free AUTO SEND logic
        if (spokenText && isHandsFreeRef.current) {
          handleSendPrompt(spokenText);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      stopAudioPlayback();
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
    };
  }, [isOpen, isUrdu]);

  // Convert numbers to clean Urdu spoken words for natural pronunciation
  const numberToUrduWords = (num: number): string => {
    if (num === 0) return 'صفر';
    if (isNaN(num)) return '';

    const urdu0to99 = [
      'صفر', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', 'دس',
      'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'ستارہ', 'اٹھارہ', 'انیس', 'بیس',
      'اکیس', 'بائیس', 'تئیس', 'چوبیس', 'پچیس', 'چھبیس', 'ستائیس', 'اٹھیس', 'انتالیس', 'تیس',
      'اکتیس', 'بتیس', 'تینتیس', 'چونتیس', 'پینتیس', 'چھتیس', 'سینتیس', 'اڑتیس', 'انتالیس', 'چالیس',
      'اکتالیس', 'بیالس', 'تینتالیس', 'چوالیس', 'پینتالیس', 'چھتالیس', 'سینتالیس', 'اڑتالیس', 'انچاس', 'پچاس',
      'ایکیاون', 'باون', 'ترپن', 'چوان', 'پچپن', 'چھپن', 'ستاون', 'اٹھاون', 'انسٹھ', 'ساٹھ',
      'اکسٹھ', 'باہٹھ', 'ترسٹھ', 'چونسٹھ', 'پنسٹھ', 'چھیاسٹھ', 'سڑسٹھ', 'اڑسٹھ', 'انہتر', 'ستر',
      'اکہتر', 'بہتر', 'تہتر', 'چوہتر', 'پچہتر', 'چھہتر', 'ستہر', 'اٹھہتر', 'اناسی', 'اسی',
      'اکاسی', 'پچاسی', 'چوراسی', 'پچاسی', 'چھیاسی', 'ستاسی', 'اٹھاسی', 'نواسی', 'نوے',
      'یکانوے', 'بانوے', 'ترانوے', 'چورانوے', 'پچانوے', 'چھانوے', 'ستانوے', 'اٹھانوے', 'ننانوے'
    ];

    if (num < 100) return urdu0to99[num] || num.toString();

    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rem = num % 100;
      const hStr = h === 1 ? 'ایک سو' : `${urdu0to99[h] || h} سو`;
      return rem === 0 ? hStr : `${hStr} ${numberToUrduWords(rem)}`;
    }
    if (num < 100000) {
      const th = Math.floor(num / 1000);
      const rem = num % 1000;
      const thStr = `${numberToUrduWords(th)} ہزار`;
      return rem === 0 ? thStr : `${thStr} ${numberToUrduWords(rem)}`;
    }
    if (num < 10000000) {
      const lakh = Math.floor(num / 100000);
      const rem = num % 100000;
      const lStr = `${numberToUrduWords(lakh)} لاکھ`;
      return rem === 0 ? lStr : `${lStr} ${numberToUrduWords(rem)}`;
    }
    return num.toString();
  };

  const prepareTextForUrduSpeech = (text: string): string => {
    // 1. Strip commas inside numbers (e.g. 25,000 -> 25000)
    let processed = text.replace(/(\d+),(\d+)/g, '$1$2');

    // 2. Replace Rs / PKR formatting
    processed = processed
      .replace(/Rs\.?\s*(\d+)/gi, '$1 روپے')
      .replace(/PKR\s*(\d+)/gi, '$1 روپے')
      .replace(/Rs\.?/gi, 'روپے')
      .replace(/PKR/gi, 'روپے');

    // 3. Convert all numbers to clean Urdu words
    processed = processed.replace(/\b\d+\b/g, (match) => {
      const val = parseInt(match, 10);
      if (!isNaN(val) && val <= 9999999) {
        return numberToUrduWords(val);
      }
      return match;
    });

    // 4. Replace English words & currencies with natural Urdu phonetics
    processed = processed
      .replace(/WhatsApp/gi, 'واٹس ایپ')
      .replace(/SMS/gi, 'ایس ایم ایس')
      .replace(/FBR/gi, 'ایف بی آر')
      .replace(/POS/gi, 'پوس')
      .replace(/Sales/gi, 'سیل')
      .replace(/Stock/gi, 'سٹاک')
      .replace(/Profit/gi, 'منافع')
      .replace(/Udhaar/gi, 'ادھار')
      .replace(/Advisor/gi, 'ایڈوائزر')
      .replace(/AI/gi, 'اے آئی')
      .replace(/Dukan/gi, 'دکان')
      .replace(/[*_#`~•\-–—:;[\](){}<>/\\|=+]/g, ' ')
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return processed;
  };

  const speakText = async (text: string) => {
    stopAudioPlayback();

    const cleanText = prepareTextForUrduSpeech(text);
    if (!cleanText) return;

    const isUrduText = isUrdu || /[\u0600-\u06FF]/.test(cleanText);

    // Call Gemini native audio streaming player
    await globalGeminiAudio.streamSpeech(
      cleanText,
      isUrduText,
      () => {
        setIsSpeaking(true);
      },
      () => {
        setIsSpeaking(false);
      },
      (err) => {
        console.warn('Gemini Native Speech playback error:', err);
        setIsSpeaking(false);
      }
    );
  };

  if (!isOpen) return null;

  const startVoiceCapture = (handsFree: boolean = false) => {
    setIsHandsFree(handsFree);
    isHandsFreeRef.current = handsFree;
    stopAudioPlayback();

    const startRec = () => {
      const hasAndroidSpeech = !!(window as any).AndroidSpeech;
      if (hasAndroidSpeech) {
        try {
          (window as any).AndroidSpeech.startSpeechRecognition(isUrdu);
        } catch (err) {
          console.error('Failed to start Android Speech Recognition:', err);
        }
        return;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang = isUrdu ? 'ur-PK' : 'en-PK';
          recognitionRef.current.start();
        } catch (_) {
          setIsListening(false);
        }
      } else {
        // Fallback simulation
        setIsListening(true);
        setTimeout(() => {
          setIsListening(false);
          const sample = isUrdu ? 'دکان کا منافع کیسے بڑھائیں؟' : 'How to increase shop profit margin?';
          setPrompt(sample);
          if (handsFree) {
            handleSendPrompt(sample);
          }
        }, 2000);
      }
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Release the mic immediately so that native system or recognition can acquire it
          stream.getTracks().forEach((track) => track.stop());
          startRec();
        })
        .catch(() => {
          // fallback to startRec directly even if mediaStream is blocked, since AndroidSpeech handles its own mic binding
          startRec();
        });
    } else {
      startRec();
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      const hasAndroidSpeech = !!(window as any).AndroidSpeech;
      if (hasAndroidSpeech) {
        try {
          (window as any).AndroidSpeech.stopSpeechRecognition();
        } catch (_) {}
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
    } else {
      startVoiceCapture(false);
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const text = textToSend || prompt;
    if (!text.trim() || isLoading) return;

    // Stop listening and stop any active audio playback
    stopAudioPlayback();

    if (isListening) {
      const hasAndroidSpeech = !!(window as any).AndroidSpeech;
      if (hasAndroidSpeech) {
        try {
          (window as any).AndroidSpeech.stopSpeechRecognition();
        } catch (_) {}
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
    }

    // Detect if input contains Urdu characters
    const hasUrduChars = /[\u0600-\u06FF]/.test(text);
    const effectiveIsUrdu = isUrdu || hasUrduChars;

    const newMsgs = [...messages, { sender: 'USER' as const, text }];
    setMessages(newMsgs);
    setPrompt('');
    setIsLoading(true);

    const shopContext = {
      ownerName: state.profile.ownerName,
      shopName: state.profile.shopName,
      address: state.profile.address,
      todaySales,
      todayExpenses,
      totalCreditUdhaar: totalCredit,
      totalSupplierPayable: totalPayable,
      inventoryCount: state.inventory.length,
      recentTransactionsCount: state.transactions.length,
    };

    try {
      let aiReply: string | undefined;

      // 1. Try Native Android Bridge if running inside Android APK
      const hasAndroidBridge = typeof window !== 'undefined' && (window as any).AndroidBackup && typeof (window as any).AndroidBackup.requestAiAssistant === 'function';

      if (hasAndroidBridge) {
        try {
          const nativePromise = new Promise<{ reply?: string; error?: string }>((resolve) => {
            const timeout = setTimeout(() => {
              (window as any).onNativeAiResponse = undefined;
              resolve({ error: 'Timeout waiting for native response' });
            }, 18000);

            (window as any).onNativeAiResponse = (reply: string | null, error: string | null) => {
              clearTimeout(timeout);
              (window as any).onNativeAiResponse = undefined;
              if (reply) {
                resolve({ reply });
              } else {
                resolve({ error: error || 'Native AI call failed' });
              }
            };

            (window as any).AndroidBackup.requestAiAssistant(JSON.stringify({
              question: text,
              shopContext,
              isUrdu: effectiveIsUrdu
            }));
          });

          const nativeResult = await nativePromise;
          if (nativeResult.reply) {
            aiReply = nativeResult.reply;
          }
        } catch (nativeErr) {
          console.warn('Native AI Bridge failed, attempting standard fetch fallback:', nativeErr);
        }
      }

      // 2. If not on native Android or native bridge didn't return, use standard backend fetch
      if (!aiReply) {
        const res = await fetchWithFailover('/api/ai/dukan-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text, shopContext, isUrdu: effectiveIsUrdu }),
        });

        const data = await res.json();
        aiReply = data.reply;
      }

      if (!aiReply) {
        const lower = text.toLowerCase();
        if (lower.includes('profit') || lower.includes('منافع') || lower.includes('sale') || lower.includes('فروخت')) {
          aiReply = effectiveIsUrdu
            ? 'دکان کا منافع اور سیلز بڑھانے کے لیے تیز فروخت ہونے والے سامان کا سٹاک پورا رکھیں، گاہکوں سے خوش اخلاقی کا رویہ اپنائیں اور فضول اخراجات کم کریں۔'
            : 'To increase store profit, maintain healthy stock of fast-moving items, practice polite upselling, and cut avoidable operational overhead.';
        } else if (lower.includes('udhaar') || lower.includes('ادھار') || lower.includes('khata') || lower.includes('وصول')) {
          aiReply = effectiveIsUrdu
            ? 'ادھار کی جلد وصولی کے لیے ہفتہ وار شائستہ واٹس ایپ یا ایس ایم ایس پیغام بھیجیں اور نئے غیر ضروری ادھار کی حد مقرر کریں۔'
            : 'For faster udhaar recovery, send gentle weekly WhatsApp reminders and enforce clear credit limits on customer accounts.';
        } else if (lower.includes('stock') || lower.includes('سٹاک') || lower.includes('inventory') || lower.includes('مال')) {
          aiReply = effectiveIsUrdu
            ? 'سٹاک مینجمنٹ کے لیے ڈیڈ سٹاک کی نشاندہی کر کے ڈسکاؤنٹ پر نکالیں اور سب سے زیادہ بکنے والے آئٹمز کی لسٹ بنا کر وقت پر ری آرڈر کریں۔'
            : 'For inventory optimization, clear slow-moving dead stock and establish timely reorder points for top-selling items.';
        } else {
          aiReply = effectiveIsUrdu
            ? 'آپ دکان کی سیلز، منافع بڑھانے، ادھار کی وصولی، ٹیکس یا سٹاک مینجمنٹ کے بارے میں کوئی بھی سوال تفصیل سے پوچھ سکتے ہیں۔'
            : 'You can ask any specific questions regarding store growth, profit margin, udhaar credit management, or inventory tracking.';
        }
      }

      setMessages((prev) => [...prev, { sender: 'AI', text: aiReply }]);

      // Speak response using Gemini native audio if enabled or in Hands-free Voice mode
      if (autoVoiceEnabled || isHandsFree) {
        speakText(aiReply);
      }
    } catch (err) {
      console.error('AI Assistant Fetch Error:', err);
      // Smart Context-Aware Local Business Intelligence Fallback if network/server is unreachable
      const lower = text.toLowerCase();
      let fallbackReply = '';
      if (lower.includes('profit') || lower.includes('منافع') || lower.includes('بچت') || lower.includes('sale') || lower.includes('فروخت')) {
        fallbackReply = effectiveIsUrdu
          ? `دکان کا منافع اور سیلز بڑھانے کے لیے: 
1. اپنی دکان میں سب سے زیادہ بکنے والے سامان کی فراہمی مسلسل رکھیں تاکہ گاہک واپس نہ جائے۔
2. آج کی کل سیلز ${formatMoney(todaySales, state.profile.currencySymbol || 'روپے')} ہے، اخراجات پر قابو پا کر منافع کا مارجن 15% سے 20% کے درمیان رکھیں۔`
          : `To increase store profit and sales:
1. Ensure fast-moving inventory items are always in stock.
2. Today's sales stand at ${formatMoney(todaySales, state.profile.currencySymbol || 'Rs.')}. Keep unnecessary operational expenses low to maintain healthy net profit.`;
      } else if (lower.includes('udhaar') || lower.includes('ادھار') || lower.includes('khata') || lower.includes('کھاتہ') || lower.includes('وصول') || lower.includes('رقم')) {
        fallbackReply = effectiveIsUrdu
          ? `ادھار کی بروقت وصولی کے لیے حکمت عملی:
1. موجودہ کل ادھار کھاتہ ${formatMoney(totalCredit, state.profile.currencySymbol || 'روپے')} ہے۔
2. ہر گاہک کے لیے ادھار کی زیادہ سے زیادہ حد مقرر کریں اور کھاتہ ماڈیول سے شائستہ واٹس ایپ ریمائنڈر بھیجیں۔`
          : `For effective Udhaar credit management:
1. Current outstanding customer balance is ${formatMoney(totalCredit, state.profile.currencySymbol || 'Rs.')}.
2. Set strict credit limits and send automated polite WhatsApp reminders from the Khata module.`;
      } else if (lower.includes('stock') || lower.includes('سٹاک') || lower.includes('inventory') || lower.includes('مال') || lower.includes('آئٹم')) {
        fallbackReply = effectiveIsUrdu
          ? `انوینٹری اور سٹاک مینجمنٹ مشورہ:
1. آپ کی انوینٹری میں کل ${state.inventory.length} آئٹمز رجسٹرڈ ہیں۔
2. کم سٹاک والے آئٹمز کی فوری نشاندہی کریں اور ڈیڈ سٹاک کو ڈسکاؤنٹ پر نکال کر نقد رقم فری کریں۔`
          : `Inventory optimization advice:
1. You have ${state.inventory.length} items recorded in inventory.
2. Identify low-stock items before they run out and discount slow-moving goods to free up working capital.`;
      } else if (lower.includes('supplier') || lower.includes('سپلائر') || lower.includes('بل') || lower.includes('ادائیگی')) {
        fallbackReply = effectiveIsUrdu
          ? `سپلائر کی ادائیگی اور انتظام:
1. سپلائرز کا کل واجب الادا بیلنس ${formatMoney(totalPayable, state.profile.currencySymbol || 'روپے')} ہے۔
2. کیش فلو مینج کرنے کے لیے پہلے ان سپلائرز کو ادائیگی کریں جو بروقت سپلائی پر رعایت یا ڈسکاؤنٹ دیتے ہیں۔`
          : `Supplier payables strategy:
1. Total payable to suppliers is ${formatMoney(totalPayable, state.profile.currencySymbol || 'Rs.')}.
2. Prioritize key suppliers who offer early-settlement discounts.`;
      } else {
        fallbackReply = effectiveIsUrdu
          ? `دکان مینجمنٹ اسسٹنٹ:
دکان کا نام: ${state.profile.shopName || 'میری دکان'}
آج کی فروخت: ${formatMoney(todaySales, state.profile.currencySymbol || 'روپے')} | آج کا خرچہ: ${formatMoney(todayExpenses, state.profile.currencySymbol || 'روپے')}
کل کسٹمر ادھار: ${formatMoney(totalCredit, state.profile.currencySymbol || 'روپے')}
آپ مجھ سے دکان کے منافع، ادھار وصولی، سپلائر کھاتہ یا انوینٹری پر کوئی بھی سوال پوچھ سکتے ہیں۔`
          : `Shop Manager AI Advisor:
Store: ${state.profile.shopName || 'My Shop'}
Today's Sales: ${formatMoney(todaySales, state.profile.currencySymbol || 'Rs.')} | Expenses: ${formatMoney(todayExpenses, state.profile.currencySymbol || 'Rs.')}
Total Udhaar: ${formatMoney(totalCredit, state.profile.currencySymbol || 'Rs.')}
Ask me about profit optimization, udhaar recovery, stock replenishment, or expense control.`;
      }

      setMessages((prev) => [...prev, { sender: 'AI', text: fallbackReply }]);
      if (autoVoiceEnabled || isHandsFree) speakText(fallbackReply);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      dir={isUrdu ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 bg-white sm:bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-0 sm:p-4 pt-[env(safe-area-inset-top,0px)] sm:pt-6 overflow-hidden animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-lg sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:h-[82vh] max-h-[calc(100dvh-env(safe-area-inset-top,0px))] sm:max-h-[85vh] relative rounded-none">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#126A49] to-emerald-900 text-white p-3 sm:p-4 flex items-center justify-between border-b border-emerald-700 shrink-0 relative">
          <div className={`flex items-center gap-2.5 sm:gap-3 ${isUrdu ? 'pl-14 pr-0' : 'pr-14 pl-0'}`}>
            {/* AI Icon with Pro Advisor badge directly underneath */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md font-black">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950" />
              </div>
              <span className="mt-0.5 bg-amber-400 text-slate-950 text-[8px] sm:text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                Pro Advisor
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base leading-tight text-white">
                  {isUrdu ? 'دکان اے آئی بزنس مشیر' : 'Dukan AI Business Advisor'}
                </h2>
                {isSpeaking && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400/90 text-slate-950 text-[9px] font-black animate-pulse">
                    <AudioWaveform className="w-3 h-3" />
                    <span>Gemini Voice</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200 font-medium mt-0.5">
                {isUrdu ? 'سینئر دکان منشی و قدرتی صوتی معاون' : 'Senior Advisor & Gemini Natural Voice Assistant'}
              </p>
            </div>
          </div>

          {/* Controls: Back & Close button and Speaker button */}
          <div className={`absolute top-2.5 sm:top-3.5 flex flex-col items-center gap-1.5 sm:gap-2 z-10 ${isUrdu ? 'left-2.5 sm:left-3.5' : 'right-2.5 sm:right-3.5'}`}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  stopAudioPlayback();
                  onClose();
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title={isUrdu ? 'واپس' : 'Back'}
              >
                <ArrowLeft className={`w-5 h-5 ${isUrdu ? 'rotate-180' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAudioPlayback();
                  onClose();
                }}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stopAudioPlayback();
                } else {
                  setAutoVoiceEnabled(!autoVoiceEnabled);
                }
              }}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse shadow-md'
                  : autoVoiceEnabled
                  ? 'bg-emerald-800/80 text-emerald-200 border-emerald-600'
                  : 'bg-white/10 text-white border-white/20'
              }`}
              title={isSpeaking ? 'صوتی جواب روکے (Stop Voice)' : autoVoiceEnabled ? 'آواز آن ہے (Mute)' : 'آواز آف ہے (Unmute)'}
            >
              {isSpeaking ? (
                <Volume2 className="w-4 h-4 animate-bounce text-slate-950" />
              ) : autoVoiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/50" />
              )}
            </button>
          </div>
        </div>

        {/* Live Shop Health Snapshot Strip */}
        <div className="bg-slate-900 text-white px-3 py-1.5 sm:py-2 flex items-center justify-between text-[10px] sm:text-[11px] border-b border-slate-800 shrink-0 gap-1.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 text-emerald-400 font-bold whitespace-nowrap">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>{isUrdu ? 'سیل:' : 'Sales:'}</span>
            <span className="text-white font-extrabold">Rs. {formatMoney(todaySales)}</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400 font-bold whitespace-nowrap">
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>{isUrdu ? 'ادھار:' : 'Udhaar:'}</span>
            <span className="text-white font-extrabold">Rs. {formatMoney(totalCredit)}</span>
          </div>
          <div className="flex items-center gap-1 text-sky-400 font-bold whitespace-nowrap">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>{isUrdu ? 'سٹاک:' : 'Stock:'}</span>
            <span className="text-white font-extrabold">{state.inventory.length}</span>
          </div>
        </div>

        {/* Conversation Area (ONLY this element scrolls internally - MAXIMIZED FOR MOBILE) */}
        <div ref={chatContainerRef} className="p-3 sm:p-4 flex-1 overflow-y-auto space-y-3 bg-slate-50/60 scroll-smooth">
          {/* Business Advisor Topics / Quick Chips - Single horizontal scrollable row to save vertical space */}
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              {isUrdu ? 'مشہور اردو سوالات:' : 'Recommended Store Advisory Topics:'}
            </p>
            <div className="flex flex-nowrap overflow-x-auto pb-1 gap-1.5 no-scrollbar">
              <button
                type="button"
                onClick={() => handleSendPrompt(isUrdu ? 'دکان کا منافع کیسے بڑھائیں؟' : 'How to increase shop profit margin?')}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-[#126A49] border border-emerald-200 text-[11px] font-extrabold rounded-full transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              >
                📈 {isUrdu ? 'منافع کیسے بڑھائیں؟' : 'Increase Profit'}
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt(isUrdu ? 'ادھار جلد وصول کرنے کا طریقہ کیا ہے؟' : 'What is the best way for fast Udhaar recovery?')}
                className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-extrabold rounded-full transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              >
                💰 {isUrdu ? 'ادھار کی جلد وصولی' : 'Fast Udhaar Recovery'}
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt(isUrdu ? 'ایف بی آر اور سیلز ٹیکس کی کیا شرائط ہیں؟' : 'What are FBR tax and POS rules for my shop?')}
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-extrabold rounded-full transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              >
                🏛️ {isUrdu ? 'ایف بی آر ٹیکس مشورہ' : 'FBR Tax Guidance'}
              </button>
              <button
                type="button"
                onClick={() => handleSendPrompt(isUrdu ? 'سٹاک مینجمنٹ اور نئے سامان کی خریدار کا مشورہ' : 'Inventory & Stock reordering guide')}
                className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-900 border border-sky-200 text-[11px] font-extrabold rounded-full transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              >
                📦 {isUrdu ? 'سٹاک مینجمنٹ' : 'Stock Management'}
              </button>
            </div>
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                m.sender === 'USER' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs ${
                  m.sender === 'USER'
                    ? 'bg-slate-900 text-white'
                    : 'bg-[#126A49] text-amber-300'
                }`}
              >
                {m.sender === 'USER' ? 'You' : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[88%] sm:max-w-[85%] p-3 sm:p-3.5 rounded-2xl text-xs font-semibold shadow-2xs leading-relaxed whitespace-pre-line relative group ${
                  m.sender === 'USER'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                }`}
              >
                <span>{m.text}</span>
                {m.sender === 'AI' && idx === messages.length - 1 && isSpeaking && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-extrabold text-[#126A49] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 animate-pulse">
                    <AudioWaveform className="w-3.5 h-3.5 text-[#126A49] animate-bounce" />
                    <span>{isUrdu ? 'قدرتی آواز میں جواب سن رہے ہیں...' : 'Speaking via Gemini Voice...'}</span>
                    <button
                      type="button"
                      onClick={stopAudioPlayback}
                      className="ml-auto underline text-rose-600 font-bold hover:text-rose-700 cursor-pointer"
                    >
                      {isUrdu ? 'روکیں' : 'Stop'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-[#126A49] animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#126A49]" />
              <span>
                {isUrdu
                  ? 'دکان اے آئی بزنس ایڈوائزر آپ کا ڈیٹا چیک کر رہا ہے...'
                  : 'Gemini AI Dukan Advisor is evaluating your financial metrics...'}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions - Compact for Mobile */}
        <div className="p-2.5 sm:p-3 bg-white border-t border-slate-200 space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Standard Manual Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isListening && !isHandsFree
                  ? 'bg-rose-600 text-white border-rose-600 animate-bounce'
                  : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-[#126A49] border-slate-200'
              }`}
              title={isListening ? 'Stop Listening' : 'Type by Voice'}
            >
              {isListening && !isHandsFree ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Voice Chat (Auto-Send) Button - ICON ONLY */}
            <button
              type="button"
              onClick={() => startVoiceCapture(true)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isListening && isHandsFree
                  ? 'bg-rose-600 text-white border-rose-600 animate-pulse ring-2 ring-rose-300'
                  : 'bg-emerald-50 text-[#126A49] border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isUrdu ? 'خودکار وائس چیٹ (Auto-Send Voice Chat)' : 'Hands-Free Voice Chat'}
            >
              <Radio className="w-4 h-4 text-[#126A49] animate-pulse" />
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt()}
              placeholder={
                isListening
                  ? isUrdu
                    ? 'بولیے... آواز ریکارڈ ہو رہی ہے'
                    : 'Listening... Speak now'
                  : isUrdu
                  ? 'اردو میں سوال لکھیں یا وائس چیٹ کریں...'
                  : 'Ask store management advice or speak...'
              }
              className={`flex-1 min-w-0 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#126A49] transition-all ${
                isListening ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
              }`}
            />

            <button
              type="button"
              onClick={() => handleSendPrompt()}
              disabled={isLoading || !prompt.trim()}
              className="p-2.5 bg-[#126A49] hover:bg-[#0e543a] disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer shrink-0 font-bold"
            >
              <Send className={`w-4 h-4 ${isUrdu ? '-scale-x-100' : ''}`} />
            </button>
          </div>

          {/* Secondary Voice Entry shortcut */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-0.5">
            <span className="text-slate-500 font-medium truncate pr-1">
              {isUrdu ? 'آواز سے براہ راست کھاتہ درج کرنا چاہتے ہیں؟' : 'Want to log a voice entry?'}
            </span>
            <button
              type="button"
              onClick={() => {
                stopAudioPlayback();
                onClose();
                onOpenVoiceEntry();
              }}
              className="font-extrabold text-[#126A49] hover:underline cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Mic className="w-3 h-3 text-[#126A49]" />
              <span>{isUrdu ? 'اردو وائس اینٹری' : 'Open Voice Entry'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

