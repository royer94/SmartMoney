import React, { useState, useEffect } from 'react';
import { X, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { ProBanner } from './ProBanner';

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

  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      setBirthDate(user.birthDate || '');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, user]);

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <h3 className="text-xl font-bold text-slate-900">Ajustes del Perfil</h3>
              <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-4 text-slate-400"><User className="w-4 h-4" /></span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 pl-11 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold" placeholder="Nombre" />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-slate-400"><Calendar className="w-4 h-4" /></span>
                  <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full p-4 pl-11 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold" />
                </div>
              </div>

              {/* ✅ PASAMOS user COMO PROP AL ProBanner */}
              <div className="mt-4">
                <ProBanner user={user} onUpgrade={() => {}} />
              </div>

              <button type="submit" disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all">
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
