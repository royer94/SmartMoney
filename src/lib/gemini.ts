import { CATEGORIES } from "../types";

const apiFetch = async (endpoint: string, body: any) => {
  const response = await fetch(`/api/gemini/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'API Error');
  }
  
  return response.json();
};

export const parseTransaction = async (input: string | { mimeType: string, data: string }) => {
  try {
    return await apiFetch('parse', { input });
  } catch (error: any) {
    console.error("[gemini] Error in parseTransaction:", error);
    throw error;
  }
};

export const generateVoiceReport = async (transactions: any[], timeframe: string) => {
  const summary = transactions.map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por $${t.amount}`).join(', ');
  const result = await apiFetch('report', { timeframe, summary });
  return result.text;
};

export const getFinancialInsights = async (transactions: any[], goals: any[]) => {
  const summary = transactions.slice(0, 50).map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} de (${t.category}) por $${t.amount}`).join('\n');
  const goalsSummary = goals.map(g => `Presupuesto ${g.name}: ${g.currentAmount}/${g.targetAmount}`).join('\n');
  
  const result = await apiFetch('insights', { summary, goalsSummary });
  return result.text;
};

export const detectTransactionType = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo')) return 'income';
  return 'expense';
};
