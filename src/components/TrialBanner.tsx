import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

// Reloj de arena con llenado y vaciado cíclico (sin rotación)
const AnimatedHourglass = () => {
  return (
    <div className="relative w-6 h-6">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <polygon points="20,15 80,15 50,50" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
        <polygon points="20,85 80,85 50,50" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="50" y1="50" x2="50" y2="75" stroke="#fbbf24" strokeWidth="3" strokeDasharray="3 3" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1s" repeatCount="indefinite" />
        </line>
        <polygon points="30,80 70,80 50,50" fill="url(#sandGrad)">
          <animate attributeName="points" values="30,80 70,80 50,80; 30,80 70,80 50,50; 30,80 70,80 50,80" dur="4s" repeatCount="indefinite" />
        </polygon>
        <circle cx="50" cy="50" r="5" fill="#ffd700" opacity="0.8">
          <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
};

export function TrialBanner({ user, onUpgrade }: TrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    if (!user) return;
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
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [user]);

  if (!timeLeft) return null;

  const { days, hours, minutes } = timeLeft;

  // Formato compacto del contador
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  const counterText = parts.join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl py-2 px-3 mb-4 shadow-md shadow-indigo-200"
    >
      <div className="flex flex-row items-center justify-between gap-2">
        {/* Bloque izquierdo: reloj + texto */}
        <div className="flex items-center gap-2">
          <AnimatedHourglass />
          <span className="font-bold text-white text-[11px] leading-tight">Período de prueba activo</span>
        </div>

        {/* Bloque derecho: contador y botón (apilados verticalmente) */}
        <div className="flex flex-col items-end gap-1">
          {/* Contador compacto */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-0.5">
            <span className="font-mono font-bold text-white text-sm tracking-wider">{counterText}</span>
          </div>

          {/* Botón pulsante reducido */}
          {onUpgrade && (
            <motion.button
              onClick={onUpgrade}
              className="px-3 py-1 bg-white text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: [1, 1.03, 1],
                boxShadow: [
                  "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  "0 2px 4px 0 rgba(0, 0, 0, 0.1)",
                  "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
            >
              <Zap className="w-3 h-3" />
              Suscribirme
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
