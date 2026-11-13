import React, { useMemo, useState, useEffect } from 'react';
import { RefreshCw, Lock, ChevronDown, ChevronUp, BrainCircuit, Sparkles, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { getDeepAIInsights } from '../lib/gemini';
import { buildFinancialInsights } from '../lib/financialInsights';
import { UserProfile, Transaction, Goal } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency } from '../lib/utils';

export function AIAdvisor({
  user: _user,
  transactions,
  goals,
  onUpgrade,
}: {
  user: UserProfile;
  transactions: Transaction[];
  goals: Goal[];
  onUpgrade?: () => void;
}) {
  const { isPro } = useSubscription();
  const { currency } = useCurrency();

  const [isExpanded, setIsExpanded] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const localReport = useMemo(
    () => buildFinancialInsights(transactions, goals, currency.code, new Date(), (amt) => formatCurrency(amt, currency.code)),
    [transactions, goals, currency.code]
  );

  // Limpiar estrategia IA previa si cambia la moneda o las transacciones para evitar datos desactualizados
  useEffect(() => {
    setAiStrategy(null);
    setAiError(null);
  }, [currency.code, transactions.length]);

  const handleGenerateAIStrategy = async () => {
    if (!isPro || !localReport.hasData) return;
    setAiLoading(true);
    setAiError(null);
    setIsExpanded(true);
    try {
      const result = await getDeepAIInsights(transactions, goals, currency.code);
      setAiStrategy(result);
    } catch (err: any) {
      setAiError(err?.message || 'No se pudo obtener la estrategia IA en este momento.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!isPro) {
    return (
      <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
          <BrainCircuit className="w-24 h-24" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs">
            <Lock className="w-4 h-4" />
            Función Pro
          </div>
          <h3 className="text-2xl font-bold tracking-tight">Asesor Financiero Personal IA</h3>
          <p className="text-slate-400 max-w-sm">
            Recibe análisis profundos de tus hábitos, predicciones de fin de mes y consejos personalizados basados en tus datos reales.
          </p>
          <button
            onClick={onUpgrade}
            className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold hover:bg-indigo-100 transition-all transform active:scale-95 flex items-center gap-2"
          >
            Suscribirme a Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6 sm:p-8 rounded-[2.5rem] bg-indigo-50 border-indigo-100 relative shadow-xl shadow-indigo-500/5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 shrink-0">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900 tracking-tight">Estrategia SmartMone¥ AI</h3>
              {localReport.hasData && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    localReport.alertCount > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {localReport.alertCount > 0 && <AlertTriangle className="w-3 h-3" />}
                  {localReport.headline}
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-600 font-medium mt-0.5 truncate">
              {localReport.hasData
                ? 'Diagnóstico inmediato con proyección de cierre y estrategia IA bajo demanda'
                : 'Registra movimientos este mes para activar tu diagnóstico'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {localReport.hasData && (
            <button
              onClick={handleGenerateAIStrategy}
              disabled={aiLoading}
              title="Generar estrategia personalizada con IA"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-100/70 transition-all active:scale-95 disabled:opacity-60"
            >
              {aiLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{aiStrategy ? 'Regenerar IA' : 'Análisis IA'}</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-all shadow-md active:scale-95"
          >
            {isExpanded ? (
              <>Contraer <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Ver Análisis <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-6 border-t border-indigo-100 mt-6 space-y-4">
              <div className="prose prose-slate prose-sm max-w-none">
                <div className="markdown-body text-slate-700 leading-relaxed bg-white/70 p-5 sm:p-6 rounded-2xl border border-indigo-100">
                  <Markdown>{localReport.markdown}</Markdown>
                </div>
              </div>

              {(aiLoading || aiStrategy || aiError) && (
                <div className="bg-gradient-to-br from-indigo-600/5 to-violet-600/10 p-5 sm:p-6 rounded-2xl border border-indigo-200">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-3">
                    <Sparkles className="w-4 h-4" />
                    Estrategia personalizada con IA
                  </div>

                  {aiLoading && (
                    <div className="space-y-2.5">
                      <div className="h-3.5 bg-indigo-200/70 rounded-full w-3/4 animate-pulse" />
                      <div className="h-3.5 bg-indigo-200/70 rounded-full w-full animate-pulse" />
                      <div className="h-3.5 bg-indigo-200/70 rounded-full w-2/3 animate-pulse" />
                    </div>
                  )}

                  {!aiLoading && aiError && (
                    <p className="text-sm text-rose-600 font-medium">{aiError}</p>
                  )}

                  {!aiLoading && aiStrategy && (
                    <div className="prose prose-slate prose-sm max-w-none markdown-body text-slate-800 leading-relaxed">
                      <Markdown>{aiStrategy}</Markdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
