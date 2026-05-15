import { CATEGORIES } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const groqFetch = async (messages: { role: string; content: string }[]) => {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Groq API Error");
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const parseTransaction = async (
  input: string | { mimeType: string; data: string }
) => {
  try {
    // Audio no soportado directamente en Groq — convertir a texto si aplica
    const textInput = typeof input === "string" ? input : "[audio input no soportado en modo texto]";

    const content = await groqFetch([
      {
        role: "system",
        content: `Eres un asistente de finanzas personales. Extrae la información de transacciones del texto del usuario.
Categorías disponibles: ${CATEGORIES.join(", ")}.
Responde ÚNICAMENTE con un objeto JSON válido con estos campos:
- type: "expense" o "income"
- amount: número (sin símbolos)
- category: una de las categorías listadas
- description: descripción breve en español`
      },
      {
        role: "user",
        content: textInput
      }
    ]);

    return JSON.parse(content);
  } catch (error: any) {
    console.error("[gemini] Error in parseTransaction:", error);
    throw error;
  }
};

export const generateVoiceReport = async (
  transactions: any[],
  timeframe: string
) => {
  const summary = transactions
    .map(
      (t) =>
        `${t.type === "expense" ? "Gasto" : "Ingreso"}: ${t.description} por $${t.amount}`
    )
    .join(", ");

  const content = await groqFetch([
    {
      role: "system",
      content: "Eres un asesor financiero personal. Responde siempre en español de forma clara y concisa."
    },
    {
      role: "user",
      content: `Genera un reporte corto y natural sobre estos movimientos financieros de la ${timeframe}: ${summary}. 
Menciona el total de gastos e ingresos y da un breve consejo financiero.
Responde en JSON con el campo: { "text": "..." }`
    }
  ]);

  const parsed = JSON.parse(content);
  return parsed.text || content;
};

export const getFinancialInsights = async (
  transactions: any[],
  goals: any[]
) => {
  const summary = transactions
    .slice(0, 50)
    .map(
      (t) =>
        `${t.type === "expense" ? "Gasto" : "Ingreso"}: ${t.description} de (${t.category}) por $${t.amount}`
    )
    .join("\n");

  const goalsSummary =
    goals.length > 0
      ? goals.map((g) => `Presupuesto ${g.name}: ${g.currentAmount}/${g.targetAmount}`).join("\n")
      : "No definidos";

  const content = await groqFetch([
    {
      role: "system",
      content: "Eres un experto asesor financiero certificado. Responde siempre en español usando formato Markdown."
    },
    {
      role: "user",
      content: `Analiza estos movimientos recientes:
${summary}

Presupuestos actuales:
${goalsSummary}

Proporciona en JSON con el campo "text" que contenga en Markdown:
1. Una evaluación cruda pero constructiva de los hábitos (máximo 2 líneas).
2. Tres "Insights Pro" específicos basados en los datos reales para ahorrar o invertir mejor.
3. Una predicción de cómo terminará el mes si sigue así.

Usa tono profesional, motivador y directo.`
    }
  ]);

  const parsed = JSON.parse(content);
  return parsed.text || content;
};

export const detectTransactionType = (text: string) => {
  const lower = text.toLowerCase();
  if (
    lower.includes("gané") ||
    lower.includes("recibí") ||
    lower.includes("ingreso") ||
    lower.includes("sueldo")
  )
    return "income";
  return "expense";
};
