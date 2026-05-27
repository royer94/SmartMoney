import React, { useState, useEffect } from 'react';
import { Zap, Crown, Hourglass } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface TrialBannerProps {
  user?: UserProfile;
  onUpgrade?: () => void;
}

export function TrialBanner({ user, onUpgrade }: TrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Determinar si es Pro (no mostrar banner)
    const isPro = user.isPro === true;
    let isTrial = user.isTrialActive === true;
    let trialEndDateObj: Date | null = null;

    if (user.trialEndDate) {
      if (typeof user.trialEndDate.toDate === 'function') {
        trialEndDateObj = user.trialEndDate.toDate();
      } else {
        trialEndDateObj = new Date(user.trialEndDate);
      }
      if (!isTrial && trialEndDateObj > new Date()) {
        isTrial = true;
      }
    }

    const shouldShow = isTrial && !isPro;
    if (!shouldShow || !trialEndDateObj) return;

    const updateTimer = () => {
      const now = new Date();
      const diffMs = trialEndDateObj!.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft(null);
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      setTimeLeft({ days, hours, minutes });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // cada minuto

    return () => clearInterval(interval);
  }, [user]);

  // No mostrar si no hay tiempo o no aplica
  if (!timeLeft) return null;

  const { days, hours, minutes } = timeLeft;

  // Formato de la cuenta regresiva
  const parts = [];
  if (days > 0) parts.push(`${days}${days === 1 ? 'd' : 'd'}`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  const timeString = parts.join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 mb-6 shadow-lg shadow-indigo-200"
    >
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {/* Izquierda: Reloj de arena con rotación */}
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="bg-white/20 p-2 rounded-xl"
          >
            <Hourglass className="w-6 h-6 text-amber-300" />
          </motion.div>
        </div>

        {/* Centro: Texto y cuenta regresiva */}
        <div className="flex-1">
          <h4 className="font-bold text-white text-sm">Período de prueba activo</h4>
          <p className="text-xs text-indigo-100 font-mono">
            {timeString}
          </p>
        </div>

        {/* Derecha: Botón de upgrade */}
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
