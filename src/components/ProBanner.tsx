import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, Zap } from 'lucide-react';
import { UserProfile, FREE_LIMIT } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ProBannerProps {
  user: UserProfile;
  onUpgrade: () => void; // ✅ Prop para abrir el modal de suscripción
}

export function ProBanner({ user, onUpgrade }: ProBannerProps) {
  if (user.isPro) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
        <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 rotate-12" />
        <div className="flex items-center gap-2 mb-2">
          <Logo size="sm" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">Premium Member</span>
        </div>
        <h3 className="font-bold text-lg mb-1">$martMone¥ Pro</h3>
        <p className="text-sm text-blue-100 opacity-80 mb-4">Acceso ilimitado activado.</p>
        <div className="text-xs font-mono bg-white/10 p-2 rounded-lg">
          Expira: {new Date(user.proExpiresAt || '').toLocaleDateString()}
        </div>
      </div>
    );
  }

  const progress = (user.freeRecordsCount / FREE_LIMIT) * 100;

  return (
    <div className="bg-white border border-slate-200 p-6 rounded-3xl overflow-hidden relative group transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900">Uso Gratuito</h3>
        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg transition-colors">
          {user.freeRecordsCount}/{FREE_LIMIT}
        </span>
      </div>
      
      <div className="w-full bg-slate-100 h-2 rounded-full mb-6 transition-colors">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn(
            "h-full rounded-full transition-all",
            progress > 80 ? "bg-red-500" : "bg-blue-600"
          )}
        />
      </div>

      {/* Botón que abre el modal principal */}
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
