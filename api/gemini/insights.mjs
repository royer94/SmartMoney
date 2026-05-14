import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { summary, goalsSummary } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Missing summary field' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Actúa como un experto asesor financiero certificado. 
              Analiza estos movimientos recientes del usuario:\n${summary}\n\nPresupuestos actuales:\n${goalsSummary || 'No definidos'}\n
              
              Proporciona:
              1. Una evaluación cruda pero constructiva de sus hábitos (máximo 2 líneas).
              2. Tres "Insights Pro" específicos (basados en sus datos reales) para ahorrar o invertir mejor.
              3. Una predicción de cómo terminará el mes si sigue así.
              
              Usa un tono profesional, motivador y directo. Formato: Markdown.`
            }
          ]
        }
      ]
    });

    const text = response.text || '';
    if (!text) return res.status(500).json({ error: 'Empty response from Gemini' });

    res.status(200).json({ text });
  } catch (error) {
    console.error("[gemini/insights] Error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
