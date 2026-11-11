import { CATEGORIES, CURRENCIES, DEFAULT_CURRENCY } from "../types";
import { auth } from "./firebase";

const GROQ_PROXY_URL = "https://us-central1-gen-lang-client-0987361888.cloudfunctions.net/groqProxy";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_WHISPER_MODEL = "whisper-large-v3-turbo";

const getCurrentCurrency = () => {
  const code = localStorage.getItem('currency') || DEFAULT_CURRENCY;
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

// ─── Transcribir audio con Whisper (Primero intenta el proxy seguro en Cloud Functions) ───
export const transcribeAudio = async (mimeType: string, base64Data: string): Promise<string> => {
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const proxyRes = await fetch(GROQ_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ action: 'transcribe', mimeType, base64Data })
      });
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        return (data.text || '').trim();
      }
    } catch (e) {
      // Fallback silencioso a cliente si el proxy aún no tiene GROQ_API_KEY
    }
  }

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const audioBlob = new Blob([byteNumbers], { type: mimeType });
  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';

  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${ext}`);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const response = await fetch(GROQ_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
    body: formData
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Error transcribiendo audio');
  }

  return (await response.text()).trim();
};

// ─── Chat con Llama (Primero intenta el proxy seguro en Cloud Functions) ──────────────────
const groqChat = async (messages: { role: string; content: string }[]): Promise<string> => {
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      const proxyRes = await fetch(GROQ_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ action: 'chat', messages })
      });
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.content) return data.content;
      }
    } catch (e) {
      // Fallback silencioso a cliente si el proxy aún no tiene GROQ_API_KEY
    }
  }

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

// ─── Parsear transacción con IA (solo cuando el parser local no es suficiente) ───
export const parseTransaction = async (
  input: string | { mimeType: string; data: string }
) => {
  try {
    let textInput: string;
    if (typeof input !== 'string') {
      textInput = await transcribeAudio(input.mimeType, input.data);
      if (!textInput) throw new Error('No se detectó voz en el audio');
    } else {
      textInput = input;
    }

    const currency = getCurrentCurrency();

    const content = await groqChat([
      {
        role: 'system',
        content: `Eres un asistente de finanzas personales. El usuario usa ${currency.name} (${currency.code}).
Extrae la información de transacciones del texto del usuario.
Categorías disponibles: ${CATEGORIES.join(', ')}.
Responde ÚNICAMENTE con un objeto JSON válido con estos campos:
- type: "expense" o "income"
- amount: número (sin símbolos, en ${currency.code})
- category: una de las categorías listadas
- description: descripción breve en español`
      },
      { role: 'user', content: textInput }
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
  const currency = getCurrentCurrency();
  const summary = transactions
    .map(t => `${t.type === 'expense' ? 'Gasto' : 'Ingreso'}: ${t.description} por ${currency.symbol}${t.amount}`)
    .join(', ');

  const content = await groqChat([
    {
      role: 'system',
      content: `Eres un asesor financiero personal. El usuario usa ${currency.name} (${currency.code}). Responde en español. Responde en JSON con el campo: { "text": "..." }`
    },
    {
      role: 'user',
      content: `Genera un reporte corto sobre estos movimientos de la ${timeframe}: ${summary}. Menciona totales y da un consejo financiero.`
    }
  ]);

  const parsed = JSON.parse(content);
  return parsed.text || content;
};

// ==================== INSIGHTS FINANCIEROS (VERSIÓN DEFINITIVA: SOLO EXCESOS ESTRICTOS) ====================
export const getFinancialInsights = async (
  transactions: any[],
  goals: any[]
): Promise<string> => {
  try {
    console.log('[getFinancialInsights] Análisis enfocado en excesos (solo > límite)');

    // 1. Moneda y formateo
    let currencySymbol = '$';
    try {
      const currency = getCurrentCurrency();
      currencySymbol = currency.symbol || '$';
    } catch (e) {}
    const fmt = (amount: number) => `${currencySymbol}${amount.toLocaleString('es-CO')}`;

    // 2. Filtrar activas (no eliminadas) y del mes actual
    const active = transactions.filter(t => !t.deleted);
    if (active.length === 0) {
      return "No hay movimientos activos para analizar. Registra algunos gastos e ingresos.";
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const period = active.filter(t => {
      let d;
      try {
        if (t.timestamp?.toDate) d = t.timestamp.toDate();
        else if (t.timestamp) d = new Date(t.timestamp);
        else d = new Date();
      } catch { d = new Date(); }
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    if (period.length === 0) {
      return "Aún no hay movimientos en el mes actual. Registra ingresos y gastos para obtener análisis.";
    }

    const totalIncome = period.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    if (!totalIncome) {
      return "No se registraron ingresos en el mes actual. El análisis requiere al menos un ingreso.";
    }

    // 3. Gastos por categoría
    const expensesByCat: Record<string, number> = {};
    period.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'Otros';
      expensesByCat[cat] = (expensesByCat[cat] || 0) + (t.amount || 0);
    });
    const totalExpenses = Object.values(expensesByCat).reduce((a, b) => a + b, 0);
    const savings = totalIncome - totalExpenses;
    const savingsPercent = (savings / totalIncome) * 100;

    // 4. Umbrales saludables (% del ingreso) – valores máximos tolerables
    const thresholds: Record<string, { max: number; min?: number }> = {
      Vivienda: { min: 0.25, max: 0.35 },
      Comida: { min: 0.10, max: 0.20 },
      Supermercado: { min: 0.10, max: 0.20 },
      Transporte: { min: 0.05, max: 0.15 },
      Servicios: { min: 0.05, max: 0.10 },
      Suscripciones: { max: 0.05 },
      Entretenimiento: { max: 0.10 },
      Salud: { max: 0.10 },
      Educación: { max: 0.15 },
      Ropa: { max: 0.08 },
      Mascotas: { max: 0.05 },
      Otros: { max: 0.10 },
    };

    // 5. Clasificar: exceso ESTRICTO (percent > th.max * 100)
    const excesses: { cat: string; percent: number; amount: number; max: number }[] = [];
    const underControl: string[] = [];

    for (const [cat, amount] of Object.entries(expensesByCat)) {
      const percent = (amount / totalIncome) * 100;
      const th = thresholds[cat] || thresholds.Otros;
      if (percent > th.max * 100) {
        excesses.push({ cat, percent, amount, max: th.max * 100 });
      } else {
        underControl.push(cat);
      }
    }

    // 6. Construir el mensaje
    let markdown = `## Resumen del mes (${now.toLocaleString('es', { month: 'long', year: 'numeric' })})\n\n`;
    markdown += `📊 Ingresos: ${fmt(totalIncome)} | 💸 Gastos: ${fmt(totalExpenses)} (${((totalExpenses/totalIncome)*100).toFixed(0)}%)\n`;
    markdown += `💰 Ahorro: ${fmt(savings)} (${savingsPercent.toFixed(0)}%)\n\n`;

    if (excesses.length === 0) {
      markdown += `### ✅ ¡Excelente gestión financiera!\n`;
      markdown += `Todas tus categorías de gasto están dentro de los rangos saludables. Sigue así.\n\n`;
      markdown += `🎉 Sigue así – mantén el control y considera invertir tu excedente.\n`;
    } else {
      markdown += `### ⚠️ Puntos a mejorar\n`;
      for (const exc of excesses) {
        markdown += `- **${exc.cat}**: ${fmt(exc.amount)} (${exc.percent.toFixed(0)}% del ingreso). El límite saludable es ≤ ${exc.max.toFixed(0)}%.\n`;
      }
      markdown += `\n`;

      if (underControl.length > 0) {
        markdown += `✅ Categorías bien controladas: ${underControl.join(', ')}.\n\n`;
      }

      const worst = excesses.reduce((a, b) => ( (a.percent - a.max) > (b.percent - b.max) ? a : b ));
      let tip = "";
      switch (worst.cat) {
        case "Vivienda": tip = "revisar si puedes renegociar el arriendo o hipoteca, o buscar opciones más económicas.";
          break;
        case "Comida":
        case "Supermercado": tip = "planificar menús semanales, evitar comidas fuera de casa y comparar precios en supermercado.";
          break;
        case "Entretenimiento": tip = "sustituir salidas costosas por alternativas gratuitas o de bajo costo.";
          break;
        case "Suscripciones": tip = "cancelar suscripciones que no uses y compartir cuentas familiares.";
          break;
        case "Transporte": tip = "usar transporte público, compartir vehículo o revisar mantenimiento.";
          break;
        case "Ropa": tip = "comprar en temporada de rebajas o priorizar necesidades reales.";
          break;
        default: tip = "revisar tus hábitos y buscar formas de reducir este gasto.";
      }
      markdown += `💡 **Tip para ${worst.cat}:** ${tip}\n`;
    }

    // 7. Información del presupuesto (si existe meta para el mes)
    const currentGoal = goals.find(g => g.month === currentMonth + 1 && g.year === currentYear && (!g.category || g.category === 'Todas'));
    if (currentGoal && currentGoal.targetAmount > 0) {
      const goalPercent = (totalExpenses / currentGoal.targetAmount) * 100;
      if (totalExpenses > currentGoal.targetAmount) {
        markdown += `\n📉 Presupuesto: Superaste tu meta de ${fmt(currentGoal.targetAmount)} (${goalPercent.toFixed(0)}%). Intenta ajustar los gastos excedentes.`;
      } else {
        markdown += `\n📊 Presupuesto: Usaste ${goalPercent.toFixed(0)}% de tu presupuesto de ${fmt(currentGoal.targetAmount)}. ¡Bien!`;
      }
    }

    return markdown;
  } catch (error: any) {
    console.error('[getFinancialInsights] Error:', error);
    return "❌ No se pudo generar el análisis. Intenta de nuevo más tarde.";
  }
};

// ─── Detectar tipo de transacción ─────────────────────────────────────────────
export const detectTransactionType = (text: string): 'income' | 'expense' => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo'))
    return 'income';
  return 'expense';
};
