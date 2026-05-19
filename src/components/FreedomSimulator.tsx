import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame, Landmark, DollarSign, Calendar, HelpCircle } from 'lucide-react';

interface FreedomSimulatorProps {
  user: {
    id: string;
    age: number;
    currentBalance: number; // Viene del estado neto de Firestore
  };
  onClose: () => void;
}

export function FreedomSimulator({ user, onClose }: FreedomSimulatorProps) {
  // 1. ESTADOS Y PERSISTENCIA (localStorage indexado por userId)
  const [monthlyExpenses, setMonthlyExpenses] = useState(() => {
    const saved = localStorage.getItem(`fs_expenses_${user.id}`);
    return saved ? Number(saved) : 3000000; // Valor base por defecto (COP)
  });

  const [returnRate, setReturnRate] = useState(() => {
    const saved = localStorage.getItem(`fs_return_${user.id}`);
    return saved ? Number(saved) : 12.0; // 12% nominal bruto E.A.
  });

  const [inflationRate, setInflationRate] = useState(() => {
    const saved = localStorage.getItem(`fs_inflation_${user.id}`);
    return saved ? Number(saved) : 4.5; // 4.5% inflación objetivo base
  });

  // Efectos para guardar cambios automáticamente al interactuar
  useEffect(() => {
    localStorage.setItem(`fs_expenses_${user.id}`, monthlyExpenses.toString());
  }, [monthlyExpenses, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_return_${user.id}`, returnRate.toString());
  }, [returnRate, user.id]);

  useEffect(() => {
    localStorage.setItem(`fs_inflation_${user.id}`, inflationRate.toString());
  }, [inflationRate, user.id]);

  // 2. LÓGICA MATEMÁTICA (Ecuación de Fisher y Regla del 4%)
  const nominalReturn = returnRate / 100;
  const expectedInflation = inflationRate / 100;

  // r_real = ((1 + r_nominal) / (1 + inflation)) - 1
  const annualRealReturn = ((1 + nominalReturn) / (1 + expectedInflation)) - 1;
  const monthlyRealRate = annualRealReturn / 12;

  // Patrimonio Meta basado en la regla del 4% (Gasto anual * 25)
  // Al usar pesos de hoy, la meta se mantiene constante en poder adquisitivo real
  const targetNetWorth = monthlyExpenses * 12 * 25;

  // Cálculo del tiempo de retiro mediante interés compuesto real
  let monthsToRetire = 0;
  let simulatedBalance = user.currentBalance;
  const MAX_MONTHS = 1200; // Límite de 100 años para evitar bucles infinitos

  if (monthlyRealRate > 0 && simulatedBalance < targetNetWorth) {
    while (simulatedBalance < targetNetWorth && monthsToRetire < MAX_MONTHS) {
      // Supone que el usuario sigue ahorrando/invirtiendo el excedente o el interés se capitaliza
      simulatedBalance = simulatedBalance * (1 + monthlyRealRate);
      monthsToRetire++;
    }
  } else if (simulatedBalance >= targetNetWorth) {
    monthsToRetire = 0;
  } else {
    monthsToRetire = MAX_MONTHS; // Si la tasa real es negativa o cero y no cubre la meta
  }

  const yearsToRetire = Math.ceil(monthsToRetire / 12);
  const retirementAge = user.age + yearsToRetire;

  // Formateador de moneda local
  const formatValue = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 text-slate-100">
        
        {/* Encabezado */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4 mb-6">
          <div>
            <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full">
              Módulo Inteligente
            </span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2">Tu Camino a la Libertad Financiera</h2>
            <p className="text-sm text-slate-400 mt-1">
              Simulación real indexada con la Ecuación de Fisher para neutralizar la inflación.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
          >
            Cerrar ✕
          </button>
        </div>

        {/* Bloque 1: Resumen de Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Edad Actual</p>
              <p className="text-lg font-bold text-slate-200">{user.age} años</p>
            </div>
          </div>
          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Capital Inicial Neto</p>
              <p className="text-lg font-bold text-slate-200">{formatValue(user.currentBalance)}</p>
            </div>
          </div>
        </div>

        {/* Bloque 2: Dual Controles (Rentabilidad vs Inflación) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/50 border border-slate-800/60 p-6 rounded-xl mb-6">
          
          {/* Slider Rentabilidad */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 4 h-4 text-emerald-400" /> Rentabilidad Anual (Nominal)
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
                <input 
                  type="number" step="0.1"
                  value={returnRate} 
                  onChange={(e) => setReturnRate(Number(e.target.value))}
                  className="w-12 text-right font-bold text-emerald-400 bg-transparent outline-none text-sm"
                />
                <span className="text-xs font-bold text-emerald-400 ml-0.5">%</span>
              </div>
            </div>
            <input 
              type="range" min="1" max="25" step="0.5"
              value={returnRate} 
              onChange={(e) => setReturnRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Slider Inflación */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" /> Inflación Anual Estimada
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-0.5">
                <input 
                  type="number" step="0.1"
                  value={inflationRate} 
                  onChange={(e) => setInflationRate(Number(e.target.value))}
                  className="w-12 text-right font-bold text-amber-400 bg-transparent outline-none text-sm"
                />
                <span className="text-xs font-bold text-amber-400 ml-0.5">%</span>
              </div>
            </div>
            <input 
              type="range" min="1" max="15" step="0.1"
              value={inflationRate} 
              onChange={(e) => setInflationRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Badge Informativo de Tasa Real (Efecto Fisher) */}
          <div className="md:col-span-2 flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg text-sm">
            <span className="text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" /> Tasa de Rendimiento Real Neta:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-base">
              {(annualRealReturn * 100).toFixed(2)}% <span className="text-xs text-slate-500 font-sans font-normal">(Ajustado)</span>
            </span>
          </div>
        </div>

        {/* Bloque 3: Formulario de Metas de Libertad */}
        <div className="bg-slate-800/20 border border-slate-800 p-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Gasto Mensual Deseado (Pesos de hoy)
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <DollarSign className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
                className="block w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Patrimonio Meta Requerido
            </label>
            <div className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 px-4 text-base font-bold text-slate-300 font-mono">
              {formatValue(targetNetWorth)}
            </div>
          </div>
        </div>

        {/* Bloque 4: Output de Resultados */}
        <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/20 p-6 rounded-xl text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-lg font-bold text-emerald-400">Tu veredicto de Libertad Financiera</h4>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              A este ritmo de rendimiento real, habrás blindado tu capital contra la inflación por completo al alcanzar la edad objetivo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 bg-slate-900/90 border border-slate-800 px-6 py-4 rounded-xl min-w-[280px]">
            <div className="text-center border-r border-slate-800 pr-2">
              <span className="text-xs text-slate-400 uppercase block font-medium">Años Espera</span>
              <span className="text-2xl md:text-3xl font-black text-slate-100 font-mono">
                {monthsToRetire >= MAX_MONTHS ? '∞' : yearsToRetire}
              </span>
            </div>
            <div className="text-center pl-2">
              <span className="text-xs text-slate-400 uppercase block font-medium">Edad Retiro</span>
              <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono">
                {monthsToRetire >= MAX_MONTHS ? 'N/A' : `${retirementAge}añ`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
