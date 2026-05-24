// src/hooks/useSubscription.ts
import { useMemo } from 'react';
import { useFinance } from './useFinance';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useSubscription() {
  const { user, refreshUser } = useFinance();

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
    
    // Lógica estricta de Trial
    let trialRemainingDays = null;
    let trialIsActive = false;

    if (user.isTrialActive && user.trialEndDate) {
      const end = user.trialEndDate.toDate();
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff > 0) {
        trialRemainingDays = diff;
        trialIsActive = true;
      }
    }

    // Definición real de isPro: O tiene suscripción activa o el trial está vigente
    const isPro = !!user.isActive || trialIsActive;

    // Límites de plan: 40 texto, 10 voz si es gratuito
    const maxText = isPro ? Infinity : 40;
    const maxVoice = isPro ? Infinity : 10;

    const currentText = user.monthlyRecordCount ?? 0;
    const currentVoice = user.monthlyVoiceCount ?? 0;

    const canAddTextRecord = currentText < maxText;
    const canAddVoiceRecord = currentVoice < maxVoice;

    return {
      isPro,
      isTrialActive: trialIsActive,
      trialRemainingDays,
      remainingTextRecords: Math.max(0, maxText - currentText),
      remainingVoiceRecords: Math.max(0, maxVoice - currentVoice),
      canAddTextRecord,
      canAddVoiceRecord,
    };
  }, [user]);

  // Consumir un registro
  const consumeRecord = async (type: 'text' | 'voice') => {
    if (!user) return;
    const field = type === 'text' ? 'monthlyRecordCount' : 'monthlyVoiceCount';
    const newValue = (user[field] ?? 0) + 1;
    await updateDoc(doc(db, 'users', user.uid), { [field]: newValue });
    if (refreshUser) await refreshUser();
  };

  return { ...status, consumeRecord };
}
