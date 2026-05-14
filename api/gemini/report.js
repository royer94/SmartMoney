import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { timeframe, summary } = req.body;

    if (!timeframe || !summary) {
      return res.status(400).json({ error: 'Missing timeframe or summary fields' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Genera un reporte corto y natural en español sobre estos movimientos financieros de la ${timeframe}: ${summary}. 
              Menciona el total de gastos e ingresos y da un breve consejo financiero.`
            }
          ]
        }
      ]
    });

    const text = response.text || '';
    if (!text) return res.status(500).json({ error: 'Empty response from Gemini' });

    res.status(200).json({ text });
  } catch (error) {
    console.error("[gemini/report] Error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
