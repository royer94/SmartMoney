import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORIES } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const parseTransaction = async (input: string | { mimeType: string, data: string }) => {
  try {
    const isAudio = typeof input !== 'string';
    const contents = isAudio
      ? [{ role: "user", parts: [
          { text: `Identifica tipo (expense/income), monto, categoría (de: ${CATEGORIES.join(', ')}), descripción. JSON only.` },
          { inlineData: { mimeType: (input as any).mimeType, data: (input as any).data } }
        ]}]
      : [{ role: "user", parts: [
          { text: `Identifica tipo (expense/income), monto, categoría (de: ${CATEGORIES.join(', ')}), descripción de: "${input}". JSON only.` }
        ]}];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type:        { type: Type.STRING, enum: ["expense", "income"] },
            amount:      { type: Type.NUMBER },
            category:    { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["type", "amount", "category", "description"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    console.error("[gemini] Error in parseTransaction:", error);
    throw error;
  }
};

export const generateVoiceReport = async (transactions: any[], timeframe: string) => {
  const summary = transactions.map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por $${t.amount}`).join(', ');
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: `Genera un reporte corto en español sobre estos movimientos financieros de la ${timeframe}: ${summary}. Menciona total de gastos e ingresos y da un breve consejo financiero.` }] }]
  });
  return response.text;
};

export const getFinancialInsights = async (transactions: any[], goals: any[]) => {
  const summary = transactions.slice(0, 50).map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} de (${t.category}) por $${t.amount}`).join('\n');
  const goalsSummary = goals.map(g => `Presupuesto ${g.name}: ${g.currentAmount}/${g.targetAmount}`).join('\n');
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: `Actúa como asesor financiero. Analiza:\n${summary}\n\nPresupuestos:\n${goalsSummary}\n\nDa: 1) Evaluación de hábitos (2 líneas). 2) Tres Insights Pro. 3) Predicción de fin de mes. Tono profesional. Formato Markdown.` }] }]
  });
  return response.text;
};

export const detectTransactionType = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo')) return 'income';
  return 'expense';
};
