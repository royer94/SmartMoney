import React from 'react';
import { Zap, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface TrialBannerProps {
  user?: UserProfile;
  onUpgrade?: () => void;
}

export function TrialBanner({ user, onUpgrade }: TrialBannerProps) {
  // ✅ Mostrar solo si está en período de prueba Y no es Pro (pago o legacy)
  const isPro = user?.isPro === true;
  const isTrialActive = user?.isTrialActive === true;
  const showTrial = isTrialActive && !isPro;

  if (!showTrial) return null;

  // Calcular días restantes si existe trialEndDate
  let daysLeft = null;
  if (user?.trialEndDate) {
    const end = user.trialEndDate.toDate ? user.trialEndDate.toDate() : new Date(user.trialEndDate);
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff > 0) daysLeft = diff;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 mb-6 shadow-lg shadow-indigo-200"
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            <Crown className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Período de prueba activo</h4>
            {daysLeft !== null && (
              <p className="text-xs text-indigo-100">
                Te quedan {daysLeft} {daysLeft === 1 ? 'día' : 'días'} de prueba
              </p>
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
