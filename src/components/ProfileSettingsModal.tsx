import React, { useState } from 'react';
import { X, User, Calendar, Save, ShieldCheck, Pencil } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Perfil del Usuario</h3>
            <p className="text-xs text-slate-500 font-medium">Personaliza tu identidad financiera</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 text-xs font-bold text-red-600 bg-red-50 rounded-2xl border border-red-100">
              ❌ {error}
            </motion.div>
          )}
          
          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-4 text-xs font-bold text-green-600 bg-green-50 rounded-2xl border border-green-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> ¡Cambios guardados con éxito!
            </motion.div>
          )}

          {/* Campo Nombre */}
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-12 py-4 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
              <span className="absolute right-4 text-slate-300">
                <Pencil className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Campo Fecha de Nacimiento */}
          <div className="space-y-2 group">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fecha de Nacimiento</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-12 py-4 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
              <span className="absolute right-4 text-slate-300">
                <Pencil className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Badge de Email (No editable) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Email de cuenta</p>
              <p className="text-xs font-semibold text-slate-600 truncate max-w-[180px]">{user.email}</p>
            </div>
            <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase">
              Verificado
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 active:scale-95 transition-all"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
