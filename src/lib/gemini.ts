import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORIES } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const parseTransaction = async (input: string | { mimeType: string, data: string }) => {
  const isAudio = typeof input !== 'string' && input.mimeType.startsWith('audio');
  
  const modelName = "gemini-3-flash-preview";

  const prompt = `Identify the transaction type (expense or income), amount, category (from the list), and description from this input.
  Categories: ${CATEGORIES.join(', ')}.
  Return as JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: (typeof input !== 'string') ? {
        parts: [
          { text: prompt },
          { inlineData: input }
        ]
      } : {
        parts: [{
          text: `Identify the transaction type (expense or income), amount, category (from the list), and description from this text: "${input}". 
          Categories: ${CATEGORIES.join(', ')}.
          Return as JSON.`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["expense", "income"] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["type", "amount", "category", "description"]
        }
      }
    });

    const text = response.text || '{}';
    const result = JSON.parse(text);
    console.log(`[gemini] Parsed result for ${isAudio ? 'audio' : 'text'}:`, result);
    return result;
  } catch (error: any) {
    console.error("[gemini] Error in parseTransaction:", error);
    throw error;
  }
};

export const generateVoiceReport = async (transactions: any[], timeframe: string) => {
  const summary = transactions.map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por $${t.amount}`).join(', ');
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [{
        text: `Genera un reporte corto y natural en español sobre estos movimientos financieros de la ${timeframe}: ${summary}. 
        Menciona el total de gastos e ingresos y da un breve consejo financiero.`
      }]
    },
  });

  return response.text;
};

export const getFinancialInsights = async (transactions: any[], goals: any[]) => {
  const summary = transactions.slice(0, 50).map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} de (${t.category}) por $${t.amount}`).join('\n');
  const goalsSummary = goals.map(g => `Presupuesto ${g.name}: ${g.currentAmount}/${g.targetAmount}`).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [{
        text: `Actúa como un experto asesor financiero certificado. 
        Analiza estos movimientos recientes del usuario:\n${summary}\n\nPresupuestos actuales:\n${goalsSummary}\n
        
        Proporciona:
        1. Una evaluación cruda pero constructiva de sus hábitos (máximo 2 líneas).
        2. Tres "Insights Pro" específicos (basados en sus datos reales) para ahorrar o invertir mejor.
        3. Una predicción de cómo terminará el mes si sigue así.
        
        Usa un tono profesional, motivador y directo. Formato: Markdown.`
      }]
    },
  });

  return response.text;
};

export const detectTransactionType = (text: string) => {
  // Simple heuristic for speed, but Gemini handles it better.
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo')) return 'income';
  return 'expense';
};
