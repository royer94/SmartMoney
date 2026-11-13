import { CATEGORIES, CURRENCIES, DEFAULT_CURRENCY } from "../types";
import { auth } from "./firebase";
import { callCloudFunction } from "./onesignal";
import { formatCurrency } from "./utils";
import { buildFinancialInsights } from "./financialInsights";

const GROQ_PROXY_URL = "https://us-central1-gen-lang-client-0987361888.cloudfunctions.net/groqProxy";

const getCurrentCurrency = () => {
  const code = localStorage.getItem('currency') || DEFAULT_CURRENCY;
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

// ─── Transcribir audio con Whisper vía proxy seguro en Cloud Functions ───
export const transcribeAudio = async (mimeType: string, base64Data: string): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión para usar la transcripción por voz.');
  }

  const idToken = await auth.currentUser.getIdToken();
  const proxyRes = await callCloudFunction('groqProxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ action: 'transcribe', mimeType, base64Data })
  });

  if (!proxyRes.ok) {
    const err = await proxyRes.json().catch(() => ({}));
    throw new Error(err.error || 'Error transcribiendo audio');
  }

  const data = await proxyRes.json();
  return (data.text || '').trim();
};

// ─── Chat con Llama vía proxy seguro en Cloud Functions ──────────────────
const groqChat = async (
  messages: { role: string; content: string }[],
  action: 'chat' | 'advisor' = 'chat'
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error('Debes iniciar sesión para usar el asistente de IA.');
  }

  const idToken = await auth.currentUser.getIdToken();
  const proxyRes = await callCloudFunction('groqProxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ action, messages })
  });

  if (!proxyRes.ok) {
    const err = await proxyRes.json().catch(() => ({}));
    throw new Error(err.error || 'Error procesando solicitud de IA');
  }

  const data = await proxyRes.json();
  if (!data.content) {
    throw new Error('Respuesta vacía del servidor de IA');
  }
  return data.content;
};

// ─── Parsear transacción con IA (solo cuando el parser local no es suficiente) ───
export const parseTransaction = async (
  input: string | { mimeType: string; data: string }
) => {
  try {
    let textInput: string;
    if (typeof input !== 'string') {
      textInput = await transcribeAudio(input.mimeType, input.data);
      if (!textInput) throw new Error('No se detectó voz en el audio');
    } else {
      textInput = input;
    }

    const currency = getCurrentCurrency();

    const content = await groqChat([
      {
        role: 'system',
        content: `Eres un asistente de finanzas personales. El usuario usa ${currency.name} (${currency.code}).
Extrae la información de transacciones del texto del usuario.
Categorías disponibles: ${CATEGORIES.join(', ')}.
Responde ÚNICAMENTE con un objeto JSON válido con estos campos:
- type: "expense" o "income"
- amount: número (sin símbolos, en ${currency.code})
- category: una de las categorías listadas
- description: descripción breve en español`
      },
      { role: 'user', content: textInput }
    ]);

    return JSON.parse(content);
  } catch (error: any) {
    console.error('[gemini] Error in parseTransaction:', error);
    throw error;
  }
};

// ─── Reporte de voz ───────────────────────────────────────────────────────────
export const generateVoiceReport = async (
  transactions: any[],
  timeframe: string
): Promise<string> => {
  const currency = getCurrentCurrency();
  const summary = transactions
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por ${currency.symbol}${t.amount}`)
    .join(', ');

  const content = await groqChat([
    {
      role: 'system',
      content: `Eres un asesor financiero personal. El usuario usa ${currency.name} (${currency.code}). Responde en español. Responde en JSON con el campo: { "text": "..." }`
    },
    {
      role: 'user',
      content: `Genera un reporte corto sobre estos movimientos de la ${timeframe}: ${summary}. Menciona totales y da un consejo financiero.`
    }
  ]);

  const parsed = JSON.parse(content);
  return parsed.text || content;
};

// ==================== INSIGHTS FINANCIEROS (VERSIÓN DEFINITIVA: SOLO EXCESOS ESTRICTOS) ====================
export const getFinancialInsights = async (
  transactions: any[],
  goals: any[],
  currencyCode?: string
): Promise<string> => {
  try {
    return buildFinancialInsights(transactions, goals, currencyCode, new Date(), (amt) => formatCurrency(amt, currencyCode)).markdown;
  } catch (error: any) {
    console.error('[getFinancialInsights] Error:', error);
    return "❌ No se pudo generar el análisis. Intenta de nuevo más tarde.";
  }
};

export const getDeepAIInsights = async (
  transactions: any[],
  goals: any[],
  currencyCode?: string
): Promise<string> => {
  const local = buildFinancialInsights(transactions, goals, currencyCode, new Date(), (amt) => formatCurrency(amt, currencyCode));
  if (!local.hasData || !local.promptSummary) {
    return local.markdown;
  }

  const content = await groqChat([
    {
      role: 'system',
      content: 'Eres SmartMoney AI, un asesor financiero personal cercano, práctico y directo en español. Responde en Markdown claro y conciso (máximo 180 palabras) con: 1) diagnóstico breve de su ritmo actual y proyección de fin de mes, 2) 2 acciones concretas y accionables para ahorrar o optimizar sus categorías/suscripciones este mes, usando exactamente las cifras y moneda entregadas sin inventar números.'
    },
    {
      role: 'user',
      content: `Analiza este resumen financiero del usuario y dale una estrategia personalizada:\n${local.promptSummary}`
    }
  ], 'advisor');

  return content.trim();
};

// ─── Detectar tipo de transacción ─────────────────────────────────────────────
export const detectTransactionType = (text: string): 'income' | 'expense' => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo'))
    return 'income';
  return 'expense';
};
