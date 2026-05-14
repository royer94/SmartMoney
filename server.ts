import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const CATEGORIES = [
  'Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación',
  'Ropa', 'Servicios', 'Regalos', 'Viajes', 'Mascotas', 'Hogar',
  'Gimnasio', 'Suscripciones', 'Inversiones', 'Ahorro', 'Seguros', 'Otros',
  'Salario', 'Freelance', 'Ventas', 'Intereses', 'Dividendos', 'Bonos',
  'Lotería', 'Reembolso', 'Alquiler', 'Regalo recibido', 'Beca', 'Trabajos Extra',
  'Intercambios', 'Premios', 'Pensión', 'Comisiones', 'Donaciones', 'Varios'
];

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// API Routes
app.post("/api/gemini/parse", async (req, res) => {
  try {
    const { input } = req.body;
    const isAudio = typeof input !== 'string';
    const prompt = `Identify the transaction type (expense or income), amount (as a number), category (from the list), and description from this input.
    Categories: ${CATEGORIES.join(', ')}.
    Return as JSON.`;

    const contents = isAudio ? [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: input.mimeType, data: input.data } }
        ]
      }
    ] : [
      {
        role: "user",
        parts: [{
          text: `Identify the transaction type (expense or income), amount, category (from the list), and description from this text: "${input}". 
          Categories: ${CATEGORIES.join(', ')}.
          Return as JSON.`
        }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
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

    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error("Gemini Parse Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/report", async (req, res) => {
  try {
    const { timeframe, summary } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{
            text: `Genera un reporte corto y natural en español sobre estos movimientos financieros de la ${timeframe}: ${summary}. 
            Menciona el total de gastos e ingresos y da un breve consejo financiero.`
          }]
        }
      ],
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/insights", async (req, res) => {
  try {
    const { summary, goalsSummary } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{
            text: `Actúa como un experto asesor financiero certificado. 
            Analiza estos movimientos recientes del usuario:\n${summary}\n\nPresupuestos actuales:\n${goalsSummary}\n
            
            Proporciona:
            1. Una evaluación cruda pero constructiva de sus hábitos (máximo 2 líneas).
            2. Tres "Insights Pro" específicos (basados en sus datos reales) para ahorrar o invertir mejor.
            3. Una predicción de cómo terminará el mes si sigue así.
            
            Usa un tono profesional, motivador y directo. Formato: Markdown.`
          }]
        }
      ],
    });

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite Middleware for Dev
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
