import React from 'react';
import { Zap, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface TrialBannerProps {
  user?: UserProfile;
  onUpgrade?: () => void;
}

export function TrialBanner({ user, onUpgrade }: TrialBannerProps) {
  if (!user) return null;

  const isPro = user.isPro === true;
  let isTrial = user.isTrialActive === true;

  // Inferir trial desde trialEndDate
  let trialEndDateObj: Date | null = null;
  if (user.trialEndDate) {
    // Convertir a Date: si es Timestamp de Firestore, usar .toDate()
    if (typeof user.trialEndDate.toDate === 'function') {
      trialEndDateObj = user.trialEndDate.toDate();
    } else {
      trialEndDateObj = new Date(user.trialEndDate);
    }
    // Si la fecha es válida y futura, activar trial si no lo estaba
    if (!isTrial && trialEndDateObj > new Date()) {
      isTrial = true;
    }
  }

  const showTrial = isTrial && !isPro;
  if (!showTrial) return null;

  // ✅ Cálculo de días restantes (asegurar que sea un entero positivo)
  let daysLeft: number | null = null;
  if (trialEndDateObj) {
    const now = new Date();
    const diffTime = trialEndDateObj.getTime() - now.getTime();
    if (diffTime > 0) {
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  // Si no se pudo calcular pero la fecha era futura, mostrar un mensaje genérico
  const showDays = daysLeft !== null && daysLeft > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 mb-6 shadow-lg shadow-indigo-200"
    >
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Crown className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Período de prueba activo</h4>
            {showDays ? (
              <p className="text-xs text-indigo-100">
                Te quedan {daysLeft} {daysLeft === 1 ? 'día' : 'días'} de prueba
              </p>
            ) : (
              <p className="text-xs text-indigo-100">Prueba activa</p>
            )}
          </div>
        </div>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-5 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-md"
          >
            <Zap className="w-4 h-4" />
            Suscribirme ahora
          </button>
        )}
      </div>
    </motion.div>
  );
}
