import React from 'react';
import { Calendar, RefreshCcw, Bell, ArrowRight, Zap, Info } from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export function SubscriptionManager({ user, transactions, toggleRecurring, onUpgrade }: { user: UserProfile, transactions: Transaction[], toggleRecurring: any, onUpgrade?: () => void }) {
  const recurringItems = transactions.filter(t => t.isRecurring);
  
  // Advanced Detection Logic (Forgotten Subscriptions)
  const potentialSubscriptions = React.useMemo(() => {
    if (!user.isPro) return [];
    
    const expenses = transactions.filter(t => t.type === 'expense' && !t.isRecurring);
    const groups: { [key: string]: Transaction[] } = {};
    
    // Group by simplified name (first 6 letters or similar)
    expenses.forEach(t => {
      const key = t.description.toLowerCase().trim().substring(0, 8);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    
    // Find groups that repeat in different months
    return Object.values(groups)
      .filter(items => {
        if (items.length < 2) return false;
        const months = new Set(items.map(i => {
           const d = i.timestamp?.toDate ? i.timestamp.toDate() : new Date(i.timestamp);
           return `${d.getMonth()}-${d.getFullYear()}`;
        }));
        return months.size >= 2; // Repeats in at least 2 different months
      })
      .map(group => group[0]); // Take the representative
  }, [transactions, user.isPro]);

  const monthlyTotal = recurringItems.reduce((acc, t) => acc + t.amount, 0);

  if (!user.isPro) {
    return (
      <div className="glass p-8 rounded-[2.5rem] bg-indigo-50 border-indigo-100 flex flex-col items-center text-center transition-colors">
        <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
          <RefreshCcw className="w-8 h-8 text-indigo-500" />
        </div>
        <h4 className="font-bold text-slate-900 mb-2">Monitor de Suscripciones (Pro)</h4>
        <p className="text-slate-500 text-xs mb-6 max-w-[240px]">
          Detectamos automáticamente tus pagos recurrentes (Netflix, Spotify, Gym) para que nunca pierdas el control.
        </p>
        <button 
          onClick={onUpgrade}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:shadow-lg shadow-indigo-200 transition-all"
        >
          Activar Monitor Pro
        </button>
      </div>
    );
  }

  return (
    <div className="glass p-8 rounded-[2.5rem] bg-white border-slate-100 overflow-hidden transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <RefreshCcw className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">Suscripciones</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Costo Mensual</p>
          <p className="font-bold text-indigo-600">{formatCurrency(monthlyTotal)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {recurringItems.length === 0 && potentialSubscriptions.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
             <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
             <p className="text-xs text-slate-400">Marca tus gastos como "recurrentes" en la lista de movimientos para verlos aquí.</p>
          </div>
        ) : (
          <>
            {recurringItems.map(item => (
              <motion.div 
                 layout
                 key={item.id}
                 className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm font-bold text-slate-900 transition-colors">
                     {item.description.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-800">{item.description}</p>
                     <p className="text-[10px] text-slate-400 uppercase font-bold">{item.category}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <p className="text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                   <button 
                     onClick={() => toggleRecurring(item.id!, false)}
                     className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                   >
                     <Zap className="w-4 h-4" />
                   </button>
                </div>
              </motion.div>
            ))}

            {potentialSubscriptions.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                   <Bell className="w-4 h-4" />
                   <h4 className="text-[10px] font-black uppercase tracking-widest">Detección de Olvidos</h4>
                </div>
                {potentialSubscriptions.map(item => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`potential-${item.id}`}
                    className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between border-dashed transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg text-amber-500 shadow-sm transition-colors">
                        <RefreshCcw className="w-4 h-4 animate-spin-slow" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.description}?</p>
                        <p className="text-[10px] text-amber-600 font-bold uppercase">Pago frecuente detectado</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleRecurring(item.id!, true)}
                      className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-700 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Seguir
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
         <div className="bg-amber-50 rounded-2xl p-4 flex items-start gap-3 transition-colors">
           <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
           <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
             <span className="font-bold text-amber-700">Tip:</span> Reduciendo tus suscripciones en un 20% acelerarías tu libertad financiera en aproximadamente 14 meses.
           </p>
         </div>
      </div>
    </div>
  );
}
