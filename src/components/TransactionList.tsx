import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Trash2, ShoppingBag, Coffee, Car, Home, Heart, CreditCard, Utensils, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORY_ICONS: any = {
  Comida: Utensils,
  Transporte: Car,
  Vivienda: Home,
  Entretenimiento: ShoppingBag,
  Salud: Heart,
  Café: Coffee,
  Otros: CreditCard
};

export function TransactionList({ transactions, onDelete, onToggleRecurring }: { transactions: Transaction[], onDelete: any, onToggleRecurring?: any, key?: string }) {
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Movimientos Recientes</h2>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit transition-colors">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              filter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('expense')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              filter === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Gastos
          </button>
          <button 
            onClick={() => setFilter('income')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              filter === 'income' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Ingresos
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filteredTransactions.length > 0 ? filteredTransactions.map((t) => {
            const Icon = CATEGORY_ICONS[t.category] || CreditCard;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-5 rounded-3xl flex items-center gap-4 hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div className={cn(
                  "p-3 rounded-2xl shrink-0",
                  t.type === 'expense' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-slate-900 truncate">{t.description}</h4>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-slate-500 mt-0.5">
                    <span className="font-medium px-2 py-0.5 bg-slate-100 rounded-lg shrink-0 transition-colors uppercase tracking-tight">{t.category}</span>
                    <span className="hidden xs:inline text-slate-300">•</span>
                    <span className="truncate">{formatDate(t.timestamp)}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 shrink-0">
                  <p className={cn(
                    "font-bold text-base sm:text-lg leading-tight",
                    t.type === 'expense' ? "text-slate-900" : "text-green-600"
                  )}>
                    {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onToggleRecurring?.(t.id!, !t.isRecurring)}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        t.isRecurring ? "bg-indigo-100 text-indigo-600" : "text-slate-300 hover:text-indigo-400 hover:bg-slate-100"
                      )}
                      title={t.isRecurring ? "Remover de suscripciones" : "Marcar como suscripción"}
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div className="text-center py-20 bg-white border-2 border-dashed border-slate-100 rounded-3xl transition-colors">
              <p className="text-slate-400 font-medium">No se encontraron movimientos.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
