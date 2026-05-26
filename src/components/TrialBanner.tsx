import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Timer, Zap } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface TrialBannerProps {
  onUpgrade: () => void;
}

export function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const { isTrialActive, trialRemainingDays, trialEndDate } = useSubscription();
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number }>({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!isTrialActive || !trialEndDate) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(trialEndDate).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (3600000)) / (1000 * 60));
      setTimeLeft({ days, hours, minutes });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // actualizar cada minuto
    return () => clearInterval(interval);
  }, [isTrialActive, trialEndDate]);

  if (!isTrialActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl mb-6"
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
      <div className="relative p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Período de prueba activo</p>
            <h4 className="text-lg font-black">SmartMoney Pro</h4>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-2xl font-black">{timeLeft.days}</span>
            <p className="text-[10px] uppercase">Días</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-black">{timeLeft.hours}</span>
            <p className="text-[10px] uppercase">Horas</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-black">{timeLeft.minutes}</span>
            <p className="text-[10px] uppercase">Min</p>
          </div>
        </div>
        <button
          onClick={onUpgrade}
          className="px-5 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-md"
        >
          <Zap className="w-4 h-4" /> Suscribirme
        </button>
      </div>
    </motion.div>
  );
}
