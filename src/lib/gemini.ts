import Groq from "groq-sdk";
import { CATEGORIES } from "../types";

const groq = new Groq({ 
  apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export const parseTransaction = async (input: string | { mimeType: string, data: string }) => {
  const isImage = typeof input !== 'string' && input.mimeType.startsWith('image');

  let userContent: any;

  if (isImage) {
    userContent = [
      {
        type: "image_url",
        image_url: {
          url: `data:${(input as any).mimeType};base64,${(input as any).data}`
        }
      },
      {
        type: "text",
        text: `Actúa como un experto en OCR y finanzas. Analiza esta imagen de un recibo o factura.
Extrae:
1. Tipo: casi siempre 'expense'.
2. Monto: El total final (numérico).
3. Categoría: Selecciona la mejor de esta lista: ${CATEGORIES.join(', ')}.
4. Descripción: Una descripción corta y concisa.
Si no encuentras el monto, usa 0.
Responde ÚNICAMENTE con un JSON con esta estructura exacta: {"type":"expense","amount":0,"category":"string","description":"string"}`
      }
    ];
  } else {
    userContent = `Identifica el tipo de transacción (expense o income), monto, categoría y descripción de este texto: "${input}".
Categorías disponibles: ${CATEGORIES.join(', ')}.
Responde ÚNICAMENTE con un JSON con esta estructura exacta: {"type":"expense","amount":0,"category":"string","description":"string"}`;
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: userContent
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const text = response.choices[0]?.message?.content || '{}';
  return JSON.parse(text);
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'es');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
    },
    body: formData
  });

  const data = await response.json();
  return data.text || '';
};

export const generateVoiceReport = async (transactions: any[], timeframe: string) => {
  const summary = transactions
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por $${t.amount}`)
    .join(', ');

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `Genera un reporte corto y natural en español sobre estos movimientos financieros de la ${timeframe}: ${summary}.
Menciona el total de gastos e ingresos y da un breve consejo financiero.`
      }
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
};

export const getFinancialInsights = async (transactions: any[], goals: any[]) => {
  const summary = transactions
    .slice(0, 50)
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} de (${t.category}) por $${t.amount}`)
    .join('\n');

  const goalsSummary = goals
    .map(g => `Presupuesto ${g.name}: ${g.currentAmount}/${g.targetAmount}`)
    .join('\n');

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `Actúa como un experto asesor financiero certificado.
Analiza estos movimientos recientes del usuario:\n${summary}\n\nPresupuestos actuales:\n${goalsSummary}\n
Proporciona:
1. Una evaluación cruda pero constructiva de sus hábitos (máximo 2 líneas).
2. Tres "Insights Pro" específicos (basados en sus datos reales) para ahorrar o invertir mejor.
3. Una predicción de cómo terminará el mes si sigue así.
Usa un tono profesional, motivador y directo. Formato: Markdown.`
      }
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
};

export const detectTransactionType = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo')) return 'income';
  return 'expense';
};
