import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  DollarSign,
  Target,
  Bell,
  BellRing,
  Check,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { CURRENCIES } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { parseLocalTransaction } from '../lib/nlpParser';
import { requestOneSignalPermission } from '../lib/onesignal';

interface OnboardingModalProps {
  userId: string;
  email: string;
  onComplete: (name: string, birthdate: string) => void;
}

const SAMPLE_PROMPTS = [
  'Gasté 15000 en almuerzo',
  'Pagué 40000 de transporte',
  'Compré 25000 en supermercado',
];

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i <= current ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
          className={cn('h-2 rounded-full', i <= current ? 'bg-blue-600' : 'bg-slate-200')}
        />
      ))}
    </div>
  );
}

export function OnboardingModal({ userId, email, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Paso 1: Perfil y moneda
  const [name, setName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('COP');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [birthdate, setBirthdate] = useState('');

  // Paso 2: Finanzas base (ambos opcionales)
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');

  // Paso 3: Primer movimiento + Push
  const [firstExpenseText, setFirstExpenseText] = useState('');
  const [pushRequested, setPushRequested] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isActivatingPush, setIsActivatingPush] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  const selectedCurrencyObj = CURRENCIES.find((c) => c.code === selectedCurrency) || CURRENCIES[0];
  const parsedPreview = firstExpenseText.trim() ? parseLocalTransaction(firstExpenseText) : null;

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
    setError('');
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
    setError('');
  };

  const handleStep1 = () => {
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }
    goNext();
  };

  const handleActivatePush = async () => {
    setIsActivatingPush(true);
    try {
      const status = await requestOneSignalPermission(userId);
      const enabled = status.permission === 'granted' && status.optedIn;
      setPushRequested(true);
      setPushEnabled(enabled);
    } catch {
      setPushRequested(true);
      setPushEnabled(false);
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError('');
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
      const updateData: Record<string, any> = {
        name: name.trim() || '',
        onboardingDone: true,
        currency: selectedCurrency,
        timezone,
      };

      if (birthdate) {
        updateData.birthDate = birthdate;
        updateData.birthdate = birthdate;
      }
      if (pushRequested) {
        updateData.pushEnabled = pushEnabled;
      }

      const parsedIncome = monthlyIncome ? Number(monthlyIncome) : 0;
      const parsedBudget = monthlyBudget ? Number(monthlyBudget) : 0;
      if (Number.isFinite(parsedIncome) && parsedIncome > 0) updateData.monthlyIncome = parsedIncome;
      if (Number.isFinite(parsedBudget) && parsedBudget > 0) updateData.monthlyBudget = parsedBudget;

      await updateDoc(doc(db, 'users', userId), updateData);

      let firstTxAmount = 0;
      const parsedTx = firstExpenseText.trim() ? parseLocalTransaction(firstExpenseText) : null;
      if (parsedTx && parsedTx.amount > 0) {
        const txDate = parsedTx.timestamp ? new Date(parsedTx.timestamp) : new Date();
        await addDoc(collection(db, 'transactions'), {
          userId,
          type: parsedTx.type,
          amount: parsedTx.amount,
          category: parsedTx.category,
          description: parsedTx.description,
          inputMode: 'text',
          timestamp: Timestamp.fromDate(Number.isNaN(txDate.getTime()) ? new Date() : txDate),
        });
        if (parsedTx.type === 'expense') {
          firstTxAmount = parsedTx.amount;
        }
      }

      if (parsedBudget > 0) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const MONTHS = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
        ];
        await addDoc(collection(db, 'goals'), {
          name: `Presupuesto ${MONTHS[currentMonth - 1]} ${currentYear}`,
          targetAmount: parsedBudget,
          currentAmount: firstTxAmount,
          month: currentMonth,
          year: currentYear,
          userId,
        });
      }

      localStorage.setItem('currency', selectedCurrency);
      onComplete(name.trim(), birthdate);
    } catch {
      setError('Error guardando tu información. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipAll = async () => {
    try {
      await updateDoc(doc(db, 'users', userId), { onboardingDone: true });
      onComplete('', '');
    } catch {
      // ignore
    }
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -50 : 50, opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#0a0f1e]/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Configuración rápida</span>
          </div>
          <ProgressDots current={step} total={3} />
          <button
            type="button"
            onClick={handleSkipAll}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            Omitir
          </button>
        </div>

        <div className="p-8 min-h-[380px] flex flex-col justify-between overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Paso 1 de 3</span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">¡Bienvenido a SmartMone¥!</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Personalicemos tu cuenta en segundos.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      ¿Cómo te llamas?
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleStep1()}
                        placeholder="Ej: Royer"
                        autoFocus
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Moneda principal
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCurrencyOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium hover:border-blue-400 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{selectedCurrencyObj.flag}</span>
                          <div className="text-left">
                            <span className="font-bold text-slate-900">{selectedCurrencyObj.code}</span>
                            <span className="text-slate-400 ml-2 text-xs">{selectedCurrencyObj.name}</span>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn('w-4 h-4 text-slate-400 transition-transform', currencyOpen && 'rotate-90')}
                        />
                      </button>

                      {currencyOpen && (
                        <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-44 overflow-y-auto z-10">
                          {CURRENCIES.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSelectedCurrency(c.code);
                                setCurrencyOpen(false);
                              }}
                              className={cn(
                                'w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors',
                                selectedCurrency === c.code && 'bg-blue-50 text-blue-600 font-bold'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span>{c.flag}</span>
                                <span>{c.code}</span>
                                <span className="text-slate-400 text-xs">{c.name}</span>
                              </div>
                              {selectedCurrency === c.code && <Check className="w-4 h-4 text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Fecha de nacimiento <span className="text-slate-400 font-normal normal-case">(opcional · para el Simulador de Libertad)</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={birthdate}
                        min={minDate}
                        max={maxDate}
                        onChange={(e) => setBirthdate(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                <button
                  type="button"
                  onClick={handleStep1}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Paso 2 de 3</span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">Tu presupuesto base</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Ambos campos son opcionales. Si defines un tope mensual, creamos tu primer presupuesto automático.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Ingreso mensual aproximado <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        placeholder={`Ej: 3000000 ${selectedCurrencyObj.code}`}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                      Tope de gastos mensual <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Target className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        value={monthlyBudget}
                        onChange={(e) => setMonthlyBudget(e.target.value)}
                        placeholder={`Ej: 2000000 ${selectedCurrencyObj.code}`}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-4 py-4 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 font-medium text-sm flex items-center gap-1 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {monthlyIncome || monthlyBudget ? 'Continuar' : 'Omitir y continuar'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Paso 3 de 3</span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">Pruébalo en 10 segundos</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Registra tu primer movimiento escribiendo como hablas (opcional) y activa tu recordatorio nocturno.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <MessageSquare className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={firstExpenseText}
                      onChange={(e) => setFirstExpenseText(e.target.value)}
                      placeholder='Ej: "Gasté 15000 en almuerzo"'
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setFirstExpenseText(sample)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>

                  {parsedPreview && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 flex items-center justify-between gap-2">
                      <span>
                        Detectado: <strong>{parsedPreview.description}</strong> · {parsedPreview.category}
                      </span>
                      <span className="font-bold">{formatCurrency(parsedPreview.amount)}</span>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                        {pushEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Recordatorio diario (8:00 PM)</p>
                        <p className="text-[11px] text-slate-500">
                          {pushEnabled
                            ? 'Activado: te avisaremos si falta algún gasto del día.'
                            : 'Para que no olvides anotar tus gastos del día.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isActivatingPush || pushEnabled}
                      onClick={handleActivatePush}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all',
                        pushEnabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      )}
                    >
                      {isActivatingPush ? '...' : pushEnabled ? 'Activo' : 'Activar'}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-4 py-4 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 font-medium text-sm flex items-center gap-1 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleFinish}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {isLoading ? 'Guardando...' : 'Ir a mi Dashboard'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
