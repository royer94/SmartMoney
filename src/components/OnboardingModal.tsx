import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Calendar, ArrowRight, ArrowLeft, Sparkles,
  DollarSign, Target, MessageSquare, LayoutDashboard,
  List, RefreshCcw, Rocket, Crown, ChevronRight, Check
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { CURRENCIES } from '../types';
import { cn } from '../lib/utils';

interface OnboardingModalProps {
  userId: string;
  email: string;
  onComplete: (name: string, birthdate: string) => void;
}

const TOUR_FEATURES = [
  {
    icon: MessageSquare,
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Asistente IA',
    description: 'Registra gastos e ingresos con voz o texto en lenguaje natural. Di "gasté 15.000 en almuerzo" y listo.',
    tag: 'Núcleo de la app'
  },
  {
    icon: LayoutDashboard,
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Dashboard',
    description: 'Visualiza tu balance, ingresos y gastos del mes en tiempo real. Gráficas claras para tomar mejores decisiones.',
    tag: 'Visión general'
  },
  {
    icon: List,
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Movimientos',
    description: 'Historial completo con filtros por fecha, categoría y tipo. Exporta en CSV o PDF cuando quieras.',
    tag: 'Control total'
  },
  {
    icon: RefreshCcw,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Gastos Recurrentes',
    description: 'Detecta automáticamente tus pagos fijos mensuales: suscripciones, servicios y recibos. Nunca pierdas un gasto.',
    tag: 'Detección inteligente'
  },
  {
    icon: Rocket,
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    title: 'Simulador de Libertad',
    description: 'Proyecta cuándo alcanzarás tu independencia financiera basado en tus ingresos, gastos y tasa de ahorro.',
    tag: 'Tu futuro financiero'
  },
  {
    icon: Crown,
    color: 'from-amber-400 to-yellow-500',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Plan Pro',
    description: 'Registros ilimitados, comandos avanzados, metas financieras y acceso completo al simulador. Todo sin límites.',
    tag: 'Sin restricciones'
  },
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i <= current ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
          className={cn("h-2 rounded-full", i <= current ? "bg-blue-600" : "bg-slate-200")}
        />
      ))}
    </div>
  );
}

export function OnboardingModal({ userId, email, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');

  // Step 2
  const [selectedCurrency, setSelectedCurrency] = useState('COP');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // Step 3
  const [monthlyBudget, setMonthlyBudget] = useState('');

  // Step 4
  const [tourIndex, setTourIndex] = useState(0);
  const [tourDirection, setTourDirection] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().split('T')[0];

  const selectedCurrencyObj = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  const goNext = () => { setDirection(1); setStep(s => s + 1); setError(''); };
  const goBack = () => { setDirection(-1); setStep(s => s - 1); setError(''); };

  const handleStep1 = () => {
    if (!name.trim()) { setError('Por favor ingresa tu nombre.'); return; }
    if (!birthdate) { setError('Por favor ingresa tu fecha de nacimiento.'); return; }
    goNext();
  };

  const handleStep2 = (skip = false) => {
    if (!skip && !monthlyIncome) { setError('Ingresa tu ingreso mensual aproximado.'); return; }
    goNext();
  };

  const handleStep3 = (skip = false) => {
    if (!skip && !monthlyBudget) { setError('Ingresa tu presupuesto mensual.'); return; }
    goNext();
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const currency = selectedCurrencyObj;
      const updateData: any = {
        name: name.trim() || '',
        birthdate: birthdate || '',
        onboardingDone: true,
        currency: selectedCurrency,
      };
      const parsedIncome = monthlyIncome ? parseFloat(monthlyIncome.replace(/\./g, '').replace(',', '.')) : 0;
      const parsedBudget = monthlyBudget ? parseFloat(monthlyBudget.replace(/\./g, '').replace(',', '.')) : 0;
      if (parsedIncome > 0) updateData.monthlyIncome = parsedIncome;
      if (parsedBudget > 0) updateData.monthlyBudget = parsedBudget;

      await updateDoc(doc(db, 'users', userId), updateData);

      if (parsedBudget > 0) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const MONTHS = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        await addDoc(collection(db, 'goals'), {
          name: `Presupuesto ${MONTHS[currentMonth - 1]} ${currentYear}`,
          targetAmount: parsedBudget,
          currentAmount: 0,
          month: currentMonth,
          year: currentYear,
          userId
        });
      }

      onComplete(name.trim(), birthdate);
    } catch (e) {
      setError('Error guardando tu información. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipAll = async () => {
    try {
      await updateDoc(doc(db, 'users', userId), { onboardingDone: true });
      onComplete('', '');
    } catch (e) {}
  };

  const nextTour = () => {
    if (tourIndex < TOUR_FEATURES.length - 1) {
      setTourDirection(1);
      setTourIndex(i => i + 1);
    }
  };

  const prevTour = () => {
    if (tourIndex > 0) {
      setTourDirection(-1);
      setTourIndex(i => i - 1);
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a0f1e]/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-6 pb-4 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-xs font-bold opacity-70 uppercase tracking-widest">SmartMone¥ AI</span>
            </div>
            {step < 3 && (
              <button onClick={handleSkipAll} className="text-xs text-white/50 hover:text-white/80 transition-colors">
                Omitir todo
              </button>
            )}
          </div>
          <ProgressDots current={step} total={4} />
        </div>

        {/* Content */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* STEP 0 — Bienvenida */}
            {step === 0 && (
              <motion.div key="step0" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="p-6 space-y-5">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1">¡Bienvenido!</h2>
                  <p className="text-slate-500 text-sm">Cuéntanos sobre ti para personalizar tu experiencia.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> ¿Cómo te llamas?
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Tu nombre o apodo"
                      maxLength={30}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Fecha de nacimiento
                    </label>
                    <input
                      type="date"
                      value={birthdate}
                      onChange={e => setBirthdate(e.target.value)}
                      max={maxDate}
                      min={minDate}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 text-sm"
                    />
                    <p className="text-[10px] text-slate-400 px-1">🔒 Solo para el simulador financiero y tu cumpleaños.</p>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

                <button onClick={handleStep1} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* STEP 1 — Perfil financiero */}
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">Tu perfil financiero</h2>
                  <p className="text-slate-500 text-sm">Configuremos tu moneda e ingreso para análisis personalizados.</p>
                </div>

                <div className="space-y-4">
                  {/* Currency selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Moneda</label>
                    <div className="relative">
                      <button
                        onClick={() => setCurrencyOpen(!currencyOpen)}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{selectedCurrencyObj.flag}</span>
                          <span className="font-semibold text-slate-900 text-sm">{selectedCurrencyObj.code} — {selectedCurrencyObj.name}</span>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", currencyOpen && "rotate-90")} />
                      </button>
                      {currencyOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-48 overflow-y-auto">
                          {CURRENCIES.map(c => (
                            <button key={c.code} onClick={() => { setSelectedCurrency(c.code); setCurrencyOpen(false); }}
                              className={cn("w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left", c.code === selectedCurrency && "bg-blue-50")}>
                              <span className="text-lg">{c.flag}</span>
                              <span className="text-sm font-medium text-slate-800">{c.code} — {c.name}</span>
                              {c.code === selectedCurrency && <Check className="w-3.5 h-3.5 text-blue-600 ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly income */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Ingreso mensual aproximado
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{selectedCurrencyObj.symbol}</span>
                      <input
                        type="number"
                        value={monthlyIncome}
                        onChange={e => setMonthlyIncome(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 text-sm"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">🔒 No compartimos esta información con nadie.</p>
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={goBack} className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleStep2(false)} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => handleStep2(true)} className="w-full py-2 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors">
                  Omitir este paso
                </button>
              </motion.div>
            )}

            {/* STEP 2 — Presupuesto */}
            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">Tu primera meta</h2>
                  <p className="text-slate-500 text-sm">¿Cuánto quieres gastar como máximo este mes?</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    💡 Establecer un presupuesto mensual te ayuda a detectar cuando estás por superar tu límite y tomar mejores decisiones.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Presupuesto mensual
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{selectedCurrencyObj.symbol}</span>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={e => setMonthlyBudget(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full pl-8 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 px-1">Puedes ajustarlo en cualquier momento desde el dashboard.</p>
                </div>

                {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

                <div className="flex gap-3">
                  <button onClick={goBack} className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleStep3(false)} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95">
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => handleStep3(true)} className="w-full py-2 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors">
                  Omitir este paso
                </button>
              </motion.div>
            )}

            {/* STEP 3 — Tour */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-black text-slate-900 mb-1">Conoce la app</h2>
                  <p className="text-slate-500 text-sm">Todo lo que puedes hacer con SmartMone¥ AI.</p>
                </div>

                {/* Tour card */}
                <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
                  <AnimatePresence mode="wait" custom={tourDirection}>
                    <motion.div
                      key={tourIndex}
                      custom={tourDirection}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className={cn("p-5 rounded-2xl border", TOUR_FEATURES[tourIndex].bg, "border-slate-100")}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-sm", TOUR_FEATURES[tourIndex].color)}>
                          {React.createElement(TOUR_FEATURES[tourIndex].icon, { className: "w-6 h-6 text-white" })}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-black text-slate-900">{TOUR_FEATURES[tourIndex].title}</h3>
                            <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full", TOUR_FEATURES[tourIndex].bg, TOUR_FEATURES[tourIndex].iconColor, "border border-current/20")}>
                              {TOUR_FEATURES[tourIndex].tag}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{TOUR_FEATURES[tourIndex].description}</p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Tour navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={prevTour} disabled={tourIndex === 0}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all">
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="flex gap-1.5">
                    {TOUR_FEATURES.map((_, i) => (
                      <button key={i} onClick={() => { setTourDirection(i > tourIndex ? 1 : -1); setTourIndex(i); }}
                        className={cn("w-2 h-2 rounded-full transition-all", i === tourIndex ? "bg-blue-600 w-5" : "bg-slate-200")} />
                    ))}
                  </div>
                  <button onClick={nextTour} disabled={tourIndex === TOUR_FEATURES.length - 1}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all">
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>

                {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

                <button
                  onClick={handleFinish}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Sparkles className="w-5 h-5" /> ¡Empezar ahora!</>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
