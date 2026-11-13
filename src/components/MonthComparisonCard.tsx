import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Minus } from 'lucide-react';
import { Transaction } from '../types';
import { cn } from '../lib/utils';
import { buildMonthComparison, ComparisonScope, MetricDelta } from '../lib/monthComparison';

interface MonthComparisonCardProps {
  transactions: Transaction[];
  months: string[];
  formatAmount: (value: number) => string;
}

function DeltaPill({
  delta,
  invertGood,
  formatAmount,
}: {
  delta: MetricDelta;
  invertGood?: boolean;
  formatAmount: (value: number) => string;
}) {
  const { diff, percentChange } = delta;
  const isNeutral = diff === 0;
  const isPositiveOutcome = invertGood ? diff < 0 : diff > 0;

  const badgeClass = isNeutral
    ? 'bg-slate-100 text-slate-600'
    : isPositiveOutcome
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-700';

  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const absFormatted = formatAmount(Math.abs(diff));
  const pctText =
    percentChange !== null ? ` (${percentChange > 0 ? '+' : ''}${percentChange}%)` : '';

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold', badgeClass)}>
      {isNeutral ? (
        <Minus className="w-3 h-3" />
      ) : diff > 0 ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {isNeutral ? 'Sin cambios' : `${sign}${absFormatted}${pctText}`}
    </span>
  );
}

export function MonthComparisonCard({
  transactions,
  months,
  formatAmount,
}: MonthComparisonCardProps) {
  const [scope, setScope] = useState<ComparisonScope>('mtd');

  const summary = useMemo(
    () => buildMonthComparison(transactions, scope, new Date()),
    [transactions, scope]
  );

  const currentLabel = months[summary.currentMonthIndex];
  const previousLabel = months[summary.previousMonthIndex];

  const metrics = [
    {
      label: 'Gastos',
      delta: summary.expenses,
      invertGood: true,
      accent: 'text-rose-600',
    },
    {
      label: 'Ingresos',
      delta: summary.income,
      invertGood: false,
      accent: 'text-emerald-600',
    },
    {
      label: 'Balance neto',
      delta: summary.balance,
      invertGood: false,
      accent: summary.balance.current >= 0 ? 'text-blue-600' : 'text-rose-600',
    },
  ];

  return (
    <div className="glass p-6 sm:p-8 rounded-[2.5rem] transition-colors space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl">
            <GitCompareArrows className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">
              {currentLabel} vs. {previousLabel}
            </h3>
            <p className="text-xs text-slate-500">
              {scope === 'mtd'
                ? `Comparando del día 1 al ${summary.cutoffDay} de ambos meses`
                : `Comparando todo ${currentLabel} vs. todo ${previousLabel}`}
            </p>
          </div>
        </div>

        <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setScope('mtd')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              scope === 'mtd'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            A la fecha
          </button>
          <button
            type="button"
            onClick={() => setScope('full')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              scope === 'full'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Mes completo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {m.label}
              </span>
              <DeltaPill
                delta={m.delta}
                invertGood={m.invertGood}
                formatAmount={formatAmount}
              />
            </div>
            <p className={cn('text-2xl font-bold', m.accent)}>
              {formatAmount(m.delta.current)}
            </p>
            <p className="text-xs text-slate-500">
              {previousLabel}: <span className="font-semibold text-slate-700">{formatAmount(m.delta.previous)}</span>
            </p>
          </div>
        ))}
      </div>

      {summary.topCategories.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mayores variaciones en gastos por categoría
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {summary.topCategories.map((cat) => {
              const maxVal = Math.max(cat.current, cat.previous, 1);
              const currentPct = Math.round((cat.current / maxVal) * 100);
              const previousPct = Math.round((cat.previous / maxVal) * 100);
              const spentMore = cat.diff > 0;

              return (
                <div
                  key={cat.category}
                  className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 truncate">
                      {cat.category}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-bold shrink-0',
                        cat.diff === 0
                          ? 'text-slate-500'
                          : spentMore
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                      )}
                    >
                      {cat.diff > 0 ? '+' : cat.diff < 0 ? '-' : ''}
                      {formatAmount(Math.abs(cat.diff))}
                      {cat.percentChange !== null
                        ? ` (${cat.percentChange > 0 ? '+' : ''}${cat.percentChange}%)`
                        : ''}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="w-16 truncate">{currentLabel}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${currentPct}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-semibold">
                        {formatAmount(cat.current)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="w-16 truncate">{previousLabel}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-300 rounded-full"
                          style={{ width: `${previousPct}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-medium">
                        {formatAmount(cat.previous)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
