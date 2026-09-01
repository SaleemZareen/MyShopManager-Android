/**
 * Cloudflare Worker for My Shop Manager AI Backend
 * 
 * Provides server-side Gemini AI integration without exposing GEMINI_API_KEY to the Android APK or clients.
 */

export interface Env {
  GEMINI_API_KEY?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Resilient multi-model executor using direct Google Generative Language REST API.
 * Compatible with Cloudflare Workers standard fetch runtime.
 */
async function generateWithGeminiRest(
  apiKey: string,
  payload: {
    systemInstruction?: string;
    contents: Array<{ role?: string; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }>;
    generationConfig?: {
      responseMimeType?: string;
      temperature?: number;
    };
  }
): Promise<{ text: string; model: string }> {
  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ];

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const body: any = {
        contents: payload.contents,
      };

      if (payload.systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: payload.systemInstruction }],
        };
      }

      if (payload.generationConfig) {
        body.generationConfig = payload.generationConfig;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'my-shop-manager-cloudflare-worker',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const status = res.status;
        lastError = new Error(`Gemini API model ${model} error (HTTP ${status}): ${errorText}`);

        // If high traffic (503/429), try next model in candidate list
        if (status === 503 || status === 429 || status === 404) {
          continue;
        }
        throw lastError;
      }

      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text && typeof text === 'string') {
        return { text, model };
      }

      throw new Error(`Invalid response structure from Gemini model ${model}`);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('All Gemini model candidates failed');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health check endpoints
    if ((path === '/health' || path === '/api/health') && request.method === 'GET') {
      return jsonResponse({
        status: 'ok',
        service: 'my-shop-manager-cloudflare-worker',
        aiConfigured: !!(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0),
      });
    }

    // 3. POST /api/ai/dukan-assistant
    if (path === '/api/ai/dukan-assistant' && request.method === 'POST') {
      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey || apiKey.trim().length === 0) {
          return jsonResponse(
            {
              error: 'GEMINI_API_KEY secret is not set in Cloudflare Worker environment variables/secrets.',
            },
            500
          );
        }

        const body: any = await request.json().catch(() => ({}));
        const question = body?.question || '';
        const isUrdu = !!body?.isUrdu;
        const shopContext = body?.shopContext || {};

        if (!question && !body?.text) {
          return jsonResponse({ error: 'Question or prompt is required' }, 400);
        }

        const effectiveQuestion = question || body?.text || '';

        const promptText = `User Question: "${effectiveQuestion}"
Current Shop Context: ${JSON.stringify(shopContext)}
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

        const result = await generateWithGeminiRest(apiKey, {
          systemInstruction,
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }],
            },
          ],
        });

        return jsonResponse({
          reply: result.text,
          model: result.model,
        });
      } catch (err: any) {
        console.error('Cloudflare Worker Dukan Assistant Error:', err);
        return jsonResponse(
          {
            error: err.message || 'AI service error',
          },
          500
        );
      }
    }

    // 4. POST /api/ai/parse-voice
    if (path === '/api/ai/parse-voice' && request.method === 'POST') {
      try {
        const apiKey = env.GEMINI_API_KEY;
        const body: any = await request.json().catch(() => ({}));
        const text = body?.text || '';

        if (!text) {
          return jsonResponse({ error: 'Text is required' }, 400);
        }

        if (!apiKey) {
          return jsonResponse({ error: 'GEMINI_API_KEY secret not set' }, 500);
        }

        const systemInstruction = `You are an expert Pakistani Shop Accountant & Cashier AI Assistant ("Dukan Munshi").
Your task is to convert spoken Urdu, Roman Urdu, or English shop entries into structured transaction JSON for a retail store manager app.
Return JSON with keys: type (SALE, PURCHASE, EXPENSE, RECEIPT, or PAYMENT), amount (number in PKR), partyName (string), category (string), notes (string), urduSummary (string).`;

        const result = await generateWithGeminiRest(apiKey, {
          systemInstruction,
          contents: [
            {
              role: 'user',
              parts: [{ text: `Spoken Shop Command: "${text}"` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });

        const parsedJson = JSON.parse(result.text || '{}');
        return jsonResponse({ success: true, parsed: parsedJson, model: result.model });
      } catch (err: any) {
        return jsonResponse({ error: err.message || 'Parse error' }, 500);
      }
    }

    // 5. Default 404 for unknown worker paths
    return jsonResponse(
      {
        error: 'Not Found',
        path,
        message: 'Endpoint not supported on this worker. Supported: /health, /api/health, /api/ai/dukan-assistant, /api/ai/parse-voice',
      },
      404
    );
  },
};
