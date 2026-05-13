import React, { useState } from 'react';
import { Logo } from './Logo';
import { ArrowRight, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';
import { UserProfile, FREE_LIMIT } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { openEpaycoCheckout } from '../services/paymentService';

const PRICES = [
  { months: 1, amount: 16900, label: '1 Mes', desc: 'Acceso mensual' },
  { months: 3, amount: 40900, label: '3 Meses', desc: 'Ahorra 19%', badge: 'Popular' },
  { months: 6, amount: 74900, label: '6 Meses', desc: 'Ahorra 26%' },
  { months: 12, amount: 139900, label: '1 Año', desc: 'Ahorra 31%', badge: 'Mejor Valor' },
];

export function ProBanner({ user }: { user: UserProfile }) {
  const [selectedPlan, setSelectedPlan] = useState(PRICES[1]); // Default 3 months
  const [showPlans, setShowPlans] = useState(false);

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

  const handlePayment = () => {
    openEpaycoCheckout({
      amount: selectedPlan.amount,
      name: `Plan Pro - ${selectedPlan.label}`,
      description: `Activación de SmartMone¥ Pro por ${selectedPlan.months} meses`,
      userId: user.uid,
      months: selectedPlan.months,
      email: user.email
    });
  };

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

      {!showPlans ? (
        <button 
          onClick={() => setShowPlans(true)}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
        >
          Desbloquear Pro <Sparkles className="w-4 h-4 text-emerald-400" />
        </button>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-2 gap-2">
            {PRICES.map((p) => (
              <button
                key={p.months}
                onClick={() => setSelectedPlan(p)}
                className={cn(
                  "p-3 rounded-2xl border transition-all text-left relative",
                  selectedPlan.months === p.months 
                    ? "bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-600/20" 
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200"
                )}
              >
                {p.badge && (
                  <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                    {p.badge}
                  </span>
                )}
                <p className="text-xs font-black uppercase tracking-widest">{p.label}</p>
                <p className="text-[10px] opacity-70 font-bold">${p.amount.toLocaleString()} COP</p>
              </button>
            ))}
          </div>

          <button 
            onClick={handlePayment}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            Pagar con <span className="font-serif italic font-medium">ePayco</span> <CreditCard className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setShowPlans(false)}
            className="w-full py-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-slate-600 transition-colors"
          >
            Volver
          </button>
        </div>
      )}
      
      {progress >= 80 && !showPlans && (
        <p className="text-[10px] text-red-500 mt-3 font-bold uppercase tracking-tighter text-center animate-pulse">
          ¡Límite casi alcanzado!
        </p>
      )}
    </div>
  );
}
