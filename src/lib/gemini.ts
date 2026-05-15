import { CATEGORIES } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_WHISPER_MODEL = "whisper-large-v3-turbo";

// ─── Transcribir audio con Whisper ───────────────────────────────────────────
const transcribeAudio = async (mimeType: string, base64Data: string): Promise<string> => {
  // Convertir base64 a Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const audioBlob = new Blob([byteNumbers], { type: mimeType });

  // Determinar extensión
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';

  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${ext}`);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const response = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error transcribiendo audio');
  }

  // response_format: 'text' devuelve texto plano
  const text = await response.text();
  return text.trim();
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

// ─── Parsear transacción (texto o audio) ─────────────────────────────────────
export const parseTransaction = async (
  input: string | { mimeType: string; data: string }
) => {
  try {
    let textInput: string;

    if (typeof input !== 'string') {
      // 1. Transcribir audio con Whisper
      textInput = await transcribeAudio(input.mimeType, input.data);
      if (!textInput) throw new Error('No se detectó voz en el audio');
    } else {
      textInput = input;
    }

    // 2. Parsear texto con Llama
    const content = await groqChat([
      {
        role: 'system',
        content: `Eres un asistente de finanzas personales colombiano. Extrae la información de transacciones del texto del usuario.
Categorías disponibles: ${CATEGORIES.join(', ')}.
Responde ÚNICAMENTE con un objeto JSON válido con estos campos:
- type: "expense" o "income"
- amount: número (sin símbolos, en pesos colombianos)
- category: una de las categorías listadas
- description: descripción breve en español`
      },
      {
        role: 'user',
        content: textInput
      }
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
  const summary = transactions
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por $${t.amount}`)
    .join(', ');

  const content = await groqChat([
    {
      role: 'system',
      content: 'Eres un asesor financiero personal colombiano. Responde siempre en español de forma clara y concisa. Responde en JSON con el campo: { "text": "..." }'
    },
    {
      role: 'user',
      content: `Genera un reporte corto y natural sobre estos movimientos financieros de la ${timeframe}: ${summary}. 
Menciona el total de gastos e ingresos y da un breve consejo financiero.`
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
  const summary = transactions
    .slice(0, 50)
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} (${t.category}) $${t.amount}`)
    .join('\n');

  const goalsSummary =
    goals.length > 0
      ? goals.map(g => `Presupuesto ${g.name}: ${g.currentAmount}/${g.targetAmount}`).join('\n')
      : 'No definidos';

  const content = await groqChat([
    {
      role: 'system',
      content: 'Eres un experto asesor financiero certificado colombiano. Responde siempre en español usando formato Markdown. Responde en JSON con el campo: { "text": "..." }'
    },
    {
      role: 'user',
      content: `Analiza estos movimientos recientes:
${summary}

Presupuestos actuales:
${goalsSummary}

Proporciona en Markdown:
1. Una evaluación cruda pero constructiva de los hábitos (máximo 2 líneas).
2. Tres "Insights Pro" específicos basados en los datos reales para ahorrar o invertir mejor.
3. Una predicción de cómo terminará el mes si sigue así.

Usa tono profesional, motivador y directo.`
    }
  ]);

  const parsed = JSON.parse(content);
  return parsed.text || content;
};

// ─── Detectar tipo de transacción ─────────────────────────────────────────────
export const detectTransactionType = (text: string): 'income' | 'expense' => {
  const lower = text.toLowerCase();
  if (
    lower.includes('gané') ||
    lower.includes('recibí') ||
    lower.includes('ingreso') ||
    lower.includes('sueldo')
  )
    return 'income';
  return 'expense';
};
