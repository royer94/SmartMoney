import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Info, Calculator, Heart, User, Zap, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { UserProfile } from '../types';

export function FreedomSimulator({ user, balance, actualMonthlySavings = 0, onUpgrade }: { user: UserProfile, balance: number, actualMonthlySavings?: number, onUpgrade?: () => void }) {
  
  // --- PERSISTENCIA DE ESTADOS UTILIZANDO LOCALSTORAGE (Asociados al ID del Usuario) ---
  
  const [currentSavings, setCurrentSavings] = useState(() => {
    const saved = localStorage.getItem(`fs_savings_${user.id}`);
    return saved ? Number(saved) : balance;
  });

  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState(() => {
    const saved = localStorage.getItem(`fs_savings_goal_${user.id}`);
    return saved ? Number(saved) : 2000000;
  });

  const [monthlyExpenses, setMonthlyExpenses] = useState(() => {
    const saved = localStorage.getItem(`fs_expenses_${user.id}`);
    return saved ? Number(saved) : 4000000;
  });

  const [returnRate, setReturnRate] = useState(() => {
    const saved = localStorage.getItem(`fs_return_rate_${user.id}`);
    return saved ? Number(saved) : 12;
  });

  const [inflationRate, setInflationRate] = useState(() => {
    const saved = localStorage.getItem(`fs_inflation_rate_${user.id}`);
    return saved ? Number(saved) : 4.5;
  });

  const [currentAge, setCurrentAge] = useState(() => {
    const saved = localStorage.getItem(`fs_current_age_${user.id}`);
    if (saved) return Number(saved);
    
    if (user.birthdate) {
      const birth = new Date(user.birthdate + 'T00:00:00');
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }
    return 30;
  });

  const [useActualBalance, setUseActualBalance] = useState(() => {
    const saved = localStorage.getItem(`fs_use_actual_balance_${user.id}`);
    return saved ? saved === 'true' : true;
  });

  // --- EFECTOS PARA GUARDAR AUTOMÁTICAMENTE LOS CAMBIOS ---
  
  useEffect(() => {
    localStorage.setItem(`fs_savings_${user.id}`, currentSavings.toString());
  }, [currentSavings, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_savings_goal_${user.id}`, monthlySavingsGoal.toString());
  }, [monthlySavingsGoal, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_expenses_${user.id}`, monthlyExpenses.toString());
  }, [monthlyExpenses, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_return_rate_${user.id}`, returnRate.toString());
  }, [returnRate, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_inflation_rate_${user.id}`, inflationRate.toString());
  }, [inflationRate, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_current_age_${user.id}`, currentAge.toString());
  }, [currentAge, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_use_actual_balance_${user.id}`, useActualBalance.toString());
  }, [useActualBalance, user.id]);

  useEffect(() => {
    const saved = localStorage.getItem(`fs_savings_${user.id}`);
    if (!saved) {
      setCurrentSavings(balance);
    }
  }, [balance, user.id]);


  // --- CÁLCULOS LÓGICOS MATEMÁTICOS ---
  
  const nominalReturn = returnRate / 100;
  const expectedInflation = inflationRate / 100;
  
  // Ecuación de Fisher
  const annualRealReturn = ((1 + nominalReturn) / (1 + expectedInflation)) - 1;
  const targetNetWorth = monthlyExpenses * 12 * 25; 
  
  let months = 0;
  let simulatedBalance = currentSavings;
  const monthlyRate = annualRealReturn / 12;

  const effectiveMonthlySavings = useActualBalance ? actualMonthlySavings : monthlySavingsGoal;
  const savingsProgress = Math.min(100, Math.max(0, (actualMonthlySavings / monthlySavingsGoal) * 100));
  const isMeetingGoal = actualMonthlySavings >= monthlySavingsGoal;
  const diff = actualMonthlySavings - monthlySavingsGoal;

  const monthlyContribution = Math.max(0, effectiveMonthlySavings);

  while (simulatedBalance < targetNetWorth && months < 600 && monthlyContribution >= 0) { 
    simulatedBalance = simulatedBalance * (1 + monthlyRate) + monthlyContribution;
    months++;
    if (monthlyContribution === 0 && simulatedBalance < targetNetWorth && monthlyRate <= 0) break;
  }

  const yearsToGoal = Math.floor(months / 12);
  const retirementAge = currentAge + yearsToGoal;

  return (
    <div className="relative">
      {!user.isPro && (
        <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex items-center justify-center rounded-[3rem]">
          <div className="text-center p-8 bg-white/95 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-sm m-6 transition-all">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl w-fit mx-auto mb-4">
              <Flame className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 mb-2">Simulador Pro</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Proyecta tu futuro financiero considerando la erosión de la inflación mediante la fórmula de Fisher. Función exclusiva de SmartMone¥ Pro.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={onUpgrade}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                Activar Plan Pro
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={cn("space-y-8", !user.isPro && "opacity-40 pointer-events-none grayscale-[0.5]")}>
        <div className="glass p-8 rounded-[3rem] bg-white border-slate-100 shadow-xl shadow-slate-200/50 transition-colors">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 transition-colors">
                 <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Tu Camino a la Libertad</h3>
            </div>
            <p className="text-slate-500 leading-relaxed text-sm">
              La <span className="font-bold text-emerald-600">Libertad Financiera</span> ocurre cuando tus inversiones generan rendimientos suficientes para cubrir tus gastos mensuales de <span className="font-bold text-slate-900">{formatCurrency(monthlyExpenses)}</span> sin que tengas que trabajar.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Monitor de Ahorro Real vs Meta */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-colors">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                       <Zap className="w-4 h-4" />
                     </div>
                     <h4 className="font-bold text-sm text-slate-800">Estado de Ahorro Real</h4>
                   </div>
                   {isMeetingGoal && actualMonthlySavings > 0 && (
                     <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                       <Flame className="w-3 h-3" /> Racha Activa
                     </div>
                   )}
                 </div>

                 <div className="space-y-3">
                   <div className="flex justify-between text-[11px] font-bold">
                     <span className="text-slate-400 uppercase">Capacidad vs Meta Mensual</span>
                     <span className={cn(isMeetingGoal ? "text-emerald-600" : "text-amber-600")}>
                       {formatCurrency(actualMonthlySavings)} / {formatCurrency(monthlySavingsGoal)}
                     </span>
                   </div>
                   <div className="h-3 bg-slate-200 rounded-full overflow-hidden flex">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${savingsProgress}%` }}
                        className={cn(
                          "h-full transition-all",
                          isMeetingGoal ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500"
                        )}
                      />
                   </div>
                   <p className="text-[10px] text-slate-500 leading-tight">
                     {actualMonthlySavings < 0 
                       ? "⚠️ Tus gastos actuales superan tus ingresos. Para proyectar libertad, necesitas un balance positivo."
                       : isMeetingGoal 
                         ? `🎉 ¡Genial! Estás ahorrando ${formatCurrency(diff)} más de tu meta, acelerando tu retiro.`
                         : `Te faltan ${formatCurrency(Math.abs(diff))} este mes para alcanzar tu meta de ahorro mensual.`}
                   </p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Edad Actual */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Edad Actual
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={currentAge} 
                      onChange={(e) => setCurrentAge(Number(e.target.value))}
                      className="w-16 text-right font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-sm transition-colors"
                    />
                    <span className="text-sm font-bold text-slate-800">años</span>
                  </div>
                  <input 
                    type="range" min="18" max="80" step="1"
                    value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400">Usamos tu edad para proyectar el año de tu retiro.</p>
                </div>

                {/* Ahorros Actuales */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5" /> Capital Inicial (Ya Ahorrado)
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={currentSavings} 
                        onChange={(e) => setCurrentSavings(Number(e.target.value))}
                        className="w-28 text-right font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-sm transition-colors"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="1000000000" step="5000000"
                    value={currentSavings} onChange={(e) => setCurrentSavings(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Balance App: {formatCurrency(balance)}</span>
                    <button 
                      onClick={() => setCurrentSavings(balance)}
                      className="text-emerald-600 font-bold hover:underline"
                    >
                      Usar Balance Neto
                    </button>
                  </div>
                </div>

                {/* Ahorro Mensual */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" /> Meta de Ahorro
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={monthlySavingsGoal} 
                        onChange={(e) => setMonthlySavingsGoal(Number(e.target.value))}
                        className="w-28 text-right font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-sm transition-colors"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="20000000" step="100000"
                    value={monthlySavingsGoal} onChange={(e) => setMonthlySavingsGoal(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => setUseActualBalance(!useActualBalance)}
                      className={cn(
                        "text-[10px] px-3 py-1 rounded-full font-bold transition-all border",
                        useActualBalance 
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" 
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {useActualBalance ? "Usando Ritmo Actual" : "Usar Ritmo Actual"}
                    </button>
                    <p className="text-[10px] text-slate-400">
                      {useActualBalance ? "La proyección usa tu ahorro real actual." : "Define cuánto planeas ahorrar."}
                    </p>
                  </div>
                </div>

                {/* Gastos Proyectados */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Gasto de Vida
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={monthlyExpenses} 
                        onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                        className="w-28 text-right font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-sm transition-colors"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" min="1000000" max="50000000" step="500000"
                    value={monthlyExpenses} onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400">¿Con cuánto dinero mensual quieres vivir en tu libertad?</p>
                </div>

                {/* Rentabilidad Nominal */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" /> Rendimiento Bruto (Nominal)
                    </label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        step="0.1"
                        value={returnRate} 
                        onChange={(e) => setReturnRate(Number(e.target.value))}
                        className="w-14 text-right font-bold text-emerald-600 bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-sm transition-colors"
                      />
                      <span className="text-sm font-bold text-emerald-600">%</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="1" max="25" step="0.5"
                    value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400">Retorno antes de inflación (CDT, Acciones, etc.).</p>
                </div>

                {/* Inflación Estimada */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> Inflación Estimada
                    </label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        step="0.1"
                        value={inflationRate} 
                        onChange={(e) => setInflationRate(Number(e.target.value))}
                        className="w-14 text-right font-bold text-amber-600 bg-transparent border-b border-slate-200 focus:border-amber-500 outline-none text-sm transition-colors"
                      />
                      <span className="text-sm font-bold text-amber-600">%</span>
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="15" step="0.1"
                    value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400">Porcentaje de devaluación anual esperado de la moneda.</p>
                </div>

                {/* Indicador Dinámico del Efecto Fisher */}
                <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1">⚡ Tasa Real Neta Calculada (Fisher):</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm bg-white border px-2 py-0.5 rounded-lg shadow-sm">
                    {(annualRealReturn * 100).toFixed(2)}% E.A.
                  </span>
                </div>

              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden border border-slate-800 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
              
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Patrimonio Meta (Libertad)</p>
              <p className="text-3xl font-black text-white mb-8 tracking-tight">{formatCurrency(targetNetWorth)}</p>
              
              <div className="w-16 h-1 bg-slate-800 mb-8" />

              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Serás Libre a los</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-7xl font-black text-emerald-400 tracking-tighter">
                  {monthlyContribution <= 0 && simulatedBalance < targetNetWorth ? "∞" : retirementAge}
                </span>
                <span className="text-xl font-bold text-slate-500 uppercase">años</span>
              </div>
              
              {monthlyContribution <= 0 && simulatedBalance < targetNetWorth ? (
                <p className="text-sm text-amber-500 font-medium">
                  Incrementa tu ahorro para ver una fecha
                </p>
              ) : (
                <p className="text-sm text-slate-400 font-medium">
                  En {yearsToGoal} años (aprox.)
                </p>
              )}

              <div className="mt-10 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <p className="text-[10px] text-emerald-400 leading-relaxed font-bold uppercase tracking-tight">
                  {monthlyContribution > 0 ? '🚀 Plan de Inversión Activo' : '📉 Necesitas Capacidad de Ahorro'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bloque inferior de consejos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* NUEVO: Explicación Rigurosa de la Ecuación de Fisher */}
          <div className="glass p-6 rounded-3xl bg-emerald-50/60 border-emerald-100 flex flex-col justify-between transition-colors">
            <div className="flex gap-4 mb-4">
              <div className="p-3 bg-white rounded-2xl text-emerald-600 shadow-sm shrink-0 h-fit transition-colors">
                 <Info className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-sm">¿Cómo calculamos tu Tasa Real?</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Para proyectar tu retiro con total certeza, no basta con restar la inflación del rendimiento (<span className="font-semibold">{returnRate}% - {inflationRate}% ≠ {(returnRate - inflationRate).toFixed(1)}%</span>). La inflación también erosiona los intereses que vas ganando mes a mes.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Por eso aplicamos la <strong>Ecuación de Fisher</strong>, el estándar matemático en altas finanzas:
                </p>
              </div>
            </div>
            
            {/* Contenedor de la Fórmula Estilizada */}
            <div className="bg-white/80 border border-emerald-200/60 rounded-2xl p-3 text-center shadow-inner font-mono text-xs text-slate-700 space-y-1">
              <div className="font-bold text-emerald-700">
                Tasa Real = [ (1 + Nominal) / (1 + Inflación) ] - 1
              </div>
              <div className="text-[10px] text-slate-400">
                En tu caso: [ (1 + {(returnRate/100).toFixed(3)}) / (1 + {(inflationRate/100).toFixed(3)}) ] - 1 = <span className="font-bold text-emerald-600">{(annualRealReturn * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-3xl bg-indigo-50/50 border-indigo-100 flex gap-4 transition-colors">
            <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm shrink-0 transition-colors">
               <Target className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Ahorro vs Gasto</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Entre menos gastes hoy, más ahorras y menos capital necesitas para tu libertad. ¡Es una doble victoria!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
