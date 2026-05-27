import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

// Componente de reloj de arena animado (SVG con CSS)
const AnimatedHourglass = () => {
  return (
    <div className="relative w-8 h-8">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ animation: 'hourglassFlip 4s ease-in-out infinite' }}
      >
        <defs>
          <linearGradient id="sandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <clipPath id="topSand">
            <polygon points="30,20 70,20 50,50" />
          </clipPath>
          <clipPath id="bottomSand">
            <polygon points="30,80 70,80 50,50" />
          </clipPath>
        </defs>
        {/* Contenedor superior (vacío) */}
        <polygon points="20,15 80,15 50,50" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
        {/* Contenedor inferior (vacío) */}
        <polygon points="20,85 80,85 50,50" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
        {/* Arena cayendo (línea central) */}
        <line x1="50" y1="50" x2="50" y2="75" stroke="#fbbf24" strokeWidth="3" strokeDasharray="3 3" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="1s" repeatCount="indefinite" />
        </line>
        {/* Arena en el fondo (va llenándose) */}
        <polygon points="30,80 70,80 50,50" fill="url(#sandGrad)">
          <animate attributeName="points" values="30,80 70,80 50,80; 30,80 70,80 50,50; 30,80 70,80 50,80" dur="4s" repeatCount="indefinite" />
        </polygon>
        {/* Efecto de brillo */}
        <circle cx="50" cy="50" r="5" fill="#ffd700" opacity="0.8">
          <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
      <style>
        {`
          @keyframes hourglassFlip {
            0%, 100% { transform: rotate(0deg); }
            45%, 55% { transform: rotate(180deg); }
          }
        `}
      </style>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 mb-6 shadow-lg shadow-indigo-200"
    >
      <div className="relative flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
        {/* Reloj de arena animado */}
        <AnimatedHourglass />

        {/* Texto central */}
        <div className="flex-1 text-center md:text-left">
          <h4 className="font-bold text-white text-sm">Período de prueba activo</h4>
        </div>

        {/* Contador grande a la derecha */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 shadow-inner shrink-0">
          <div className="flex items-baseline gap-1 font-mono font-bold text-white">
            {days > 0 && (
              <>
                <span className="text-2xl md:text-3xl">{days}</span>
                <span className="text-xs uppercase tracking-wider">d</span>
              </>
            )}
            {hours > 0 && (
              <>
                <span className="text-2xl md:text-3xl">{hours}</span>
                <span className="text-xs uppercase tracking-wider">h</span>
              </>
            )}
            <span className="text-2xl md:text-3xl">{minutes}</span>
            <span className="text-xs uppercase tracking-wider">m</span>
          </div>
        </div>

        {/* Botón upgrade */}
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="px-5 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-md shrink-0"
          >
            <Zap className="w-4 h-4" />
            Suscribirme
          </button>
        )}
      </div>
    </motion.div>
  );
}
