import React, { useState, useEffect } from 'react';
import { X, User, Calendar, Bell, BellOff, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { NotificationPrefs, UserProfile } from '../types';
import {
  getOneSignalPushStatus,
  requestOneSignalPermission,
  setOneSignalOptIn,
  sendTestPushNotification,
} from '../lib/onesignal';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateProfile: (updatedData: { name: string; birthDate: string }) => Promise<void>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminder: true,
  dailyReminderHour: 20,
  weeklySummary: true,
  monthlySummary: true,
  recurringAlerts: true,
};

export function ProfileSettingsModal({ isOpen, onClose, user, onUpdateProfile }: ProfileSettingsModalProps) {
  const [name, setName] = useState(user.name || '');
  const [birthDate, setBirthDate] = useState(user.birthDate || '');
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    ...DEFAULT_PREFS,
    ...user.notificationPrefs,
  });
  const [pushOptedIn, setPushOptedIn] = useState(Boolean(user.pushEnabled));
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      setBirthDate(user.birthDate || '');
      setPrefs({
        ...DEFAULT_PREFS,
        ...user.notificationPrefs,
      });
      setPushMessage(null);
      setError(null);
      setSuccess(false);

      getOneSignalPushStatus().then((status) => {
        setPermissionState(status.permission);
        setPushOptedIn(status.optedIn || (status.permission === 'granted' && Boolean(user.pushEnabled)));
      });
    }
  }, [isOpen, user]);

  const handleTogglePush = async () => {
    setIsTogglingPush(true);
    setPushMessage(null);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
      if (!pushOptedIn) {
        const status = await requestOneSignalPermission();
        setPermissionState(status.permission);
        const enabled = status.permission === 'granted' && status.optedIn;
        setPushOptedIn(enabled);
        await updateDoc(doc(db, 'users', user.uid), {
          pushEnabled: enabled,
          timezone,
        });
        if (!enabled) {
          setError(
            status.permission === 'denied'
              ? 'El navegador bloqueó las notificaciones. Actívalas desde el candado de la barra de direcciones.'
              : 'No se completó el permiso de notificaciones.'
          );
        } else {
          setPushMessage('¡Notificaciones push activadas!');
        }
      } else {
        await setOneSignalOptIn(false);
        setPushOptedIn(false);
        await updateDoc(doc(db, 'users', user.uid), { pushEnabled: false });
        setPushMessage('Notificaciones push pausadas.');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado de notificaciones.');
    } finally {
      setIsTogglingPush(false);
    }
  };

  const handleSendTest = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsSendingTest(true);
    setPushMessage(null);
    setError(null);
    try {
      const idToken = await currentUser.getIdToken();
      await sendTestPushNotification(idToken);
      setPushMessage('Notificación de prueba enviada. Deberías recibirla en unos segundos.');
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar la notificación de prueba.');
    } finally {
      setIsSendingTest(false);
    }
  };

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
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPrefs: prefs,
        timezone,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Hubo un error al actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Ajustes del Perfil</h3>
              <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-4 top-4 text-slate-400"><User className="w-4 h-4" /></span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 pl-11 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold"
                    placeholder="Nombre"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-slate-400"><Calendar className="w-4 h-4" /></span>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full p-4 pl-11 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {pushOptedIn ? (
                      <Bell className="w-4 h-4 text-blue-600" />
                    ) : (
                      <BellOff className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">Notificaciones Push</p>
                      <p className="text-[11px] text-slate-500">
                        {permissionState === 'unsupported'
                          ? 'No soportado en este navegador'
                          : pushOptedIn
                            ? 'Activadas en este dispositivo'
                            : 'Desactivadas'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isTogglingPush || permissionState === 'unsupported'}
                    onClick={handleTogglePush}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      pushOptedIn
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isTogglingPush ? '...' : pushOptedIn ? 'Pausar' : 'Activar'}
                  </button>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-200/70">
                  <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
                    <span>Recordatorio diario al final del día</span>
                    <input
                      type="checkbox"
                      checked={prefs.dailyReminder}
                      onChange={(e) => setPrefs((p) => ({ ...p, dailyReminder: e.target.checked }))}
                      className="rounded accent-blue-600"
                    />
                  </label>

                  {prefs.dailyReminder && (
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500 pl-2">
                      <span>Hora del recordatorio</span>
                      <select
                        value={prefs.dailyReminderHour ?? 20}
                        onChange={(e) => setPrefs((p) => ({ ...p, dailyReminderHour: Number(e.target.value) }))}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        <option value={19}>7:00 PM</option>
                        <option value={20}>8:00 PM</option>
                        <option value={21}>9:00 PM</option>
                        <option value={22}>10:00 PM</option>
                      </select>
                    </div>
                  )}

                  <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
                    <span>Resumen semanal (domingos)</span>
                    <input
                      type="checkbox"
                      checked={prefs.weeklySummary}
                      onChange={(e) => setPrefs((p) => ({ ...p, weeklySummary: e.target.checked }))}
                      className="rounded accent-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
                    <span>Cierre mensual (día 1 de cada mes)</span>
                    <input
                      type="checkbox"
                      checked={prefs.monthlySummary}
                      onChange={(e) => setPrefs((p) => ({ ...p, monthlySummary: e.target.checked }))}
                      className="rounded accent-blue-600"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 text-xs text-slate-700 cursor-pointer">
                    <span>Alertas de cobros recurrentes</span>
                    <input
                      type="checkbox"
                      checked={prefs.recurringAlerts}
                      onChange={(e) => setPrefs((p) => ({ ...p, recurringAlerts: e.target.checked }))}
                      className="rounded accent-blue-600"
                    />
                  </label>
                </div>

                {pushOptedIn && (
                  <button
                    type="button"
                    disabled={isSendingTest}
                    onClick={handleSendTest}
                    className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingTest ? 'Enviando prueba...' : 'Enviar notificación de prueba'}
                  </button>
                )}
              </div>

              {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
              {pushMessage && (
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {pushMessage}
                </p>
              )}
              {success && (
                <p className="text-xs font-semibold text-emerald-600">Cambios guardados correctamente.</p>
              )}

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
