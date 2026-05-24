import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useSubscription } from '../hooks/useSubscription';

interface ProBannerProps {
  onUpgrade: () => void;
  // Nota: ya no necesitamos recibir user, porque useSubscription obtiene los datos del contexto global
}

export function ProBanner({ onUpgrade }: ProBannerProps) {
  const { isPro, isTrialActive, remainingTextRecords } = useSubscription();

  // Si tiene acceso Pro (trial activo o suscripción pagada)
  if (isPro) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
        <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
        <div className="flex items-center gap-2 mb-2">
          <Logo size="sm" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
            {isTrialActive ? 'Período de prueba' : 'Premium Member'}
          </span>
        </div>
        <h3 className="font-bold text-lg mb-1">$martMone¥ Pro</h3>
        <p className="text-sm text-blue-100 opacity-80 mb-4">
          {isTrialActive 
            ? 'Disfruta de todas las funciones Pro durante tu prueba.'
            : 'Acceso ilimitado activado.'}
        </p>
      </div>
    );
  }

  // Usuario gratuito: mostrar progreso con límite de 40 registros de texto
  const maxTextRecords = 40;
  const usedRecords = maxTextRecords - remainingTextRecords;
  const progress = (usedRecords / maxTextRecords) * 100;

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl overflow-hidden relative group transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Uso Gratuito</h3>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg transition-colors">
          {usedRecords}/{maxTextRecords}
        </span>
      </div>
      
      <div className="w-full bg-slate-100 h-2 rounded-full mb-6 transition-colors">
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
