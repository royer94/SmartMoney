import { CATEGORIES, CURRENCIES, DEFAULT_CURRENCY } from "../types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_WHISPER_MODEL = "whisper-large-v3-turbo";

const getCurrentCurrency = () => {
  const code = localStorage.getItem('currency') || DEFAULT_CURRENCY;
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
};

// ─── Transcribir audio con Whisper ───────────────────────────────────────────
const transcribeAudio = async (mimeType: string, base64Data: string): Promise<string> => {
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

// ─── Chat con Llama ───────────────────────────────────────────────────────────
const groqChat = async (messages: { role: string; content: string }[]): Promise<string> => {
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

// ─── Parsear transacción ─────────────────────────────────────────────────────
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

// ==================== INSIGHTS FINANCIEROS CORREGIDOS ====================
export const getFinancialInsights = async (
  transactions: any[],
  goals: any[]
): Promise<string> => {
  try {
    console.log('[getFinancialInsights] Iniciando análisis con transacciones:', transactions.length);

    // 1. Obtener moneda actual (con fallback)
    let currencySymbol = '$';
    try {
      const currency = getCurrentCurrency();
      currencySymbol = currency.symbol || '$';
    } catch (e) {
      console.warn('No se pudo obtener moneda, usando $ por defecto');
    }
    const formatCurrencyLocal = (amount: number) => `${currencySymbol}${amount.toLocaleString('es-CO')}`;

    // 2. Filtrar transacciones eliminadas (si existe campo deleted)
    const activeTransactions = transactions.filter(t => !t.deleted);
    console.log('Transacciones activas:', activeTransactions.length);

    if (activeTransactions.length === 0) {
      return "No hay movimientos activos para analizar. Registra algunos gastos e ingresos para obtener consejos personalizados.";
    }

    // 3. Determinar período actual (mes en curso)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const periodTransactions = activeTransactions.filter(t => {
      let tDate;
      try {
        if (t.timestamp?.toDate) tDate = t.timestamp.toDate();
        else if (t.timestamp) tDate = new Date(t.timestamp);
        else tDate = new Date();
      } catch (e) {
        tDate = new Date();
      }
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    console.log('Transacciones del mes actual:', periodTransactions.length);

    if (periodTransactions.length === 0) {
      return "Aún no hay movimientos en el mes actual. Una vez registres ingresos y gastos, podré darte un análisis detallado.";
    }

    // 4. Calcular ingreso total del período
    const totalIncome = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0), 0);

    if (totalIncome === 0 || isNaN(totalIncome)) {
      return "No se registraron ingresos válidos en el mes actual. El análisis financiero requiere al menos un ingreso para evaluar tus gastos.";
    }

    // 5. Agrupar gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    periodTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
        const cat = t.category || 'Otros';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amount;
      });

    // 6. Umbrales saludables (% sobre ingreso total)
    const THRESHOLDS: Record<string, { min?: number; max: number; isFixed?: boolean }> = {
      Vivienda: { min: 0.25, max: 0.35, isFixed: true },
      Comida: { min: 0.10, max: 0.20 },
      Transporte: { min: 0.05, max: 0.15 },
      Servicios: { min: 0.05, max: 0.10 },
      Suscripciones: { max: 0.05 },
      Entretenimiento: { max: 0.10 },
      Salud: { max: 0.10 },
      Educación: { max: 0.15 },
      Ropa: { max: 0.08 },
      Mascotas: { max: 0.05 },
      Otros: { max: 0.10 }
    };

    let totalExpenses = 0;
    let fixedExpenses = 0;
    const warnings: string[] = [];
    const positives: string[] = [];

    for (const [cat, amount] of Object.entries(expensesByCategory)) {
      totalExpenses += amount;
      const percent = (amount / totalIncome) * 100;
      const threshold = THRESHOLDS[cat] || THRESHOLDS.Otros;

      if (threshold.isFixed) fixedExpenses += amount;

      if (threshold.min !== undefined && percent < threshold.min * 100) {
        positives.push(`- **${cat}**: ${formatCurrencyLocal(amount)} (${percent.toFixed(1)}% del ingreso). Está por debajo del mínimo recomendado. ¡Excelente control!`);
      } else if (percent > threshold.max * 100) {
        warnings.push(`- **${cat}**: ${formatCurrencyLocal(amount)} (${percent.toFixed(1)}% del ingreso). El rango saludable es hasta ${(threshold.max * 100).toFixed(0)}%. Revisa si puedes reducir este rubro.`);
      } else {
        positives.push(`- **${cat}**: Está dentro del rango saludable (${percent.toFixed(1)}%). ¡Bien controlado!`);
      }
    }

    // 7. Ahorro
    const savings = totalIncome - totalExpenses;
    const savingsPercent = (savings / totalIncome) * 100;
    if (savingsPercent < 10) {
      warnings.push(`- **Ahorro**: Solo estás ahorrando ${formatCurrencyLocal(savings)} (${savingsPercent.toFixed(1)}% del ingreso). Idealmente deberías ahorrar al menos el 10% mensual.`);
    } else if (savingsPercent >= 20) {
      positives.push(`- **Ahorro**: Destinas ${formatCurrencyLocal(savings)} (${savingsPercent.toFixed(1)}% del ingreso). ¡Excelente hábito! Sigue así.`);
    } else {
      positives.push(`- **Ahorro**: ${formatCurrencyLocal(savings)} (${savingsPercent.toFixed(1)}% del ingreso). Buen comienzo, intenta aumentarlo.`);
    }

    // 8. Gastos fijos (vivienda + servicios)
    const fixedPercent = (fixedExpenses / totalIncome) * 100;
    if (fixedPercent > 50) {
      warnings.push(`- **Gastos fijos** (vivienda + servicios): ${fixedPercent.toFixed(1)}% del ingreso. Lo recomendable es no superar el 50%.`);
    }

    // 9. Comparación con presupuesto (meta)
    const currentGoal = goals.find(g => g.month === currentMonth + 1 && g.year === currentYear);
    if (currentGoal && currentGoal.targetAmount > 0) {
      const goalPercent = (totalExpenses / currentGoal.targetAmount) * 100;
      if (totalExpenses > currentGoal.targetAmount) {
        warnings.push(`- **Presupuesto mensual**: Superaste tu presupuesto de ${formatCurrencyLocal(currentGoal.targetAmount)} (${goalPercent.toFixed(0)}%).`);
      } else if (goalPercent > 80) {
        positives.push(`- **Presupuesto**: Has usado el ${goalPercent.toFixed(0)}% de tu presupuesto. ¡Vas bien!`);
      } else {
        positives.push(`- **Presupuesto**: Estás dentro del presupuesto (${goalPercent.toFixed(0)}% utilizado). Buen trabajo.`);
      }
    }

    // 10. Construcción del mensaje final en Markdown
    let markdown = `## Análisis del mes (${now.toLocaleString('es', { month: 'long', year: 'numeric' })})\n\n`;
    markdown += `**Ingreso total:** ${formatCurrencyLocal(totalIncome)}\n`;
    markdown += `**Gasto total:** ${formatCurrencyLocal(totalExpenses)} (${((totalExpenses/totalIncome)*100).toFixed(1)}% del ingreso)\n`;
    markdown += `**Ahorro neto:** ${formatCurrencyLocal(savings)} (${savingsPercent.toFixed(1)}%)\n\n`;

    if (warnings.length) markdown += `### ⚠️ Puntos de atención\n${warnings.join('\n')}\n\n`;
    if (positives.length) markdown += `### ✅ Aspectos positivos\n${positives.join('\n')}\n\n`;

    if (savings > 0 && savingsPercent >= 15) {
      markdown += `🎉 **¡Vas por muy buen camino!** Sigue así.`;
    } else if (savings <= 0) {
      markdown += `📉 **Alerta:** Gastas más de lo que ganas. Prioriza reducir gastos.`;
    } else {
      markdown += `💡 **Sugerencia:** Pequeños ajustes pueden mejorar tu ahorro.`;
    }

    return markdown;
  } catch (error: any) {
    console.error('[getFinancialInsights] ERROR CRÍTICO:', error);
    return `❌ No se pudo generar el análisis debido a un error interno. Por favor, intenta de nuevo más tarde. Detalle técnico: ${error.message || error}`;
  }
};

// ─── Detectar tipo de transacción ─────────────────────────────────────────────
export const detectTransactionType = (text: string): 'income' | 'expense' => {
  const lower = text.toLowerCase();
  if (lower.includes('gané') || lower.includes('recibí') || lower.includes('ingreso') || lower.includes('sueldo'))
    return 'income';
  return 'expense';
};
