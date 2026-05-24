import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react'; // Ajustado a tu versión de 'motion'
import { Sparkles, ShieldAlert, ArrowRight } from 'lucide-react'; // Tus iconos de Lucide

interface TrialBannerProps {
  userData: {
    plan?: string;
    isTrialActive?: boolean;
    trialEndDate?: any; // Timestamp de Firebase
  } | null;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ userData }) => {
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);

  useEffect(() => {
    if (userData?.trialEndDate) {
      // Convertir el Timestamp de Firebase a objeto Date de JavaScript
      const fechaVencimiento = userData.trialEndDate.toDate 
        ? userData.trialEndDate.toDate() 
        : new Date(userData.trialEndDate.seconds * 1000);
      
      const hoy = new Date();
      
      // Cálculo matemático de diferencia de días
      const diferenciaMs = fechaVencimiento.getTime() - hoy.getTime();
      const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
      
      setDiasRestantes(dias > 0 ? dias : 0);
    }
  }, [userData]);

  // Si no hay datos, o ya no está en periodo de prueba, no mostramos este banner premium
  if (!userData || userData.plan !== 'trial' || diasRestantes === null) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md"
      >
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Mensaje Dinámico basado en los días restantes */}
          <div className="flex items-center flex-1 min-w-0 gap-3">
            <span className="flex p-2 rounded-lg bg-white/10 animate-pulse">
              {diasRestantes <= 5 ? (
                <ShieldAlert className="h-5 w-5 text-amber-300" />
              ) : (
                <Sparkles className="h-5 w-5 text-stars" />
              )}
            </span>
            
            <p className="font-medium truncate text-sm sm:text-base">
              {diasRestantes > 0 ? (
                <>
                  ¡Estás disfrutando de <span className="font-extrabold underline decoration-wavy">SmartMoney AI Pro</span>! 
                  Te quedan <span className="font-black text-amber-300 bg-white/10 px-2 py-0.5 rounded-md">{diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}</span> de prueba gratis.
                </>
              ) : (
                <>Tu periodo de prueba Pro ha vencido. Tu cuenta pasará al plan Free limitado.</>
              )}
            </p>
          </div>

          {/* Botón Call to Action Amable */}
          <div className="flex-shrink-0 w-full sm:w-auto">
            <button
              onClick={() => alert("Redirigiendo a Pasarela de Pago (Stripe/Wompi)...")}
              className="w-full flex items-center justify-center px-4 py-2 rounded-full bg-white text-indigo-700 font-bold text-sm shadow-sm hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 active:scale-95 group"
            >
              {diasRestantes > 0 ? 'Asegurar mi Plan Pro' : 'Actualizar a Pro'}
              <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
