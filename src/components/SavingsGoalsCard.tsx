import React, { useState } from 'react';
import { PiggyBank, Plus, Trash2, CheckCircle2, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SavingsGoal } from '../types';
import { cn } from '../lib/utils';

interface SavingsGoalsCardProps {
  savingsGoals: SavingsGoal[];
  formatAmount: (amount: number) => string;
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'userId'>) => Promise<void>;
  onContribute: (id: string, amount: number) => Promise<void>;
  onRemoveGoal: (id: string) => Promise<void>;
}

export function SavingsGoalsCard({
  savingsGoals,
  formatAmount,
  onAddGoal,
  onContribute,
  onRemoveGoal,
}: SavingsGoalsCardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contributingId, setContributingId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(newGoal.targetAmount);
    const initial = newGoal.currentAmount ? Number(newGoal.currentAmount) : 0;
    if (!newGoal.name.trim() || !Number.isFinite(target) || target <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddGoal({
        name: newGoal.name.trim(),
        targetAmount: target,
        currentAmount: Number.isFinite(initial) && initial >= 0 ? initial : 0,
        ...(newGoal.deadline ? { deadline: newGoal.deadline } : {}),
      });
      setNewGoal({ name: '', targetAmount: '', currentAmount: '', deadline: '' });
      setShowCreateModal(false);
    } catch (error: any) {
      alert(error?.message || 'No se pudo crear la meta de ahorro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContribute = async (id: string) => {
    const amount = Number(contributionAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await onContribute(id, amount);
      setContributionAmount('');
      setContributingId(null);
    } catch (error: any) {
      alert(error?.message || 'No se pudo registrar el abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="glass p-8 rounded-[2.5rem]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Metas de Ahorro</h3>
              <p className="text-xs text-slate-400">Objetivos positivos para tus sueños y fondo de emergencia</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nueva Meta
          </button>
        </div>

        <div className="space-y-5">
          {savingsGoals.length > 0 ? (
            savingsGoals.map((goal) => {
              const current = goal.currentAmount || 0;
              const pct = Math.min(Math.round((current / goal.targetAmount) * 100), 100);
              const isCompleted = current >= goal.targetAmount;
              const remaining = Math.max(0, goal.targetAmount - current);

              return (
                <div
                  key={goal.id}
                  className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-3 transition-all"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{goal.name}</span>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> ¡Meta alcanzada!
                          </span>
                        )}
                      </div>
                      {goal.deadline && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Objetivo: {new Date(`${goal.deadline}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-600">{pct}%</span>
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => {
                            setContributingId(contributingId === goal.id ? null : goal.id!);
                            setContributionAmount('');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition-colors"
                        >
                          + Abonar
                        </button>
                      )}

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
                              onClick={async () => {
                                await onRemoveGoal(goal.id!);
                                setGoalToDelete(null);
                              }}
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
                          <button
                            type="button"
                            onClick={() => setGoalToDelete(goal.id!)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar meta de ahorro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/70 h-3 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={cn(
                        'h-full rounded-full transition-all duration-700',
                        isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      )}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>
                      Ahorrado: <strong className="text-slate-700">{formatAmount(current)}</strong> de {formatAmount(goal.targetAmount)}
                    </span>
                    {!isCompleted && (
                      <span className="text-slate-400">Faltan {formatAmount(remaining)}</span>
                    )}
                  </div>

                  {contributingId === goal.id && (
                    <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-200/70">
                      <input
                        type="number"
                        min="1"
                        placeholder="Monto a abonar"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        className="flex-1 min-w-[140px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                      />
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleContribute(goal.id!)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        Guardar abono
                      </button>
                      <button
                        type="button"
                        onClick={() => setContributingId(null)}
                        className="px-3 py-2 bg-slate-200/70 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-400">
              <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-15" />
              <p className="text-sm">
                Aún no tienes metas de ahorro. <br />
                Crea una para tu fondo de emergencia, viaje o proyecto.
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-8 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Nueva Meta de Ahorro</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Nombre de la meta</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    placeholder="Ej. Fondo de emergencia"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Objetivo</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1000000"
                      value={newGoal.targetAmount}
                      onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Ahorro inicial</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newGoal.currentAmount}
                      onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">Fecha objetivo (opcional)</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Meta de Ahorro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
