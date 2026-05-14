import React, { useState } from 'react';
import { 
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, 
  Cell, CartesianGrid, LabelList
} from 'recharts';
import { Transaction, UserProfile, Goal } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Eye,
  EyeOff,
  TrendingDown, 
  Target, 
  MoreVertical,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Trash2,
  FileText,
  Download,
  Lock,
  RefreshCw
} from 'lucide-react';
import { generateReportPDF } from '../lib/pdfGenerator';
import { exportTransactionsToCSV } from '../lib/exportUtils';
import { AIAdvisor } from './AIAdvisor';
import { FreedomSimulator } from './FreedomSimulator';
import { SubscriptionManager } from './SubscriptionManager';
import { Table } from 'lucide-react';

import { WelcomeCard } from './WelcomeCard';

export function Dashboard({ user, transactions, goals, addGoal, removeGoal, toggleRecurring, recalculateGoal, onUpgrade }: { user: UserProfile, transactions: Transaction[], goals: Goal[], addGoal?: any, removeGoal?: any, toggleRecurring?: any, recalculateGoal?: any, onUpgrade?: () => void }) {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'liberty'>('overview');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);
  const [showIncomeDetails, setShowIncomeDetails] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState<'total' | 'today' | 'week'>('total');
  const [incomeFilter, setIncomeFilter] = useState<'total' | 'today' | 'week'>('total');

  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [reportPeriod, setReportPeriod] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    quarter: Math.floor(new Date().getMonth() / 3)
  });

  const [newGoal, setNewGoal] = useState({ 
    target: '', 
    month: new Date().getMonth() + 1, 
    year: new Date().getFullYear() 
  });
  
  const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.isPro && goals.length >= 1) {
      onUpgrade?.();
      return;
    }
    try {
      await addGoal({
        name: `Presupuesto ${MONTHS[newGoal.month - 1]} ${newGoal.year}`,
        targetAmount: parseFloat(newGoal.target),
        month: newGoal.month,
        year: newGoal.year
      });
      setShowGoalForm(false);
      setNewGoal({ 
        target: '', 
        month: new Date().getMonth() + 1, 
        year: new Date().getFullYear() 
      });
    } catch (e: any) {
      alert(e.message || "Error al crear presupuesto");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await removeGoal?.(id);
      setGoalToDelete(null);
    } catch (err) {
      console.error("Error deleting goal:", err);
    }
  };

  const getFilteredTransactions = (type: 'income' | 'expense', filter: 'total' | 'today' | 'week') => {
    return transactions.filter(t => {
      if (t.type !== type) return false;
      if (filter === 'total') return true;
      
      const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
      const now = new Date();
      
      if (filter === 'today') {
        return tDate.toDateString() === now.toDateString();
      }
      if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return tDate >= weekAgo;
      }
      return true;
    });
  };

  const getFilteredExpenses = (filter: 'total' | 'today' | 'week') => getFilteredTransactions('expense', filter);
  const getFilteredIncomes = (filter: 'total' | 'today' | 'week') => getFilteredTransactions('income', filter);

  const currentExpenses = getFilteredExpenses('total').reduce((acc, t) => acc + t.amount, 0);
  const todayExpenses = getFilteredExpenses('today').reduce((acc, t) => acc + t.amount, 0);
  const weekExpenses = getFilteredExpenses('week').reduce((acc, t) => acc + t.amount, 0);

  const getPeriodTotal = (type: 'income' | 'expense', month: number, year: number) => {
    return transactions
      .filter(t => {
        const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return t.type === type && tDate.getMonth() === month && tDate.getFullYear() === year;
      })
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthExpenses = getPeriodTotal('expense', currentMonth, currentYear);
  const lastMonthExpenses = getPeriodTotal('expense', lastMonth, lastMonthYear);
  
  const thisMonthIncome = getPeriodTotal('income', currentMonth, currentYear);
  const lastMonthIncome = getPeriodTotal('income', lastMonth, lastMonthYear);

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return "0%"; 
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
  };

  const expenseTrend = calculateTrend(thisMonthExpenses, lastMonthExpenses);
  const incomeTrend = calculateTrend(thisMonthIncome, lastMonthIncome);

  const handleDownloadReport = (action: 'save' | 'print' = 'save') => {
    let filtered: Transaction[] = [];
    let periodLabel = '';

    let periodGoals: Goal[] = [];

    if (reportType === 'monthly') {
      filtered = transactions.filter(t => {
        const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return d.getMonth() === reportPeriod.month && d.getFullYear() === reportPeriod.year;
      });
      periodGoals = goals.filter(g => g.month === reportPeriod.month + 1 && g.year === reportPeriod.year);
      periodLabel = `Mensual (${MONTHS[reportPeriod.month]} ${reportPeriod.year})`;
    } else if (reportType === 'quarterly') {
      filtered = transactions.filter(t => {
        const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return Math.floor(d.getMonth() / 3) === reportPeriod.quarter && d.getFullYear() === reportPeriod.year;
      });
      // For quarterly, we can sum goals of that quarter or just pass them
      periodGoals = goals.filter(g => Math.floor((g.month - 1) / 3) === reportPeriod.quarter && g.year === reportPeriod.year);
      periodLabel = `Trimestral (Q${reportPeriod.quarter + 1} ${reportPeriod.year})`;
    } else if (reportType === 'annual') {
      filtered = transactions.filter(t => {
        const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return d.getFullYear() === reportPeriod.year;
      });
      periodGoals = goals.filter(g => g.year === reportPeriod.year);
      periodLabel = `Anual (${reportPeriod.year})`;
    }

    generateReportPDF(filtered, periodLabel, user.email, action, periodGoals);
  };

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  // Group by category for current month
  const categoryTotals = React.useMemo(() => {
    const currentMonthExpensesList = transactions.filter(t => {
      const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
      return t.type === 'expense' && tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    return currentMonthExpensesList.reduce((acc: any, t) => {
      const cat = t.category || 'Otros';
      acc[cat] = (acc[cat] || 0) + t.amount;
      return acc;
    }, {});
  }, [transactions, currentMonth, currentYear]);

  const chartData = React.useMemo(() => {
    return Object.keys(categoryTotals).map(cat => ({
      name: cat,
      amount: categoryTotals[cat]
    })).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [categoryTotals]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // History data for Pro
  const historyData = React.useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      data.push({
        name: MONTHS[m].substring(0, 3),
        income: getPeriodTotal('income', m, y),
        expense: getPeriodTotal('expense', m, y)
      });
    }
    return data;
  }, [transactions, MONTHS]);

  const formatHidable = (value: number) => {
    if (privacyMode) return '••••••';
    return formatCurrency(value);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-32 transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Hola, {user.email.split('@')[0]}</h2>
          <p className="text-slate-500">Aquí tienes el resumen de tus finanzas.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl transition-colors">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'overview' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Resumen
            </button>
            <button 
              onClick={() => setActiveTab('liberty')}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                activeTab === 'liberty' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
               <TrendingUp className="w-4 h-4" />
               Libertad
            </button>
          </div>
          <button 
            onClick={() => {
              if (!user.isPro) {
                alert("El Modo Privacidad es una función Pro. Ideal para ocultar tus cifras en lugares públicos.");
                return;
              }
              setPrivacyMode(!privacyMode);
            }}
            className={cn(
              "p-2.5 rounded-xl transition-all border",
              privacyMode 
                ? "bg-indigo-100 text-indigo-600 border-indigo-200" 
                : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
            )}
            title="Modo Privacidad"
          >
            {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'liberty' ? (
          <motion.div 
            key="liberty"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <FreedomSimulator 
              user={user} 
              balance={balance} 
              actualMonthlySavings={thisMonthIncome - thisMonthExpenses} 
              onUpgrade={onUpgrade}
            />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <WelcomeCard 
              user={user} 
              goals={goals} 
              onConfigureBudget={() => {
                setShowGoalForm(true);
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
              }} 
            />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => {
          if (!user.isPro) {
            alert("Los detalles de gastos son una función Pro.");
            return;
          }
          setShowExpenseDetails(true);
        }} className="cursor-pointer">
          <StatCard 
            label="Total Gastos" 
            amount={totalExpenses} 
            icon={ArrowDownRight} 
            color="text-red-500" 
            bg="bg-red-50"
            trend={expenseTrend}
            privacyMode={privacyMode}
            interactive
          />
        </div>
        <div onClick={() => {
          if (!user.isPro) {
            alert("Los detalles de ingresos son una función Pro.");
            return;
          }
          setShowIncomeDetails(true);
        }} className="cursor-pointer">
          <StatCard 
            label="Total Ingresos" 
            amount={totalIncome} 
            icon={ArrowUpRight} 
            color="text-green-500" 
            bg="bg-green-50"
            trend={incomeTrend}
            privacyMode={privacyMode}
            interactive
          />
        </div>
        <StatCard 
          label="Balance Neto" 
          amount={balance} 
          icon={TrendingUp} 
          color="text-blue-500" 
          bg="bg-blue-50"
          trend={balance >= 0 ? 'Positivo' : 'Déficit'}
          privacyMode={privacyMode}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2">
           <AIAdvisor 
             user={user} 
             transactions={transactions} 
             goals={goals} 
             onUpgrade={onUpgrade} 
           />
         </div>
         <div>
           <SubscriptionManager 
             user={user} 
             transactions={transactions} 
             toggleRecurring={toggleRecurring} 
             onUpgrade={onUpgrade}
           />
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-8 rounded-[2.5rem] overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg">Distribución de Gastos ({MONTHS[currentMonth]})</h3>
            <button type="button" className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                  width={90}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', color: '#0f172a' }}
                  itemStyle={{ color: '#0f172a' }}
                  formatter={(value: number) => formatHidable(value)}
                />
                <Bar 
                  dataKey="amount" 
                  radius={[0, 4, 4, 0]} 
                  barSize={24}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList 
                    dataKey="amount" 
                    position="right" 
                    formatter={(value: number) => formatHidable(value)}
                    style={{ fill: '#475569', fontSize: 10, fontWeight: '600' }}
                    offset={10}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem]">
          <h3 className="font-bold text-lg mb-6">Presupuestos de Gasto</h3>
          <div className="space-y-6">
            {goals.length > 0 ? goals.map(goal => (
              <div key={goal.id} className="space-y-2 group relative">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100)}%</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => recalculateGoal?.(goal.id!)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        title="Recalcular presupuesto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <AnimatePresence mode="wait">
                        {goalToDelete === goal.id ? (
                          <motion.div 
                            key="confirm"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-1 bg-red-50 rounded-lg p-1 border border-red-100"
                          >
                            <button 
                              type="button"
                              onClick={() => handleDeleteGoal(goal.id!)}
                              className="text-[10px] font-bold text-red-600 px-2 py-1 hover:bg-red-100 rounded-md transition-colors"
                            >
                              Eliminar
                            </button>
                            <button 
                              type="button"
                              onClick={() => setGoalToDelete(null)}
                              className="text-[10px] font-bold text-slate-400 px-2 py-1 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              No
                            </button>
                          </motion.div>
                        ) : (
                          <motion.button 
                            key="delete-btn"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setGoalToDelete(goal.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar presupuesto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((goal.currentAmount || 0) / goal.targetAmount) * 100, 100)}%` }}
                    className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        ((goal.currentAmount || 0) / goal.targetAmount) >= 1 ? "bg-red-500" : 
                        ((goal.currentAmount || 0) / goal.targetAmount) >= 0.8 ? "bg-orange-500" : "bg-blue-600"
                    )}
                  />
                </div>
                <p className="text-xs text-slate-400">Gastado: {formatHidable(goal.currentAmount || 0)} de {formatHidable(goal.targetAmount)}</p>
              </div>
            )) : (
              <div className="text-center py-10 text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p className="text-sm">No tienes presupuestos activos. <br/> Crea uno para controlar tus gastos.</p>
              </div>
            )}
            <button 
              type="button"
              onClick={() => setShowGoalForm(true)}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all font-medium text-sm"
            >
              + Nuevo Presupuesto
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass p-8 rounded-[2.5rem] transition-colors">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-lg">Historial de Flujo (Pro)</h3>
            {!user.isPro && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase border border-amber-100">Solo Pro</span>
            )}
          </div>
          <div className="h-64 mt-4 relative">
            {!user.isPro && (
              <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
                <div className="text-center">
                   <Lock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                   <p className="font-bold text-slate-600">Visualización de Historial</p>
                   <p className="text-xs text-slate-400">Suscríbete a Pro para ver tu evolución mensual.</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  formatter={(val: number) => formatHidable(val)}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -10px rgb(0 0 0 / 0.1)', color: '#0f172a' }}
                />
                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-50 to-white border-slate-100 transition-colors relative overflow-hidden">
        {!user.isPro && (
          <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
            <div className="text-center p-6 bg-white/90 rounded-3xl shadow-xl border border-slate-100 max-w-xs">
              <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <p className="font-bold text-slate-800 text-sm">Reportes Exclusivos Pro</p>
              <p className="text-xs text-slate-500 mt-1">Suscríbete para descargar reportes en PDF y CSV.</p>
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-[2rem] transition-colors">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Reportes Financieros</h3>
              <p className="text-sm text-slate-500">Genera documentos PDF detallados de tus movimientos.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (!user.isPro) {
                alert("La descarga de reportes es una función Pro. ¡Suscríbete para acceder!");
                return;
              }
              setShowReportModal(true);
            }}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Descargar Reporte PDF
          </button>
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpenseDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-sm w-full p-8 rounded-[2.5rem]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Detalle de Gastos</h3>
                <button onClick={() => setShowExpenseDetails(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setExpenseFilter('today')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      expenseFilter === 'today' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Hoy
                  </button>
                  <button 
                    onClick={() => setExpenseFilter('week')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      expenseFilter === 'week' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Semana
                  </button>
                  <button 
                    onClick={() => setExpenseFilter('total')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      expenseFilter === 'total' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    Todo
                  </button>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl text-center border border-slate-100 transition-colors">
                  <p className="text-sm text-slate-500 mb-1">
                    {expenseFilter === 'today' ? 'Gastos de Hoy' : expenseFilter === 'week' ? 'Gastos de la Semana' : 'Gastos Totales'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatCurrency(getFilteredExpenses(expenseFilter).reduce((acc, t) => acc + t.amount, 0))}
                  </p>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {getFilteredExpenses(expenseFilter).slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.description}</p>
                        <p className="text-[10px] text-slate-500">{t.category}</p>
                      </div>
                      <span className="text-xs font-bold text-red-500">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                  {getFilteredExpenses(expenseFilter).length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">No hay gastos para este periodo.</p>
                  )}
                </div>

                <button 
                  onClick={() => setShowExpenseDetails(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIncomeDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-sm w-full p-8 rounded-[2.5rem]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Detalle de Ingresos</h3>
                <button onClick={() => setShowIncomeDetails(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-2">
                  {(['today', 'week', 'total'] as const).map((f) => (
                    <button 
                      key={f}
                      onClick={() => setIncomeFilter(f)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                        incomeFilter === f ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {f === 'today' ? 'Hoy' : f === 'week' ? 'Semana' : 'Todo'}
                    </button>
                  ))}
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl text-center border border-slate-100 transition-colors">
                  <p className="text-sm text-slate-500 mb-1">
                    {incomeFilter === 'today' ? 'Ingresos de Hoy' : incomeFilter === 'week' ? 'Ingresos de la Semana' : 'Ingresos Totales'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatCurrency(getFilteredIncomes(incomeFilter).reduce((acc, t) => acc + t.amount, 0))}
                  </p>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {getFilteredIncomes(incomeFilter).slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{t.description}</p>
                        <p className="text-[10px] text-slate-500">{t.category}</p>
                      </div>
                      <span className="text-xs font-bold text-green-500">{formatCurrency(t.amount)}</span>
                    </div>
                  ))}
                  {getFilteredIncomes(incomeFilter).length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">No hay ingresos para este periodo.</p>
                  )}
                </div>

                <button 
                  onClick={() => setShowIncomeDetails(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGoalForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-sm w-full p-8 rounded-[2.5rem]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Crear Presupuesto</h3>
                <button onClick={() => setShowGoalForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mes y Año</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={newGoal.month}
                      onChange={e => setNewGoal({ ...newGoal, month: parseInt(e.target.value) })}
                      className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={newGoal.year}
                      onChange={e => setNewGoal({ ...newGoal, year: parseInt(e.target.value) })}
                      className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Límite Total para el periodo</label>
                  <input 
                    type="number"
                    value={newGoal.target}
                    onChange={e => setNewGoal({ ...newGoal, target: e.target.value })}
                    placeholder="Ej: 2000000"
                    className="w-full p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-colors placeholder:text-slate-400"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
                >
                  Establecer Límite
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-md w-full p-8 rounded-[2.5rem]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Generar Reporte</h3>
                <button type="button" onClick={() => setShowReportModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl transition-colors">
                  {(['monthly', 'quarterly', 'annual'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setReportType(type)}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                        reportType === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {type === 'monthly' ? 'Mes' : type === 'quarterly' ? 'Trimestre' : 'Año'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {reportType === 'monthly' && (
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Seleccionar Mes</label>
                      <select 
                        value={reportPeriod.month}
                        onChange={(e) => setReportPeriod({ ...reportPeriod, month: parseInt(e.target.value) })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium transition-colors"
                      >
                        {MONTHS.map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {reportType === 'quarterly' && (
                    <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Seleccionar Trimestre</label>
                      <select 
                        value={reportPeriod.quarter}
                        onChange={(e) => setReportPeriod({ ...reportPeriod, quarter: parseInt(e.target.value) })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium transition-colors"
                      >
                        <option value={0}>Q1 (Ene-Mar)</option>
                        <option value={1}>Q2 (Abr-Jun)</option>
                        <option value={2}>Q3 (Jul-Sep)</option>
                        <option value={3}>Q4 (Oct-Dic)</option>
                      </select>
                    </div>
                  )}
                  <div className={cn("col-span-1", reportType === 'annual' && "col-span-2")}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Seleccionar Año</label>
                    <select 
                      value={reportPeriod.year}
                      onChange={(e) => setReportPeriod({ ...reportPeriod, year: parseInt(e.target.value) })}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none text-sm font-medium transition-colors"
                    >
                      {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => handleDownloadReport('print')}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Enviar e Imprimir
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDownloadReport('save')}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/30 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Guardar PDF
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all text-sm"
                  >
                    Volver a la App
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ label, amount, icon: Icon, color, bg, trend, interactive, privacyMode }: any) {
  const displayAmount = privacyMode ? '••••••' : (amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }));
  return (
    <div className={cn(
      "glass p-8 rounded-[2.5rem] card-hover transition-all flex flex-col justify-between h-full relative group",
      interactive && "hover:border-blue-200 active:scale-95"
    )}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-3 rounded-2xl transition-colors", bg, color)}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md transition-colors">
            {trend}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1 transition-colors">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 transition-colors">{displayAmount}</p>
        </div>
      </div>
      
      {interactive && (
        <div className="mt-4 flex items-center text-blue-600 text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
          <span>Detalles</span>
          <ChevronRight className="w-3 h-3 ml-1" />
        </div>
      )}
    </div>
  );
}
