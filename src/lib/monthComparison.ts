import type { Transaction } from '../types';

export type ComparisonScope = 'mtd' | 'full';

export interface MetricDelta {
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null;
}

export interface CategoryComparisonItem {
  category: string;
  current: number;
  previous: number;
  diff: number;
  percentChange: number | null;
}

export interface MonthComparisonSummary {
  currentMonthIndex: number;
  currentYear: number;
  previousMonthIndex: number;
  previousYear: number;
  cutoffDay: number;
  expenses: MetricDelta;
  income: MetricDelta;
  balance: MetricDelta;
  topCategories: CategoryComparisonItem[];
}

function toValidDate(ts: any): Date | null {
  if (!ts) return null;
  const d = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeDelta(current: number, previous: number): MetricDelta {
  const diff = current - previous;
  const percentChange = previous > 0 ? Math.round((diff / previous) * 100) : null;
  return { current, previous, diff, percentChange };
}

export function buildMonthComparison(
  transactions: Transaction[],
  scope: ComparisonScope = 'mtd',
  referenceDate: Date = new Date()
): MonthComparisonSummary {
  const currentMonthIndex = referenceDate.getMonth();
  const currentYear = referenceDate.getFullYear();
  const previousMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const previousYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

  const daysInPreviousMonth = new Date(previousYear, previousMonthIndex + 1, 0).getDate();
  const cutoffDay = Math.min(referenceDate.getDate(), daysInPreviousMonth);

  let currentExpenses = 0;
  let previousExpenses = 0;
  let currentIncome = 0;
  let previousIncome = 0;

  const currentByCategory: Record<string, number> = {};
  const previousByCategory: Record<string, number> = {};

  for (const tx of transactions) {
    if ((tx as any).deleted) continue;
    const d = toValidDate(tx.timestamp);
    if (!d) continue;

    const m = d.getMonth();
    const y = d.getFullYear();
    const day = d.getDate();
    const amount = Number(tx.amount) || 0;
    const category = tx.category || 'Otros';

    if (y === currentYear && m === currentMonthIndex) {
      if (scope === 'mtd' && day > referenceDate.getDate()) continue;
      if (tx.type === 'expense') {
        currentExpenses += amount;
        currentByCategory[category] = (currentByCategory[category] || 0) + amount;
      } else if (tx.type === 'income') {
        currentIncome += amount;
      }
    } else if (y === previousYear && m === previousMonthIndex) {
      if (scope === 'mtd' && day > cutoffDay) continue;
      if (tx.type === 'expense') {
        previousExpenses += amount;
        previousByCategory[category] = (previousByCategory[category] || 0) + amount;
      } else if (tx.type === 'income') {
        previousIncome += amount;
      }
    }
  }

  const allCategories = new Set([
    ...Object.keys(currentByCategory),
    ...Object.keys(previousByCategory),
  ]);

  const topCategories: CategoryComparisonItem[] = Array.from(allCategories)
    .map((category) => {
      const curr = currentByCategory[category] || 0;
      const prev = previousByCategory[category] || 0;
      const delta = computeDelta(curr, prev);
      return {
        category,
        current: curr,
        previous: prev,
        diff: delta.diff,
        percentChange: delta.percentChange,
      };
    })
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 4);

  return {
    currentMonthIndex,
    currentYear,
    previousMonthIndex,
    previousYear,
    cutoffDay,
    expenses: computeDelta(currentExpenses, previousExpenses),
    income: computeDelta(currentIncome, previousIncome),
    balance: computeDelta(currentIncome - currentExpenses, previousIncome - previousExpenses),
    topCategories,
  };
}
