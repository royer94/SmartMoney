import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

interface TrialBannerProps {
  userData: {
    plan?: string;
    isTrialActive?: boolean;
    trialEndDate?: any; // Timestamp de Firebase
  } | null;
  onUpgrade?: () => void; // 👈 1. Añadimos la función de pago como propiedad
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ userData, onUpgrade }) => {
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);

  useEffect(() => {
    if (userData?.trialEndDate) {
      const fechaVencimiento = userData.trialEndDate.toDate 
        ? userData.trialEndDate.toDate() 
        : new Date(userData.trialEndDate.seconds * 1000);
      
      const hoy = new Date();
      const diferenciaMs = fechaVencimiento.getTime() - hoy.getTime();
      const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
      
      setDiasRestantes(dias > 0 ? dias : 0);
    }
  }, [userData]);

  if (!userData || userData.plan !== 'trial' || diasRestantes === null) return null;

  // 🌟 VARIANT 1: Modo Cortesía (Días 30 al 6) - Ultra compacto
  if (diasRestantes > 5) {
    return (
      <div className="w-full bg-slate-900 text-slate-300 text-xs py-1.5 px-4 flex items-center justify-center gap-2 border-b border-slate-800 selection:bg-indigo-500">
        <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
        <span>
          Modo <span className="text-white font-semibold">SmartMoney AI Pro</span> activado. Te quedan {diasRestantes} días de prueba.
        </span>
        <button 
          onClick={onUpgrade} // 👈 2. Reemplazamos el alert por la función real
          className="ml-2 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded transition-all"
        >
          Asegurar Pro
        </button>
      </div>
    );
  }

  // 🌟 VARIANT 2: Modo Urgencia (Días 5 al 0) - Gradiente llamativo
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md"
      >
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center flex-1 min-w-0 gap-3">
            <span className="flex p-2 rounded-lg bg-white/10 animate-bounce">
              <ShieldAlert className="h-5 w-5 text-amber-300" />
            </span>
            
            <p className="font-medium truncate text-sm sm:text-base">
              {diasRestantes > 0 ? (
                <>
                  ¡Atención! Tu prueba de <span className="font-extrabold underline decoration-wavy">SmartMoney AI Pro</span> está por expirar. 
                  Te quedan solo <span className="font-black text-amber-300 bg-white/10 px-2 py-0.5 rounded-md">{diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}</span>.
                </>
              ) : (
                <>Tu periodo de prueba Pro ha vencido. Tu cuenta pasará al plan Free limitado.</>
              )}
            </p>
          </div>

          <div className="flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={onUpgrade} // 👈 3. Reemplazamos el alert por la función real
              className="w-full flex items-center justify-center px-4 py-2 rounded-full bg-white text-indigo-700 font-bold text-sm shadow-sm hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              {diasRestantes > 0 ? 'Mantener mi Plan Pro' : 'Actualizar a Pro'}
              <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
