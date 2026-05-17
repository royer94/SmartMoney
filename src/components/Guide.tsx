import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { MessageSquare, Mic, ShieldCheck, X } from 'lucide-react';

const STEPS = [
  {
    title: "Bienvenido a $martMone¥",
    description: "La forma más inteligente de gestionar tu dinero con Inteligencia Artificial.",
    icon: (props: any) => <Logo size="lg" {...props} />,
    color: "bg-blue-500"
  },
  {
    title: "Habla con la IA",
    description: "Registra gastos escribiendo o hablando. Prueba con 'Gasté 20 mil en pizza' o usa el micrófono.",
    icon: MessageSquare,
    color: "bg-purple-500"
  },
  {
    title: "Controla tu dinero",
    description: "Consulta tus gastos de hoy, esta semana o el mes completo desde el chat con la IA.",
    icon: Mic,
    color: "bg-orange-500"
  },
  {
  title: "Pásate a Pro",
  description: "Desbloquea registros ilimitados, metas financieras y reportes detallados con el plan Pro.",
  icon: ShieldCheck,
  color: "bg-green-500"
}
];

export function Guide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl relative transition-colors"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
        <div className="p-10 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col items-center"
            >
              {(() => {
                const Icon = STEPS[step].icon;
                return (
                  <div className={cn("p-6 rounded-[2rem] text-white mb-8", STEPS[step].color)}>
                    <Icon className="w-12 h-12" />
                  </div>
                );
              })()}
              <h3 className="text-2xl font-bold text-slate-900 mb-4 transition-colors">{STEPS[step].title}</h3>
              <p className="text-slate-500 leading-relaxed mb-10 transition-colors">{STEPS[step].description}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-2 justify-center mb-10">
            {STEPS.map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-8 bg-blue-600" : "w-2 bg-slate-200"
                )}
              />
            ))}
          </div>
          <button 
            onClick={() => step < STEPS.length - 1 ? setStep(step + 1) : onClose()}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
          >
            {step === STEPS.length - 1 ? "Empezar ahora" : "Siguiente"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
