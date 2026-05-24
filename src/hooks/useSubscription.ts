// src/hooks/useSubscription.ts
import { useMemo } from 'react';
import { useFinance } from './useFinance'; // Ajusta la ruta si tu hook useFinance está en otro lugar
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useSubscription() {
  const { user, refreshUser } = useFinance(); // Necesitas que refreshUser actualice el user local (por ejemplo, recargando desde Firestore)

  const status = useMemo(() => {
    if (!user) {
      return {
        isPro: false,
        isTrialActive: false,
        trialRemainingDays: null,
        remainingTextRecords: 0,
        remainingVoiceRecords: 0,
        canAddTextRecord: false,
        canAddVoiceRecord: false,
      };
    }

    const now = new Date();
    let isPro = user.isTrialActive || user.isActive;

    let trialRemainingDays = null;
    if (user.isTrialActive && user.trialEndDate) {
      const end = user.trialEndDate.toDate(); // asumiendo que es Timestamp de Firestore
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      trialRemainingDays = diff > 0 ? diff : 0;
      if (diff <= 0 && !user.isActive) {
        isPro = false;
        // Opcional: aquí podrías llamar a una función para desactivar trial localmente
        // pero la Cloud Function ya debería haberlo hecho.
      }
    }

    // Límites plan gratuito: 40 texto, 10 voz
    const maxText = isPro ? Infinity : 40;
    const maxVoice = isPro ? Infinity : 10;

    const currentText = user.monthlyRecordCount ?? 0;
    const currentVoice = user.monthlyVoiceCount ?? 0;

    const canAddTextRecord = currentText < maxText;
    const canAddVoiceRecord = currentVoice < maxVoice;

    return {
      isPro,
      isTrialActive: user.isTrialActive,
      trialRemainingDays: trialRemainingDays && trialRemainingDays > 0 ? trialRemainingDays : null,
      remainingTextRecords: Math.max(0, maxText - currentText),
      remainingVoiceRecords: Math.max(0, maxVoice - currentVoice),
      canAddTextRecord,
      canAddVoiceRecord,
    };
  }, [user]);

  // Consumir un registro (texto o voz) después de confirmar una transacción
  const consumeRecord = async (type: 'text' | 'voice') => {
    if (!user) return;
    const field = type === 'text' ? 'monthlyRecordCount' : 'monthlyVoiceCount';
    const newValue = (user[field] ?? 0) + 1;
    await updateDoc(doc(db, 'users', user.uid), { [field]: newValue });
    if (refreshUser) await refreshUser(); // para actualizar el user local
  };

  return { ...status, consumeRecord };
}
