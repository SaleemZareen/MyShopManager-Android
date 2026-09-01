import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';

function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // Linear PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Gemini Client
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // Resilient multi-model executor with automatic fallback and backoff for high demand/rate limits
  const generateWithGemini = async (ai: GoogleGenAI, requestParams: any) => {
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-flash-latest',
    ];
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          ...requestParams,
          model,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const status = err.status || (err.response && err.response.status) || (err.message?.includes('503') ? 503 : undefined);
        // If 503 or 429 encountered, wait briefly before trying next candidate
        if (status === 503 || status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }
    throw lastError || new Error('All Gemini models exhausted');
  };

  // API Route 1: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', aiConfigured: !!process.env.GEMINI_API_KEY });
  });

  // API Route 1a: Google OAuth 2.0 Web Callback helper for WebView and Browsers
  app.get('/api/auth/google/callback', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Sign-In Success</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      padding: 40px 20px;
      background-color: #f8fafc;
      color: #1e293b;
      margin: 0;
    }
    .card {
      background: white;
      padding: 32px 24px;
      border-radius: 24px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      display: inline-block;
      max-width: 440px;
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #e2e8f0;
    }
    h1 {
      color: #10b981;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 12px;
    }
    p {
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      margin: 8px 0;
    }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background-color: #10b981;
      color: white;
      text-decoration: none;
      font-weight: 600;
      border-radius: 12px;
      font-size: 15px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #10b981;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      animation: spin 1s linear infinite;
      margin: 16px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card" id="mainCard">
    <h1>سائن ان کامیاب! (Sign-In Successful)</h1>
    <p>Connecting your Google Account to My Shop Manager...</p>
    <div class="spinner" id="loader"></div>
    <p style="font-size: 12px; color: #94a3b8;" id="statusText">Please wait, returning to My Shop Manager...</p>
    <div id="btnContainer" style="display: none;">
      <a href="#" id="returnBtn" class="btn">ایپ میں واپس جائیں (Open App)</a>
    </div>
  </div>
  <script>
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const searchParams = new URLSearchParams(search);
      
      const token = hashParams.get('access_token') || searchParams.get('access_token');
      const state = hashParams.get('state') || searchParams.get('state') || '';
      const isAndroid = /android/i.test(navigator.userAgent) || state === 'android_app';

      if (token) {
        const deepLinkUrl = "myshopmanager://oauth-callback#access_token=" + encodeURIComponent(token);
        const webReturnUrl = window.location.origin + "/#access_token=" + encodeURIComponent(token);
        const targetUrl = isAndroid ? deepLinkUrl : webReturnUrl;
        
        const returnBtn = document.getElementById('returnBtn');
        const btnContainer = document.getElementById('btnContainer');
        returnBtn.href = targetUrl;
        btnContainer.style.display = 'block';

        // Auto-redirect
        setTimeout(function() {
          window.location.href = targetUrl;
        }, 400);
      } else {
        const err = searchParams.get('error') || hashParams.get('error') || 'No access token found';
        document.getElementById('mainCard').innerHTML = '<h1>Sign-In Not Completed</h1><p>Error: ' + err + '</p>';
      }
    } catch (e) {
      document.getElementById('mainCard').innerHTML = '<h1>Error</h1><p>' + e.message + '</p>';
    }
  </script>
</body>
</html>
    `);
  });

  // API Route 1b: Scan Business/Visiting Card using Gemini AI
  app.post('/api/ai/scan-business-card', async (req, res) => {
    try {
      const { image } = req.body;
      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image base64 data is required' });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({ error: 'AI Client not configured' });
      }

      // Parse mimeType and base64 string
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const match = image.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      };

      const systemInstruction = `You are an expert OCR and data extractor. 
Your task is to analyze a business card (visiting card) image and extract supplier contact information.
Extract:
1. Supplier Company/Shop Name (shopName)
2. Contact Person's Name (contactPerson)
3. Contact Phone/Mobile Number (phone) - Clean Pakistani mobile number, e.g., 03001234567 or Roman representation
4. Email Address (email)
5. Shop/Business Address (address)

Return the extracted values as a JSON object matching the requested schema. If a value is missing or cannot be found, return an empty string for that property. Be extremely accurate. Do not make up values.`;

      const response = await generateWithGemini(ai, {
        contents: [
          imagePart,
          { text: 'Extract supplier details from this visiting card.' }
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shopName: {
                type: Type.STRING,
                description: 'The company, shop, or agency name',
              },
              contactPerson: {
                type: Type.STRING,
                description: 'The owner, contact person, or supplier representative name',
              },
              phone: {
                type: Type.STRING,
                description: 'Mobile or phone number',
              },
              email: {
                type: Type.STRING,
                description: 'Email address if present',
              },
              address: {
                type: Type.STRING,
                description: 'Complete physical address',
              },
            },
            required: ['shopName', 'contactPerson', 'phone', 'email', 'address'],
          },
        },
      });

      const parsedJson = JSON.parse(response.text || '{}');
      return res.json({ success: true, parsed: parsedJson });
    } catch (err: any) {
      console.error('Scan card error:', err);
      return res.status(500).json({ error: err.message || 'Failed to scan card' });
    }
  });

  // API Route 2: Parse Voice / Natural Language Dukan Commands
  app.post('/api/ai/parse-voice', async (req, res) => {
    try {
      const { text, isUrdu } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text string is required' });
      }

      const ai = getAiClient();
      if (!ai) {
        // Fallback rule-based parsing if no API key is attached
        return res.json({
          fallback: true,
          parsed: fallbackParseCommand(text),
        });
      }

      const systemInstruction = `You are an expert Pakistani Shop Accountant & Cashier AI Assistant ("Dukan Munshi").
Your task is to convert spoken Urdu, Roman Urdu, or English shop entries into structured transaction JSON for a retail store manager app.
Handle Urdu numbers (e.g. "پچاس ہزار" = 50000, "پانچ سو" = 500, "ایک لاکھ" = 100000), common Pakistani dukan terminology:
- "سیلز", "فروخت", "بیچا", "سودا", "sale" => SALE
- "خریداری", "پرچیز", "مال لایا", "خریدا", "purchase" => PURCHASE
- "اخراجات", "خرچہ", "کرایہ", "چائے", "بجلی کا بل", "پٹرول", "expense" => EXPENSE
- "ادھار وصول", "کھاتہ جمع", "پیسے وصول", "رقم ملی", "udhaar collect" => RECEIPT
- "سپلائر کو ادا", "ادائیگی", "بل دیا", "supplier payment" => PAYMENT

Extract partyName (e.g. "علی بھائی", "نسلے ڈیپو"), category (e.g. "SHOP_RENT", "TEA", "UTILITIES", "STOCK_RESALE", "GENERAL_GOODS"), amount, and a clear notes string.`;

      const response = await generateWithGemini(ai, {
        contents: `Spoken Shop Command: "${text}"`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: 'Transaction type: SALE, PURCHASE, EXPENSE, RECEIPT, or PAYMENT',
              },
              amount: {
                type: Type.NUMBER,
                description: 'Total transaction amount in PKR',
              },
              partyName: {
                type: Type.STRING,
                description: 'Name of customer or supplier if mentioned, else empty string',
              },
              category: {
                type: Type.STRING,
                description: 'Category name such as General Goods, Stock Resale, SHOP_RENT, TEA, UTILITIES, MISCELLANEOUS',
              },
              notes: {
                type: Type.STRING,
                description: 'Clean English summary note',
              },
              urduSummary: {
                type: Type.STRING,
                description: 'Concise Urdu confirmation text like "فروخت: 20,000 روپے (نقد)"',
              },
            },
            required: ['type', 'amount', 'notes', 'urduSummary'],
          },
        },
      });

      const parsedJson = JSON.parse(response.text || '{}');
      return res.json({ success: true, parsed: parsedJson });
    } catch (err: any) {
      console.error('AI Parse Error:', err);
      return res.json({
        fallback: true,
        parsed: fallbackParseCommand(req.body?.text || ''),
      });
    }
  });

  // API Route 3: Smart Dukan Assistant / Advisory
  app.post('/api/ai/dukan-assistant', async (req, res) => {
    try {
      const { question, shopContext, isUrdu } = req.body;
      const ai = getAiClient();

      if (!ai) {
        return res.json({
          reply: isUrdu
            ? 'اے آئی دکان بزنس ایڈوائزر فعال ہے۔ آپ مجھ سے دکان کی سیلز، منافع، ادھار وصولی اور مینجمنٹ پر مشورہ لے سکتے ہیں۔'
            : 'Dukan AI Business Advisor is active. Ask me about sales growth, profit margins, udhaar recovery, and store management!',
        });
      }

      const prompt = `User Question: "${question}"
Current Shop Context: ${JSON.stringify(shopContext || {})}
Language Preference: ${isUrdu ? 'Urdu (اردو)' : 'English'}`;

      const systemInstruction = `You are "Dukan AI Business Advisor & Senior Manager" (دکان اے آئی بزنس مشیر و سینئر مینیجر).
You are an expert retail consultant, financial manager, and dukan advisor specifically for Pakistani shopkeepers, traders, and sole proprietors.

Your Responsibilities:
1. Provide actionable, practical retail management advice (increasing sales, calculating profit margins, managing inventory, reducing store expenses).
2. Give clear strategies for Udhaar (customer credit) recovery without hurting customer relationships.
3. Offer guidance on FBR tax compliance, POS integration, sales tax, and business registration for Pakistani retailers.
4. Analyze the provided Shop Context (Sales, Expenses, Udhaar, Inventory) to give personalized, data-backed insights.
5. Be respectful, encouraging, professional, and practical.
6. CRITICAL LANGUAGE MANDATE: If the user asks in Urdu (اردو) or Roman Urdu, or if isUrdu is true, you MUST respond ONLY in fluent, clean, natural Urdu (اردو script). Match the exact language of the user question. Never reply in English if the user asked in Urdu!
7. REALISTIC URDU VOICE & PHONETIC MANDATE (CRITICAL FOR TTS PRONUNCIATION):
   - Write ALL numbers in spoken Urdu words! For example write "پانچ ہزار" instead of "5000", write "بیس ہزار" instead of "20000", write "دس فیصد" instead of "10%".
   - Write ALL English words/acronyms phonetically in Urdu script! For example write "واٹس ایپ", "ایف بی آر", "ایس ایم ایس", "پوس", "سیل", "سٹاک", "پرافٹ" instead of English letters.
   - Do NOT use markdown symbols like asterisks (*), hashes (#), hyphens (-), bullets, or brackets in Urdu responses.
   - Use simple, natural conversational Pakistani Urdu as spoken by a polite, experienced Pakistani dukan senior advisor.
   - Keep sentences short and clear, separated by Urdu full stop (۔) for smooth, natural human speech synthesis without robotic pauses.`;

      const response = await generateWithGemini(ai, {
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      return res.json({ reply: response.text });
    } catch (err: any) {
      console.error('Dukan Assistant Error:', err);
      const isUrdu = !!req.body?.isUrdu;
      return res.json({
        reply: isUrdu
          ? 'معذرت، اس وقت اے آئی سرور پر مصروفیت زیادہ ہے۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا اپنے سوال کو مختصراً لکھیں۔'
          : 'The AI server is experiencing high traffic right now. Please try again in a moment or rephrase your query.',
      });
    }
  });

  // API Route 4: Gemini Native Voice Generation (Streaming SSE Endpoint)
  app.post('/api/ai/gemini-speech-stream', async (req, res) => {
    try {
      const { text, isUrdu, voiceName } = req.body || {};
      const safeText = String(text || '').trim();
      if (!safeText) {
        return res.status(400).json({ error: 'Text is required for speech' });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured' });
      }

      // Configure Server-Sent Events headers for immediate, unbuffered streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const selectedVoice = voiceName || (isUrdu ? 'Zephyr' : 'Zephyr');

      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: safeText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      for await (const chunk of stream) {
        const inlinePart = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlinePart && inlinePart.data) {
          const payload = JSON.stringify({
            chunk: inlinePart.data,
            mimeType: inlinePart.mimeType || 'audio/l16; rate=24000; channels=1',
            sampleRate: 24000,
          });
          res.write(`data: ${payload}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (err: any) {
      console.error('Gemini Native Audio Streaming Error:', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Gemini Audio Streaming failed' });
      }
      res.write(`data: {"error": "${err.message || 'Stream failed'}"}\n\n`);
      return res.end();
    }
  });

  // API Route 5: Gemini Native Voice Single-Shot Endpoint (WAV or Base64 JSON)
  app.all(['/api/ai/gemini-speech', '/api/ai/tts'], async (req, res) => {
    try {
      const text = String(req.body?.text || req.query.text || '').trim();
      const isUrdu = req.body?.isUrdu !== undefined ? !!req.body.isUrdu : (String(req.query.lang || '').startsWith('ur') || /[\u0600-\u06FF]/.test(text));
      const voiceName = String(req.body?.voiceName || req.query.voice || 'Zephyr');

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const ai = getAiClient();
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' },
            },
          },
        },
      });

      const inlinePart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlinePart || !inlinePart.data) {
        return res.status(500).json({ error: 'No audio returned from Gemini' });
      }

      const pcmBuffer = Buffer.from(inlinePart.data, 'base64');
      const wavBuffer = pcmToWavBuffer(pcmBuffer, 24000, 1, 16);

      // Check if client expects binary audio/wav or JSON payload
      const accepts = req.headers.accept || '';
      if (req.method === 'GET' || accepts.includes('audio/') || req.query.format === 'wav') {
        res.set({
          'Content-Type': 'audio/wav',
          'Content-Length': wavBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        });
        return res.send(wavBuffer);
      }

      return res.json({
        audioBase64: inlinePart.data,
        sampleRate: 24000,
        mimeType: inlinePart.mimeType || 'audio/l16; rate=24000; channels=1',
      });
    } catch (err: any) {
      console.error('Gemini Native Speech Error:', err);
      return res.status(500).json({ error: 'Gemini speech generation failed' });
    }
  });

  // Vite Development / Production Static Server Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dukan Manager Server running on http://0.0.0.0:${PORT}`);
  });
}

function fallbackParseCommand(text: string) {
  let type: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'RECEIPT' | 'PAYMENT' = 'SALE';
  let category = 'General Goods';
  let amount = 0;
  let partyName = '';

  const numMatch = text.match(/\d+/g);
  if (numMatch && numMatch.length > 0) {
    amount = parseInt(numMatch.join(''), 10);
  }

  // Urdu number words fallback
  if (!amount) {
    if (text.includes('پچاس ہزار') || text.includes('50k')) amount = 50000;
    else if (text.includes('بیس ہزار') || text.includes('20k')) amount = 20000;
    else if (text.includes('دس ہزار') || text.includes('10k')) amount = 10000;
    else if (text.includes('پانچ ہزار') || text.includes('5k')) amount = 5000;
    else if (text.includes('ہزار') || text.includes('1k')) amount = 1000;
    else if (text.includes('پانچ سو')) amount = 500;
    else amount = 1000;
  }

  if (text.includes('ادھار وصول') || text.includes('کھاتہ جمع') || text.includes('udhaar')) {
    type = 'RECEIPT';
  } else if (text.includes('سپلائر') || text.includes('ادائیگی') || text.includes('supplier')) {
    type = 'PAYMENT';
  } else if (text.includes('پرچیز') || text.includes('خریداری') || text.includes('purchase')) {
    type = 'PURCHASE';
    category = 'Stock Resale';
  } else if (text.includes('کرایہ') || text.includes('rent') || text.includes('چائے') || text.includes('خرچ') || text.includes('expense')) {
    type = 'EXPENSE';
    if (text.includes('کرایہ')) category = 'SHOP_RENT';
    else if (text.includes('چائے')) category = 'TEA';
    else category = 'MISCELLANEOUS';
  } else {
    type = 'SALE';
  }

  return {
    type,
    amount,
    partyName,
    category,
    notes: `Voice Entry: "${text}"`,
    urduSummary: `${type === 'SALE' ? 'فروخت' : type === 'EXPENSE' ? 'خرچہ' : 'اندراج'}: ${amount} روپے`,
  };
}

startServer();
