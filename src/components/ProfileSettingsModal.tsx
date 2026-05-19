import React, { useState } from 'react';
import { X, User, Calendar, Save, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateProfile: (updatedData: { name: string; birthDate: string }) => Promise<void>;
}

export function ProfileSettingsModal({ isOpen, onClose, user, onUpdateProfile }: ProfileSettingsModalProps) {
  const [name, setName] = useState(user.name || '');
  // El formato esperado para <input type="date"> es YYYY-MM-DD
  const [birthDate, setBirthDate] = useState(user.birthDate || ''); 
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    if (!name.trim()) {
      setError('El nombre no puede estar vacío.');
      setIsSaving(false);
      return;
    }

    try {
      await onUpdateProfile({ name: name.trim(), birthDate });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Hubo un error al actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-xl"
      >
        {/* Header del Modal */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ajustes de Perfil</h3>
            <p className="text-xs text-slate-500">Actualiza tu información personal básica</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Alertas de Estado */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              ❌ {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl border border-green-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> ¡Perfil actualizado correctamente!
            </div>
          )}

          {/* Campo: Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Nombre Completo
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Román Ramírez"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Campo: Fecha de Nacimiento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Fecha de Nacimiento
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Información de la cuenta */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Cuenta de Usuario
            </span>
            <span className="text-xs text-slate-600 block truncate">
              {user.email}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
