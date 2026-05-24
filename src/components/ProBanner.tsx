import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useSubscription } from '../hooks/useSubscription';

interface ProBannerProps {
  onUpgrade: () => void;
}

export function ProBanner({ onUpgrade }: ProBannerProps) {
  const { isPro, isTrialActive, remainingTextRecords } = useSubscription();

  // SI EL USUARIO ES PRO, NO MOSTRAMOS NADA EN PANTALLA
  if (isPro) {
    return null;
  }

  // Usuario gratuito: mostrar progreso con límite de 40 registros
  const maxTextRecords = 40;
  const usedRecords = maxTextRecords - remainingTextRecords;
  const progress = (usedRecords / maxTextRecords) * 100;

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl overflow-hidden relative group transition-colors">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-slate-900 text-sm md:text-base">Uso Gratuito</h3>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">
          {usedRecords}/{maxTextRecords}
        </span>
      </div>
      
      <div className="w-full bg-slate-100 h-2 rounded-full mb-6">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          className={cn(
            "h-full rounded-full transition-all",
            progress > 80 ? "bg-red-500" : "bg-blue-600"
          )}
        />
      </div>

      <button 
        onClick={onUpgrade}
        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
      >
        Desbloquear Pro <Zap className="w-4 h-4 text-emerald-400" />
      </button>

      {progress >= 80 && (
        <p className="text-[10px] text-red-500 mt-3 font-bold uppercase tracking-tighter text-center animate-pulse">
          ¡Límite casi alcanzado!
        </p>
      )}
    </div>
  );
}
