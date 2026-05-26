import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface ProBannerProps {
  user?: UserProfile;
  onUpgrade: () => void;
}

export function ProBanner({ user, onUpgrade }: ProBannerProps) {
  if (!user) {
    return <div className="p-6 bg-white rounded-3xl animate-pulse">Cargando...</div>;
  }

  // Si es Pro pagado (isActive o campo antiguo isPro), no mostrar banner
  const isProPaid = user.isActive === true || user.isPro === true;
  if (isProPaid) {
    return null;
  }

  // Detectar trial activo solo si isTrialActive es true y la fecha de fin es futura
  let trialActive = false;
  if (user.isTrialActive) {
    let trialEnd = null;
    if (user.trialEndDate) {
      if (typeof user.trialEndDate.toDate === 'function') {
        trialEnd = user.trialEndDate.toDate();
      } else if (user.trialEndDate instanceof Date) {
        trialEnd = user.trialEndDate;
      } else if (typeof user.trialEndDate === 'string') {
        trialEnd = new Date(user.trialEndDate);
      }
    }
    if (trialEnd && trialEnd > new Date()) {
      trialActive = true;
    }
  }

  if (trialActive) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
        <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
        <div className="flex items-center gap-2 mb-2">
          <Logo size="sm" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
            Período de prueba
          </span>
        </div>
        <h3 className="font-bold text-lg mb-1">$martMone¥ Pro</h3>
        <p className="text-sm text-blue-100 opacity-80 mb-4">
          Disfruta de todas las funciones Pro durante tu prueba.
        </p>
      </div>
    );
  }

  // Usuario gratuito estándar
  const maxTextRecords = 40;
  const usedRecords = user.monthlyRecordCount ?? 0;
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
