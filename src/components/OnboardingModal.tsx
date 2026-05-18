import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface OnboardingModalProps {
  userId: string;
  email: string;
  onComplete: (name: string, birthdate: string) => void;
}

export function OnboardingModal({ userId, email, onComplete }: OnboardingModalProps) {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Calcular edad máxima/mínima para el input
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
    .toISOString().split('T')[0]; // mínimo 13 años
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    .toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Por favor ingresa tu nombre.'); return; }
    if (!birthdate) { setError('Por favor ingresa tu fecha de nacimiento.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        name: name.trim(),
        birthdate,
        onboardingDone: true,
      });
      onComplete(name.trim(), birthdate);
    } catch (e) {
      setError('Error guardando tu información. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await updateDoc(doc(db, 'users', userId), { onboardingDone: true });
      onComplete('', '');
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0a0f1e]/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white rounded-full blur-[80px]" />
          </div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-2xl font-black mb-2">¡Bienvenido a SmartMone¥!</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Cuéntanos un poco sobre ti para personalizar tu experiencia financiera.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              ¿Cómo te llamas?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre o apodo"
              maxLength={30}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={maxDate}
              min={minDate}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900"
            />
            <p className="text-[10px] text-slate-400 leading-relaxed px-1">
              🔒 Solo usamos tu fecha para calcular tu edad en el simulador financiero y enviarte una sorpresa en tu cumpleaños.
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-center">{error}</p>
          )}

          {/* Botones */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Empezar <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
