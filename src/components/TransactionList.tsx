import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Trash2, ShoppingBag, Coffee, Car, Home, Heart, CreditCard, Utensils, RefreshCcw, Pencil, Check, X } from 'lucide-react';
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

const DEFAULT_CATEGORIES = [
  'Comida',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Entretenimiento',
  'Salud',
  'Café',
  'Educación',
  'Compras',
  'Salario',
  'Ventas',
  'Inversiones',
  'Otros'
];

export function TransactionList({
  transactions,
  onDelete,
  onToggleRecurring,
  onUpdate
}: {
  transactions: Transaction[];
  onDelete: any;
  onToggleRecurring?: any;
  onUpdate?: (id: string, updates: Partial<Pick<Transaction, 'description' | 'amount' | 'category' | 'type'>>) => Promise<void>;
  key?: string;
}) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Estado para edición en línea de un movimiento
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('Otros');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (t: Transaction) => {
    setEditingId(t.id || null);
    setEditDescription(t.description || '');
    setEditAmount(String(t.amount || 0));
    setEditCategory(t.category || 'Otros');
    setEditType(t.type || 'expense');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsSaving(false);
  };

  const saveEdit = async (id: string) => {
    if (!onUpdate) return;
    const parsedAmount = parseFloat(editAmount);
    if (!editDescription.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSaving(true);
    try {
      await onUpdate(id, {
        description: editDescription.trim(),
        amount: parsedAmount,
        category: editCategory,
        type: editType
      });
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Extraemos las categorías basándonos en el tipo seleccionado para no confundir al usuario
  const availableCategories = useMemo(() => {
    const filteredByType = typeFilter === 'all' 
      ? transactions 
      : transactions.filter(t => t.type === typeFilter);
    
    const categories = new Set(filteredByType.map(t => t.category));
    return Array.from(categories).sort();
  }, [transactions, typeFilter]);

  const allCategoryOptions = useMemo(() => {
    const combined = new Set([...DEFAULT_CATEGORIES, ...transactions.map(t => t.category).filter(Boolean)]);
    return Array.from(combined).sort();
  }, [transactions]);

  // 2. Al cambiar el filtro de tipo, reiniciamos el de categoría si ya no está disponible
  const handleTypeChange = (newType: 'all' | 'expense' | 'income') => {
    setTypeFilter(newType);
    setCategoryFilter('all'); // Resetea para evitar bloqueos
  };

  // 3. Lógica de filtrado final
  const filteredTransactions = transactions.filter(t => {
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchType && matchCategory;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Fila 1: Título y Filtro de Tipo principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Movimientos Recientes</h2>
        
        <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit transition-colors">
          <button 
            onClick={() => handleTypeChange('all')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              typeFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Todos
          </button>
          <button 
            onClick={() => handleTypeChange('expense')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              typeFilter === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Gastos
          </button>
          <button 
            onClick={() => handleTypeChange('income')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all",
              typeFilter === 'income' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Ingresos
          </button>
        </div>
      </div>

      {/* Fila 2: Chips de Categorías Expuestas (Scroll horizontal en móvil) */}
      {availableCategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">Filtrar por:</span>
          
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0",
              categoryFilter === 'all'
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            Todas
          </button>

          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shrink-0 flex items-center gap-1.5",
                categoryFilter === cat
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {categoryFilter === cat && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Lista de Transacciones */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredTransactions.length > 0 ? filteredTransactions.map((t) => {
            const Icon = CATEGORY_ICONS[t.category] || CreditCard;
            const isEditing = editingId === t.id;

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-5 rounded-3xl flex flex-col gap-4 hover:shadow-md transition-all group relative overflow-hidden"
              >
                {isEditing ? (
                  <div className="space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Descripción del movimiento"
                        maxLength={60}
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        placeholder="Monto"
                        min="0"
                        step="any"
                        className="w-full sm:w-36 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-slate-100 p-0.5 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setEditType('expense')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                              editType === 'expense' ? "bg-white text-red-600 shadow-xs" : "text-slate-500"
                            )}
                          >
                            Gasto
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditType('income')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                              editType === 'income' ? "bg-white text-green-600 shadow-xs" : "text-slate-500"
                            )}
                          >
                            Ingreso
                          </button>
                        </div>

                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {allCategoryOptions.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => t.id && saveEdit(t.id)}
                          disabled={isSaving}
                          className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 w-full">
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
                        {onUpdate && (
                          <button
                            onClick={() => startEdit(t)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Editar movimiento"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
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
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          }) : (
            <div className="text-center py-20 bg-white border-2 border-dashed border-slate-100 rounded-3xl transition-colors">
              <p className="text-slate-400 font-medium">No se encontraron movimientos con esos filtros.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
