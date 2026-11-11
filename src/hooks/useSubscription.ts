// src/hooks/useSubscription.ts
import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  TRIAL_TEXT_LIMIT,
  TRIAL_VOICE_LIMIT,
  FREE_TEXT_LIMIT,
  FREE_VOICE_LIMIT
} from '../types';

export function useSubscription() {
  const { user, refreshUser } = useUser();

  const status = useMemo(() => {
    if (!user) {
      return {
        isPro: false,
        isPaidPro: false,
        isTrialActive: false,
        trialRemainingDays: null,
        trialEndDate: null,
        maxTextRecords: 0,
        maxVoiceRecords: 0,
        remainingTextRecords: 0,
        remainingVoiceRecords: 0,
        canAddTextRecord: false,
        canAddVoiceRecord: false,
      };
    }

    const now = new Date();
    let trialRemainingDays = null;
    let trialIsActive = false;
    let trialEndDate: Date | null = null;

    // Manejo seguro de trialEndDate
    if (user.trialEndDate) {
      if (typeof user.trialEndDate.toDate === 'function') {
        trialEndDate = user.trialEndDate.toDate();
      } else if (user.trialEndDate instanceof Date) {
        trialEndDate = user.trialEndDate;
      } else if (typeof user.trialEndDate === 'string') {
        trialEndDate = new Date(user.trialEndDate);
      }
    }

    const isPaidPro = user.isActive === true || user.isPro === true;

    if (!isPaidPro && trialEndDate && trialEndDate > now) {
      trialIsActive = true;
      trialRemainingDays = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Acceso a módulos Pro: Suscripción pagada O Trial de 30 días activo
    const isPro = isPaidPro || trialIsActive;

    // Topes de mensajes según el estado:
    // - Pro Pagado: Ilimitado
    // - Trial (30 días): 30 textos y 10 audios
    // - Plan Free (día 31+): 15 textos y 3 audios al mes
    const maxText = isPaidPro ? Infinity : trialIsActive ? TRIAL_TEXT_LIMIT : FREE_TEXT_LIMIT;
    const maxVoice = isPaidPro ? Infinity : trialIsActive ? TRIAL_VOICE_LIMIT : FREE_VOICE_LIMIT;

    const currentText = user.monthlyRecordCount ?? 0;
    const currentVoice = user.monthlyVoiceCount ?? 0;

    const canAddTextRecord = currentText < maxText;
    const canAddVoiceRecord = currentVoice < maxVoice;

    return {
      isPro,
      isPaidPro,
      isTrialActive: trialIsActive,
      trialRemainingDays,
      trialEndDate,
      maxTextRecords: maxText,
      maxVoiceRecords: maxVoice,
      remainingTextRecords: maxText === Infinity ? Infinity : Math.max(0, maxText - currentText),
      remainingVoiceRecords: maxVoice === Infinity ? Infinity : Math.max(0, maxVoice - currentVoice),
      canAddTextRecord,
      canAddVoiceRecord,
    };
  }, [user]);

  const consumeRecord = async (type: 'text' | 'voice') => {
    if (!user) return;
    const field = type === 'text' ? 'monthlyRecordCount' : 'monthlyVoiceCount';
    const newValue = (user[field] ?? 0) + 1;
    await updateDoc(doc(db, 'users', user.uid), { [field]: newValue });
    if (refreshUser) await refreshUser();
  };

  return { ...status, consumeRecord };
}
