import React, { useState, useEffect } from 'react';
import { RefreshCcw, Bell, Zap, Info, Check, X } from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useFinance } from '../hooks/useFinance';

export function SubscriptionManager({ user, transactions, toggleRecurring, onUpgrade }: { 
  user: UserProfile, 
  transactions: Transaction[], 
  toggleRecurring: any, 
  onUpgrade?: () => void
}) {
  // ✅ Obtener la función directamente del hook
  const { addTransaction } = useFinance();

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [pendingRecurring, setPendingRecurring] = useState<Transaction[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  if (!user || !user.uid) return null;

  const activeTransactions = transactions.filter(t => !(t as any).deleted);
  const recurringItems = activeTransactions.filter(t => t.isRecurring);
  const hasProAccess = user.isPro || user.isTrialActive || user.isActive;

  const monthlyTotal = recurringItems.reduce((acc, t) => acc + t.amount, 0);
  
  const totalSuscripcionesCategoria = activeTransactions
    .filter(t => t.type === 'expense' && t.category === 'Suscripciones')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const diferencia = totalSuscripcionesCategoria - monthlyTotal;

  const potentialSubscriptions = React.useMemo(() => {
    if (!hasProAccess) return [];
    const expenses = activeTransactions.filter(t => t.type === 'expense' && !t.isRecurring);
    const groups: { [key: string]: Transaction[] } = {};
    expenses.forEach(t => {
      const key = t.description.toLowerCase().trim().substring(0, 8);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.values(groups)
      .filter(items => {
        if (items.length < 2) return false;
        const months = new Set(items.map(i => {
           const d = i.timestamp?.toDate ? i.timestamp.toDate() : new Date(i.timestamp);
           return `${d.getMonth()}-${d.getFullYear()}`;
        }));
        return months.size >= 2;
      })
      .map(group => group[0]);
  }, [activeTransactions, hasProAccess]);

  useEffect(() => {
    if (!hasProAccess || !user?.uid) return;
    const lastCheckKey = `last_recurring_check_${user.uid}`;
    const lastCheck = localStorage.getItem(lastCheckKey);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let shouldShow = false;
    if (lastCheck) {
      const lastCheckDate = new Date(lastCheck);
      if (lastCheckDate.getMonth() !== currentMonth || lastCheckDate.getFullYear() !== currentYear) {
        shouldShow = true;
      }
    } else {
      shouldShow = true;
    }
    if (shouldShow && recurringItems.length > 0) {
      const pending = recurringItems.filter(recurring => {
        const existingInCurrentMonth = activeTransactions.some(t => 
          t.description === recurring.description && 
          t.amount === recurring.amount &&
          t.type === recurring.type &&
          t.category === recurring.category
        );
        return !existingInCurrentMonth;
      });
      if (pending.length > 0) {
        setPendingRecurring(pending);
        setSelectedItems(new Set(pending.map(t => t.id!)));
        setShowRecurringModal(true);
      }
    }
  }, [user?.uid, recurringItems.length, hasProAccess, activeTransactions]);

  const handleConfirmSelected = async () => {
    if (!addTransaction) {
      console.error('addTransaction no está disponible');
      return;
    }
    for (const id of selectedItems) {
      const tx = pendingRecurring.find(t => t.id === id);
      if (tx && !confirmedItems.has(id)) {
        setProcessing(id);
        try {
          await addTransaction({
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            description: tx.description,
            isRecurring: true,
            inputMode: 'text',
          });
          setConfirmedItems(prev => new Set(prev).add(id));
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setProcessing(null);
        }
      }
    }
    setTimeout(() => {
      const lastCheckKey = `last_recurring_check_${user.uid}`;
      localStorage.setItem(lastCheckKey, new Date().toISOString());
      setShowRecurringModal(false);
    }, 500);
  };

  const handleSkip = () => {
    const lastCheckKey = `last_recurring_check_${user.uid}`;
    localStorage.setItem(lastCheckKey, new Date().toISOString());
    setShowRecurringModal(false);
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleAll = () => {
    if (selectedItems.size === pendingRecurring.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingRecurring.map(t => t.id!)));
    }
  };

  if (!hasProAccess) {
    return (
      <div className="glass p-8 rounded-[2.5rem] bg-indigo-50 border-indigo-100 flex flex-col items-center text-center">
        <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
          <RefreshCcw className="w-8 h-8 text-indigo-500" />
        </div>
        <h4 className="font-bold text-slate-900 mb-2">Monitor de Gastos Recurrentes (Pro)</h4>
        <p className="text-slate-500 text-xs mb-6 max-w-[240px]">
          Detectamos automáticamente tus pagos recurrentes para que nunca pierdas el control.
        </p>
        <button onClick={onUpgrade} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          Activar Monitor Pro
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="glass p-8 rounded-[2.5rem] bg-white border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <RefreshCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Gastos Recurrentes</h3>
              <p className="text-[10px] text-slate-400">Tus recibos con costo fijo, suscripciones y pagos periódicos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Costo Mensual</p>
            <p className="font-bold text-indigo-600">{formatCurrency(monthlyTotal)}</p>
            {diferencia > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Total en categoría: {formatCurrency(totalSuscripcionesCategoria)} 
                <span className="text-amber-500"> (incluye pagos no recurrentes)</span>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {recurringItems.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Marca tus gastos como "recurrentes" en la lista de movimientos.</p>
            </div>
          ) : (
            recurringItems.map(item => (
              <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.description}</p>
                  <p className="text-[10px] text-slate-400">{item.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                  <button onClick={() => toggleRecurring(item.id!, false)} className="p-2 text-slate-300 hover:text-red-500">
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
          {potentialSubscriptions.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Bell className="w-4 h-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Detección de Olvidos</h4>
              </div>
              {potentialSubscriptions.filter(item => !dismissedSuggestions.has(item.id!)).map(item => (
                <div key={`potential-${item.id}`} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.description}?</p>
                    <p className="text-[10px] text-amber-600 font-bold uppercase">Pago frecuente detectado</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRecurring(item.id!, true)} className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-700 rounded-lg text-[10px] font-bold">
                      Seguir
                    </button>
                    <button onClick={() => setDismissedSuggestions(prev => new Set(prev).add(item.id!))} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold">
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="bg-amber-50 rounded-2xl p-4 flex items-start gap-3">
            <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              <span className="font-bold text-amber-700">Tip:</span> Reduciendo tus suscripciones en un 20% acelerarías tu libertad financiera en aproximadamente 14 meses.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRecurringModal && pendingRecurring.length > 0 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCcw className="w-6 h-6" />
                      <h2 className="text-xl font-bold">Gastos Recurrentes</h2>
                    </div>
                    <p className="text-indigo-100 text-sm">
                      ¿Registrar estos gastos para {new Date().toLocaleString('es', { month: 'long', year: 'numeric' })}?
                    </p>
                  </div>
                  <button onClick={handleSkip} className="p-1 hover:bg-white/20 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {pendingRecurring.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleItem(tx.id!)}
                        disabled={processing === tx.id}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center",
                          selectedItems.has(tx.id!) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
                        )}
                      >
                        {selectedItems.has(tx.id!) && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 text-sm">{tx.description}</p>
                        <p className="text-xs text-slate-400">{tx.category}</p>
                      </div>
                      <p className="font-bold text-slate-900">{formatCurrency(tx.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
                <button
                  onClick={handleConfirmSelected}
                  disabled={selectedItems.size === 0}
                  className={cn(
                    "w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2",
                    selectedItems.size === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Registrar {selectedItems.size} {selectedItems.size === 1 ? 'gasto' : 'gastos'}
                </button>
                <button onClick={handleSkip} className="w-full py-2 text-slate-500 text-sm">
                  Omitir este mes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
