import { GoogleGenAI, Type } from "@google/genai";

const CATEGORIES = [
  'Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación',
  'Ropa', 'Servicios', 'Regalos', 'Viajes', 'Mascotas', 'Hogar',
  'Gimnasio', 'Suscripciones', 'Inversiones', 'Ahorro', 'Seguros', 'Otros',
  'Salario', 'Freelance', 'Ventas', 'Intereses', 'Dividendos', 'Bonos',
  'Lotería', 'Reembolso', 'Alquiler', 'Regalo recibido', 'Beca', 'Trabajos Extra',
  'Intercambios', 'Premios', 'Pensión', 'Comisiones', 'Donaciones', 'Varios'
];

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { input } = req.body;

    if (!input) return res.status(400).json({ error: 'Missing input field' });

    const isAudio = typeof input !== 'string';

    const contents = isAudio
      ? [
          {
            role: "user",
            parts: [
              {
                text: `Identifica el tipo de transacción (expense o income), monto (número), categoría (de la lista) y descripción desde este audio.
                Categorías: ${CATEGORIES.join(', ')}.
                Responde SOLO con JSON válido.`
              },
              { inlineData: { mimeType: input.mimeType, data: input.data } }
            ]
          }
        ]
      : [
          {
            role: "user",
            parts: [
              {
                text: `Identifica el tipo de transacción (expense o income), monto (número), categoría (de la lista) y descripción desde este texto: "${input}".
                Categorías: ${CATEGORIES.join(', ')}.
                Responde SOLO con JSON válido.`
              }
            ]
          }
        ];

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

    const text = response.text || '';
    if (!text) return res.status(500).json({ error: 'Empty response from Gemini' });

    res.status(200).json(JSON.parse(text));
  } catch (error) {
    console.error("[gemini/parse] Error:", error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
