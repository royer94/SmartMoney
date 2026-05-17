import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  HelpCircle, 
  Zap, 
  Target, 
  BrainCircuit, 
  MessageSquare, 
  FileText, 
  Smartphone,
  CheckCircle2,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Guía de SmartMone¥</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Aprende a usar todas las funciones</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">

          {/* Section: Core Functions */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Funciones Principales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HelpItem 
                icon={Target} 
                title="Presupuestos (Metas)"
                description="Configura un límite de gasto mensual por categoría. El sistema te avisará cuando llegues al 50% y 80%."
              />
              <HelpItem 
                icon={BrainCircuit} 
                title="AI Advisor"
                description="Nuestra IA analiza tus movimientos y te da consejos personalizados basados en tu comportamiento."
              />
              <HelpItem 
                icon={MessageSquare} 
                title="AI Control (Chat)"
                description="Escribe o habla naturalmente para registrar movimientos. Prueba con 'Gasté 50 mil en cena' o usa el micrófono."
              />
              <HelpItem 
                icon={FileText} 
                title="Reportes PDF/CSV"
                description="Exporta tus datos (Función Pro) para un análisis profundo o para compartir con tu contador."
              />
              <HelpItem 
                icon={BarChart3} 
                title="Libertad Financiera"
                description="Calcula cuánto necesitas ahorrar para vivir de tus rentas. Ajusta inflación y rentabilidad esperada."
              />
            </div>
          </section>

          {/* Section: Tips */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              Consejos de Eficiencia
            </h3>
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 space-y-4">
              <Tip icon={CheckCircle2} color="text-emerald-600" text="Registra tus gastos en el momento exacto. La IA aprende mejor de datos frescos." />
              <Tip icon={CheckCircle2} color="text-emerald-600" text="Usa el botón central azul en móviles para registrar por voz rápidamente." />
              <Tip icon={CheckCircle2} color="text-emerald-600" text="Crea tu presupuesto AL INICIO de cada mes para tener una guía clara." />
              <Tip icon={CheckCircle2} color="text-emerald-600" text="Activa el modo privacidad en el Dashboard si vas a usar la app en público." />
              <Tip icon={CheckCircle2} color="text-emerald-600" text="Usa el Simulador de Libertad para visualizar tu retiro. ¡Pequeños ahorros hoy hacen la diferencia!" />
            </div>
          </section>

          {/* Section: Pro vs Free */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-500" />
              Free vs Pro
            </h3>
            <div className="overflow-hidden border border-slate-100 rounded-3xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 font-bold text-slate-700">Función</th>
                    <th className="p-4 font-bold text-slate-500 text-center">Free</th>
                    <th className="p-4 font-bold text-indigo-600 text-center">Pro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <TableRow label="Registros mensuales" free="20" pro="Ilimitados" />
                  <TableRow label="Presupuestos" free="1" pro="Ilimitados" />
                  <TableRow label="IA Advisor" free="Básico" pro="Avanzado" />
                  <TableRow label="Exportar datos" free="No" pro="Sí" />
                  <TableRow label="Simulador Libertad" free="No" pro="Sí" />
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: PWA Install */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-slate-600" />
              Instala SmartMone¥ en tu móvil
            </h3>
            <div className="space-y-4">

              {/* iPhone */}
              <div className="p-5 bg-slate-900 rounded-3xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-lg">🍎</div>
                  <div>
                    <p className="font-bold text-sm">iPhone / iPad</p>
                    <p className="text-xs text-slate-400">Requiere Safari</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {[
                    'Abre la app en Safari (no en Chrome ni otro navegador)',
                    'Toca el ícono de compartir ↑ en la barra inferior de Safari',
                    'Desplázate hacia abajo en el menú y toca "Agregar a pantalla de inicio"',
                    'Toca "Agregar" en la esquina superior derecha para confirmar',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Android */}
              <div className="p-5 bg-slate-900 rounded-3xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-lg">🤖</div>
                  <div>
                    <p className="font-bold text-sm">Android</p>
                    <p className="text-xs text-slate-400">Requiere Chrome</p>
                  </div>
                </div>
                <ol className="space-y-3">
                  {[
                    'Abre la app en Chrome',
                    'Toca los 3 puntos ⋮ en la esquina superior derecha',
                    'Toca "Agregar a pantalla de inicio" o "Instalar app"',
                    'Confirma tocando "Instalar" en el mensaje que aparece',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                      <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
                Una vez instalada, SmartMone¥ funciona como una app nativa y recibirás notificaciones con recordatorios financieros.
              </p>
            </div>
          </section>

        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95"
          >
            ¡Entendido!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HelpItem({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-4 border border-slate-100 rounded-3xl hover:border-blue-100 hover:bg-blue-50/30 transition-all group">
      <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="font-bold text-sm text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function Tip({ icon: Icon, color, text }: { icon: any, color: string, text: string }) {
  return (
    <div className="flex gap-3">
      <Icon className={cn("w-5 h-5 shrink-0", color)} />
      <p className="text-xs font-medium text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
}

function TableRow({ label, free, pro }: { label: string, free: string, pro: string }) {
  return (
    <tr>
      <td className="p-4 font-medium text-slate-600">{label}</td>
      <td className="p-4 text-center text-slate-500">{free}</td>
      <td className="p-4 text-center font-bold text-indigo-600">{pro}</td>
    </tr>
  );
}
