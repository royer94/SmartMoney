import { CATEGORIES, CURRENCIES, DEFAULT_CURRENCY } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_WHISPER_MODEL = "whisper-large-v3-turbo";

const getCurrentCurrency = () => {
  const code = localStorage.getItem('currency') || DEFAULT_CURRENCY;
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

// ─── Transcribir audio con Whisper ───────────────────────────────────────────
const transcribeAudio = async (mimeType: string, base64Data: string): Promise<string> => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const audioBlob = new Blob([byteNumbers], { type: mimeType });
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';

  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${ext}`);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const response = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error transcribiendo audio');
  }

  return (await response.text()).trim();
};

// ─── Chat con Llama ───────────────────────────────────────────────────────────
const groqChat = async (messages: { role: string; content: string }[]): Promise<string> => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API Error');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

// ─── Parsear transacción ─────────────────────────────────────────────────────
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

// ─── Insights financieros ─────────────────────────────────────────────────────
export const getFinancialInsights = async (
  transactions: any[],
  goals: any[]
): Promise<string> => {
  const currency = getCurrentCurrency();
  const summary = transactions
    .slice(0, 50)
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} (${t.category}) ${currency.symbol}${t.amount}`)
    .join('\n');

  const goalsSummary = goals.length > 0
    ? goals.map(g => `Presupuesto ${g.name}: ${currency.symbol}${g.currentAmount}/${currency.symbol}${g.targetAmount}`).join('\n')
    : 'No definidos';

  const content = await groqChat([
    {
      role: 'system',
      content: `Eres un experto asesor financiero. El usuario usa ${currency.name} (${currency.code}). Responde en español con formato Markdown. Responde en JSON con el campo: { "text": "..." }`
    },
    {
      role: 'user',
      content: `Analiza estos movimientos:\n${summary}\n\nPresupuestos:\n${goalsSummary}\n\nDa: 1) Evaluación de hábitos (2 líneas). 2) Tres Insights Pro. 3) Predicción de fin de mes. Tono profesional.`
    }
  ]);

  const parsed = JSON.parse(content);
  return parsed.text || content;
};

// ─── Detectar tipo de transacción ─────────────────────────────────────────────
export const detectTransactionType = (text: string): 'income' | 'expense' => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo'))
    return 'income';
  return 'expense';
};
