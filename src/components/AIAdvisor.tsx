import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Lock, ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFinancialInsights } from '../lib/gemini';
import { UserProfile, Transaction, Goal } from '../types';
import Markdown from 'react-markdown';

export function AIAdvisor({ user, transactions, goals }: { user: UserProfile, transactions: Transaction[], goals: Goal[] }) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchInsights = async () => {
    if (!user.isPro) return;
    setLoading(true);
    try {
      const result = await getFinancialInsights(transactions, goals);
      setInsights(result || "No hay suficientes datos para darte un consejo Pro todavía.");
    } catch (e) {
      setInsights("Error obteniendo asesoría IA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.isPro && transactions.length > 0 && !insights) {
      fetchInsights();
    }
  }, [user.isPro]);

  if (!user.isPro) {
    return (
      <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform">
          <Sparkles className="w-24 h-24" />
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
             className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold hover:bg-indigo-100 transition-all transform active:scale-95 flex items-center gap-2"
          >
            Suscribirme a Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-8 rounded-[2.5rem] bg-indigo-50 border-indigo-100 relative shadow-xl shadow-indigo-500/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 tracking-tight">Estrategia SmartMone¥ AI</h3>
            <p className="text-xs text-indigo-600 font-medium">Análisis personalizado basado en tus datos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchInsights}
            disabled={loading}
            title="Refrescar análisis"
            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors disabled:animate-spin"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          {insights && !loading && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              {isExpanded ? (
                <>Contraer <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Ver Análisis <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && insights && !loading && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-8 prose prose-slate prose-sm max-w-none border-t border-indigo-100 mt-6 transition-colors">
              <div className="markdown-body text-slate-700 leading-relaxed bg-white/50 p-6 rounded-2xl border border-indigo-50 transition-colors">
                <Markdown>{insights}</Markdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="mt-8 space-y-3">
          <div className="h-4 bg-indigo-100 rounded-full w-3/4 animate-pulse" />
          <div className="h-4 bg-indigo-100 rounded-full w-full animate-pulse" />
          <div className="h-4 bg-indigo-100 rounded-full w-2/3 animate-pulse" />
        </div>
      )}

      {!loading && !insights && (
        <div className="mt-6 p-4 text-center border-2 border-dashed border-indigo-200 rounded-2xl transition-colors">
          <p className="text-slate-500 text-sm">¿Listo para un consejo experto? Haz clic en refrescar para iniciar el análisis.</p>
        </div>
      )}
    </div>
  );
}
