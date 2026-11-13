import type { Goal, Transaction } from '../types';

export interface FinancialInsightsResult {
  markdown: string;
  headline: string;
  alertCount: number;
  hasData: boolean;
  promptSummary: string;
}

const CATEGORY_MAX_THRESHOLDS: Record<string, number> = {
  Vivienda: 0.35,
  Comida: 0.20,
  Supermercado: 0.20,
  Transporte: 0.15,
  Servicios: 0.10,
  Suscripciones: 0.05,
  Entretenimiento: 0.10,
  Salud: 0.10,
  Educación: 0.15,
  Ropa: 0.08,
  Mascotas: 0.05,
  Café: 0.05,
  Compras: 0.10,
  Otros: 0.10,
};

function getCategoryTip(category: string): string {
  switch (category) {
    case 'Vivienda':
      return 'revisar si puedes renegociar el arriendo o hipoteca, o optimizar gastos asociados al hogar.';
    case 'Comida':
    case 'Supermercado':
      return 'planificar menús semanales, limitar domicilios y comparar precios antes de comprar.';
    case 'Café':
      return 'preparar café en casa algunos días a la semana puede liberar un monto importante al mes.';
    case 'Compras':
      return 'aplicar la regla de las 48 horas antes de compras no esenciales para evitar impulsos.';
    case 'Entretenimiento':
      return 'sustituir algunas salidas costosas por alternativas gratuitas o de bajo costo.';
    case 'Suscripciones':
      return 'cancelar suscripciones que no uses con frecuencia y revisar planes familiares.';
    case 'Transporte':
      return 'agrupar trayectos, usar transporte público o revisar el consumo de combustible.';
    case 'Ropa':
      return 'priorizar prendas versátiles y aprovechar temporadas de descuento planificadas.';
    case 'Servicios':
      return 'revisar tarifas de internet/telefonía y hábitos de consumo de energía.';
    case 'Mascotas':
      return 'comprar alimento por volumen y comparar planes preventivos veterinarios.';
    case 'Salud':
      return 'revisar coberturas de tu plan de salud y opciones de medicamentos genéricos.';
    case 'Educación':
      return 'aprovechar recursos incluidos o becas y priorizar cursos con mayor retorno práctico.';
    default:
      return 'revisar tus movimientos recientes en esta categoría y definir un tope semanal.';
  }
}

function parseTxDate(timestamp: unknown): Date {
  try {
    if (timestamp && typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
      return (timestamp as { toDate: () => Date }).toDate();
    }
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const parsed = new Date(timestamp);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  } catch {
    // fallback below
  }
  return new Date();
}

function defaultFormatAmount(amount: number, currencyCode = 'COP'): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount)}`;
  }
}

export function buildFinancialInsights(
  transactions: Transaction[],
  goals: Goal[],
  currencyCode?: string,
  now: Date = new Date(),
  formatAmount?: (amount: number) => string
): FinancialInsightsResult {
  const fmt = formatAmount ?? ((amount: number) => defaultFormatAmount(amount, currencyCode));
  const active = transactions.filter((t) => !(t as { deleted?: boolean }).deleted);

  if (active.length === 0) {
    return {
      markdown: 'No hay movimientos activos para analizar. Registra algunos gastos e ingresos.',
      headline: 'Sin movimientos aún',
      alertCount: 0,
      hasData: false,
      promptSummary: '',
    };
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const period = active.filter((t) => {
    const d = parseTxDate(t.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (period.length === 0) {
    return {
      markdown: 'Aún no hay movimientos en el mes actual. Registra ingresos y gastos para obtener análisis.',
      headline: 'Sin movimientos este mes',
      alertCount: 0,
      hasData: false,
      promptSummary: '',
    };
  }

  const prevPeriod = active.filter((t) => {
    const d = parseTxDate(t.timestamp);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const totalIncome = period
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const expenseTxs = period.filter((t) => t.type === 'expense');
  const expensesByCat: Record<string, number> = {};
  for (const t of expenseTxs) {
    const cat = t.category || 'Otros';
    expensesByCat[cat] = (expensesByCat[cat] || 0) + (t.amount || 0);
  }

  const totalExpenses = Object.values(expensesByCat).reduce((sum, val) => sum + val, 0);
  const sortedCategories = Object.entries(expensesByCat).sort((a, b) => b[1] - a[1]);

  const recurringTxs = expenseTxs.filter((t) => Boolean(t.isRecurring));
  const recurringTotal = recurringTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

  const dayOfMonth = Math.max(1, now.getDate());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const projectedExpenses = (totalExpenses / dayOfMonth) * daysInMonth;

  const prevExpenses = prevPeriod
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const currentGoal = goals.find(
    (g) => g.month === currentMonth + 1 && g.year === currentYear && (!g.category || g.category === 'Todas')
  );

  const monthLabel = now.toLocaleString('es', { month: 'long', year: 'numeric' });
  let markdown = `## Resumen del mes (${monthLabel})\n\n`;
  let alertCount = 0;

  if (totalIncome > 0) {
    const savings = totalIncome - totalExpenses;
    const savingsPercent = (savings / totalIncome) * 100;
    const expensePercent = (totalExpenses / totalIncome) * 100;

    markdown += `📊 **Ingresos:** ${fmt(totalIncome)} | 💸 **Gastos:** ${fmt(totalExpenses)} (${expensePercent.toFixed(0)}%)\n`;
    markdown += `💰 **Ahorro actual:** ${fmt(savings)} (${savingsPercent.toFixed(0)}%)\n`;
    markdown += `🔮 **Proyección de gasto a fin de mes:** ${fmt(projectedExpenses)} al ritmo diario actual\n\n`;

    if (projectedExpenses > totalIncome) {
      alertCount += 1;
      markdown += `> ⚠️ Al ritmo actual podrías cerrar el mes gastando **${fmt(projectedExpenses - totalIncome)}** por encima de tus ingresos.\n\n`;
    }

    const excesses: { cat: string; percent: number; amount: number; max: number }[] = [];
    const underControl: string[] = [];

    for (const [cat, amount] of sortedCategories) {
      const percent = (amount / totalIncome) * 100;
      const maxPct = (CATEGORY_MAX_THRESHOLDS[cat] ?? CATEGORY_MAX_THRESHOLDS.Otros) * 100;
      if (percent > maxPct) {
        excesses.push({ cat, percent, amount, max: maxPct });
      } else {
        underControl.push(cat);
      }
    }

    alertCount += excesses.length;

    if (excesses.length === 0) {
      markdown += `### ✅ ¡Excelente gestión financiera!\n`;
      markdown += `Todas tus categorías de gasto están dentro de los rangos saludables.\n\n`;
    } else {
      markdown += `### ⚠️ Puntos a mejorar\n`;
      for (const exc of excesses) {
        markdown += `- **${exc.cat}**: ${fmt(exc.amount)} (${exc.percent.toFixed(0)}% del ingreso; límite sugerido ≤ ${exc.max.toFixed(0)}%).\n`;
      }
      markdown += `\n`;

      if (underControl.length > 0) {
        markdown += `✅ Categorías bien controladas: ${underControl.join(', ')}.\n\n`;
      }

      const worst = excesses.reduce((a, b) => ((a.percent - a.max) > (b.percent - b.max) ? a : b));
      markdown += `💡 **Tip para ${worst.cat}:** ${getCategoryTip(worst.cat)}\n\n`;
    }
  } else {
    markdown += `💸 **Gastos acumulados:** ${fmt(totalExpenses)} *(aún sin ingresos registrados este mes)*\n`;
    markdown += `🔮 **Proyección de gasto a fin de mes:** ${fmt(projectedExpenses)} al ritmo diario actual\n\n`;

    if (sortedCategories.length > 0) {
      markdown += `### 📌 Principales categorías de gasto\n`;
      for (const [cat, amount] of sortedCategories.slice(0, 4)) {
        const share = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
        markdown += `- **${cat}**: ${fmt(amount)} (${share.toFixed(0)}% del gasto)\n`;
      }
      markdown += `\n💡 **Tip para ${sortedCategories[0][0]}:** ${getCategoryTip(sortedCategories[0][0])}\n\n`;
    }
  }

  if (recurringTotal > 0) {
    const recurringShare = totalIncome > 0 ? ` (${((recurringTotal / totalIncome) * 100).toFixed(0)}% de tus ingresos)` : '';
    markdown += `🔁 **Suscripciones y recurrentes:** ${recurringTxs.length} movimiento${recurringTxs.length > 1 ? 's' : ''} por ${fmt(recurringTotal)}${recurringShare}\n`;
  }

  if (prevExpenses > 0) {
    const diffPct = ((totalExpenses - prevExpenses) / prevExpenses) * 100;
    const trendLabel = diffPct > 0 ? `+${diffPct.toFixed(0)}% vs. mes pasado` : `${diffPct.toFixed(0)}% vs. mes pasado`;
    markdown += `📈 **Comparativa mensual:** Llevas ${fmt(totalExpenses)} frente a ${fmt(prevExpenses)} del mes anterior (${trendLabel}).\n`;
  }

  if (currentGoal && currentGoal.targetAmount > 0) {
    const goalPercent = (totalExpenses / currentGoal.targetAmount) * 100;
    if (totalExpenses > currentGoal.targetAmount) {
      alertCount += 1;
      markdown += `📉 **Presupuesto:** Superaste tu meta de ${fmt(currentGoal.targetAmount)} (${goalPercent.toFixed(0)}%).\n`;
    } else {
      markdown += `🎯 **Presupuesto:** Has usado ${goalPercent.toFixed(0)}% de tu meta de ${fmt(currentGoal.targetAmount)}.\n`;
    }
  }

  const headline = totalIncome > 0
    ? `Ahorro: ${(((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(0)}% • ${alertCount === 0 ? 'Todo en orden' : `${alertCount} alerta${alertCount > 1 ? 's' : ''}`}`
    : `Gastos: ${fmt(totalExpenses)} • Proyección: ${fmt(projectedExpenses)}`;

  const topCategoriesSummary = sortedCategories
    .slice(0, 5)
    .map(([cat, amount]) => `${cat}: ${fmt(amount)}`)
    .join(', ');

  const promptSummary = [
    `Moneda: ${currencyCode || 'por defecto'}`,
    `Mes: ${monthLabel} (día ${dayOfMonth} de ${daysInMonth})`,
    `Ingresos del mes: ${fmt(totalIncome)}`,
    `Gastos del mes: ${fmt(totalExpenses)}`,
    `Proyección gasto fin de mes: ${fmt(projectedExpenses)}`,
    `Gastos mes anterior: ${fmt(prevExpenses)}`,
    `Recurrentes/suscripciones: ${recurringTxs.length} por ${fmt(recurringTotal)}`,
    `Presupuesto mensual: ${currentGoal ? fmt(currentGoal.targetAmount) : 'no definido'}`,
    `Top categorías de gasto: ${topCategoriesSummary || 'ninguna'}`,
  ].join('\n');

  return {
    markdown: markdown.trim(),
    headline,
    alertCount,
    hasData: true,
    promptSummary,
  };
}
