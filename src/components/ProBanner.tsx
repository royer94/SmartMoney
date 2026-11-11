import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Zap, Mic, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import {
  UserProfile,
  TRIAL_TEXT_LIMIT,
  TRIAL_VOICE_LIMIT,
  FREE_TEXT_LIMIT,
  FREE_VOICE_LIMIT
} from '../types';

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

  // Detectar trial activo de 30 días
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

  const maxTextRecords = trialActive ? TRIAL_TEXT_LIMIT : FREE_TEXT_LIMIT;
  const maxVoiceRecords = trialActive ? TRIAL_VOICE_LIMIT : FREE_VOICE_LIMIT;
  const usedTextRecords = user.monthlyRecordCount ?? 0;
  const usedVoiceRecords = user.monthlyVoiceCount ?? 0;
  const textProgress = (usedTextRecords / maxTextRecords) * 100;
  const voiceProgress = (usedVoiceRecords / maxVoiceRecords) * 100;

  if (trialActive) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden space-y-4">
        <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Prueba Pro (30 días)
            </span>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1">$martMone¥ Pro (Trial)</h3>
          <p className="text-xs text-blue-100 opacity-90">
            Tienes acceso a todas las herramientas Pro con tu cupo de prueba:
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1 font-medium text-blue-100"><MessageSquare className="w-3.5 h-3.5" /> Texto</span>
              <span className="font-bold">{usedTextRecords}/{maxTextRecords}</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all" style={{ width: `${Math.min(textProgress, 100)}%` }} />
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1 font-medium text-blue-100"><Mic className="w-3.5 h-3.5" /> Voz</span>
              <span className="font-bold">{usedVoiceRecords}/{maxVoiceRecords}</span>
            </div>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-300 h-full rounded-full transition-all" style={{ width: `${Math.min(voiceProgress, 100)}%` }} />
            </div>
          </div>
        </div>

        <button 
          onClick={onUpgrade}
          className="w-full py-3 bg-white text-indigo-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-lg active:scale-95"
        >
          Pasar a Pro Ilimitado <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl overflow-hidden relative group transition-colors space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-slate-900 text-sm md:text-base">Cupo Mensual (Plan Free)</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Registros de Texto</span>
            <span className="font-bold text-blue-600">{usedTextRecords}/{maxTextRecords}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(textProgress, 100)}%` }}
              className={cn("h-full rounded-full transition-all", textProgress > 80 ? "bg-red-500" : "bg-blue-600")}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 font-medium flex items-center gap-1"><Mic className="w-3.5 h-3.5" /> Registros por Voz</span>
            <span className="font-bold text-indigo-600">{usedVoiceRecords}/{maxVoiceRecords}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(voiceProgress, 100)}%` }}
              className={cn("h-full rounded-full transition-all", voiceProgress > 80 ? "bg-red-500" : "bg-indigo-600")}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={onUpgrade}
        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
      >
        Desbloquear Pro Ilimitado <Zap className="w-4 h-4 text-emerald-400" />
      </button>

      {(textProgress >= 80 || voiceProgress >= 80) && (
        <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter text-center animate-pulse">
          ¡Límite casi alcanzado!
        </p>
      )}
    </div>
  );
}
