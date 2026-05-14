import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, X, ShieldCheck, Zap, Target, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile, Goal } from '../types';

interface WelcomeCardProps {
  user: UserProfile;
  goals: Goal[];
  onConfigureBudget: () => void;
}

export function WelcomeCard({ user, goals, onConfigureBudget }: WelcomeCardProps) {
  const [isVisible, setIsVisible] = useState(() => {
    // Show only if not explicitly dismissed before
    return !localStorage.getItem('welcome_card_dismissed');
  });
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const hasCurrentBudget = goals.some(g => g.month === currentMonth && g.year === currentYear);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('welcome_card_dismissed', 'true');
  };

  if (!isVisible && hasCurrentBudget) return null;

  return (
    <div className="space-y-4 mb-8">
      <AnimatePresence>
        {isVisible && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden glass p-6 md:p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-50 to-white border-indigo-100"
          >
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-xs mb-2">
                    <Sparkles className="w-4 h-4" />
                    Bienvenido a SmartMone¥
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Domina tus finanzas con inteligencia</h3>
                  <p className="text-slate-500 mt-2">
                    Gestiona tus gastos, proyecta tu libertad financiera y obtén consejos personalizados de nuestra IA.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/60 rounded-2xl border border-indigo-50">
                    <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Plan Free
                    </h4>
                    <ul className="space-y-2">
                      <FeatureItem text="Hasta 20 registros/mes" available />
                      <FeatureItem text="1 Presupuesto (Meta)" available />
                      <FeatureItem text="IA Advisor básico" available />
                      <FeatureItem text="Reportes avanzados" available={false} />
                    </ul>
                  </div>
                  <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                    <h4 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                      Plan Pro
                    </h4>
                    <ul className="space-y-2">
                      <FeatureItem text="Registros ilimitados" isPro available />
                      <FeatureItem text="Presupuestos ilimitados" isPro available />
                      <FeatureItem text="Simulador de Libertad" isPro available />
                      <FeatureItem text="PDF/CSV e Historial" isPro available />
                    </ul>
                  </div>
                </div>
              </div>

              {!hasCurrentBudget && (
                <div className="lg:w-80 bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                      <Target className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">¿Sin presupuesto este mes?</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Configura un límite de gastos para este mes. Quienes tienen un presupuesto ahorran en promedio un 20% más.
                    </p>
                  </div>
                  <button 
                    onClick={onConfigureBudget}
                    className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-100"
                  >
                    Configurar uno ahora
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureItem({ text, available, isPro }: { text: string; available: boolean; isPro?: boolean }) {
  return (
    <li className={cn(
      "flex items-center gap-2 text-[11px] font-medium",
      isPro ? (available ? "text-indigo-100" : "text-indigo-300/50") : (available ? "text-slate-600" : "text-slate-400")
    )}>
      {available ? (
        <Check className={cn("w-3 h-3", isPro ? "text-emerald-300" : "text-emerald-500")} />
      ) : (
        <X className="w-3 h-3 text-slate-300" />
      )}
      {text}
    </li>
  );
}
