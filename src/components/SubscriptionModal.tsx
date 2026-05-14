import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Zap, 
  Check, 
  Star, 
  ShieldCheck, 
  ArrowRight, 
  CreditCard,
  Crown,
  Sparkles,
  Target,
  BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SubscriptionModalProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export function SubscriptionModal({ onClose, onUpgrade }: SubscriptionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    onUpgrade();
    setIsProcessing(false);
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh]"
      >
        {/* Left Side: Marketing */}
        <div className="md:w-1/2 bg-indigo-600 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-300" />
              </div>
              <span className="font-black text-xl tracking-tighter italic">SmartMone¥ <span className="text-amber-300 not-italic">PRO</span></span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-6">
              Desbloquea tu potencial financiero
            </h2>

            <div className="space-y-4">
              <BenefitItem icon={Target} text="Presupuestos y metas ilimitadas" />
              <BenefitItem icon={BarChart3} text="Simulador de Libertad Financiera avanzado" />
              <BenefitItem icon={Star} text="IA Advisor con análisis profundo de patrones" />
              <BenefitItem icon={CreditCard} text="Detección automática de suscripciones olvidadas" />
              <BenefitItem icon={ShieldCheck} text="Exportación total a PDF y CSV" />
            </div>
          </div>

          <div className="relative z-10 mt-12 p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
            <p className="text-sm italic opacity-90">
              "Desde que pasé a Pro, he logrado ahorrar un 15% extra cada mes gracias a la detección de gastos hormiga."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 bg-indigo-400 rounded-full" />
              <span className="text-xs font-bold">Fernando G. - Usuario Pro</span>
            </div>
          </div>
        </div>

        {/* Right Side: Plans */}
        <div className="md:w-1/2 p-8 md:p-12 bg-slate-50 flex flex-col justify-center">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Elige tu plan</h3>
            <p className="text-slate-500 text-sm">Comienza tu camino a la libertad financiera hoy.</p>
          </div>

          <div className="space-y-4">
            <div className="p-6 bg-white border-2 border-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 relative">
              <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                Recomendado
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-900">Anual Smart</h4>
                  <p className="text-xs text-slate-400">Pago único anual</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-900">$49</span>
                  <span className="text-sm font-bold text-slate-400">/año</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <PlanFeature text="Equivale a $4/mes" highlighted />
                <PlanFeature text="Todo lo incluido en Pro" />
                <PlanFeature text="Soporte prioritario" />
              </ul>
              <button 
                onClick={handleUpgrade}
                disabled={isProcessing}
                className={cn(
                  "w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100",
                  isProcessing ? "opacity-70 cursor-not-allowed" : "hover:bg-indigo-700"
                )}
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Activar Plan Anual
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="p-6 bg-white border border-slate-200 rounded-3xl hover:border-indigo-200 transition-all cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Mensual Flex</h4>
                  <p className="text-xs text-slate-400">Cancela cuando quieras</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">$6</span>
                  <span className="text-sm font-bold text-slate-400">/mes</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-[10px] text-center text-slate-400 px-8">
            Al suscribirte aceptas nuestros términos y condiciones. El pago será procesado de forma segura mediante simulación en este entorno de pruebas.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BenefitItem({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-sm font-medium opacity-90">{text}</span>
    </div>
  );
}

function PlanFeature({ text, highlighted }: { text: string, highlighted?: boolean }) {
  return (
    <li className={cn(
      "flex items-center gap-2 text-xs",
      highlighted ? "text-indigo-600 font-bold" : "text-slate-600"
    )}>
      <Check className={cn("w-4 h-4", highlighted ? "text-indigo-600" : "text-emerald-500")} />
      {text}
    </li>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
