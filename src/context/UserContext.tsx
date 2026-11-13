// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile, TRIAL_DAYS } from '../types';
import { loginOneSignal, logoutOneSignal } from '../lib/onesignal';

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => void;
}

const DEFAULT_NOTIFICATION_PREFS = {
  dailyReminder: true,
  dailyReminderHour: 20,
  weeklySummary: true,
  monthlySummary: true,
  recurringAlerts: true,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      setUserId(firebaseUser?.uid || null);
      if (!firebaseUser) {
        void logoutOneSignal();
        setUser(null);
        setLoading(false);
      } else {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
        void loginOneSignal(firebaseUser.uid, { timezone: tz });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let isSystemAdmin = false;
    const adminCheckPromise = getDoc(doc(db, 'admins', userId))
      .then((snap) => {
        isSystemAdmin = snap.exists();
        return isSystemAdmin;
      })
      .catch(() => false);

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      await adminCheckPromise;

      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';

      if (snap.exists()) {
        const data = snap.data() as UserProfile;

        // ✅ Verificar vigencia del período de prueba de 30 días desde trialEndDate
        let trialActive = data.isTrialActive === true;
        let trialEnd = data.trialEndDate ?? null;

        if (trialEnd) {
          const endDate = trialEnd.toDate ? trialEnd.toDate() : new Date(trialEnd);
          if (endDate > new Date()) {
            if (!data.isPro && !data.isActive && !trialActive) {
              trialActive = true;
              await updateDoc(userRef, { isTrialActive: true }).catch(console.error);
            }
          } else if (trialActive) {
            // El período de prueba de 30 días ya venció -> pasa a Plan Free reducido
            trialActive = false;
            await updateDoc(userRef, { isTrialActive: false }).catch(console.error);
          }
        }

        if (!data.timezone) {
          await updateDoc(userRef, { timezone: detectedTimezone }).catch(console.error);
        }

        const userData: UserProfile = {
          ...data,
          uid: userId,
          isAdmin: isSystemAdmin || Boolean((data as any).isAdmin),
          isActive: data.isActive ?? false,
          isPro: data.isPro ?? false,
          isTrialActive: (data.isPro || data.isActive) ? false : trialActive,
          trialEndDate: trialEnd,
          monthlyRecordCount: data.monthlyRecordCount ?? 0,
          monthlyVoiceCount: data.monthlyVoiceCount ?? 0,
          lastResetDate: data.lastResetDate ?? null,
          trialOfferLastShown: data.trialOfferLastShown ?? 0,
          trialOfferAccepted: data.trialOfferAccepted ?? true,
          pushEnabled: data.pushEnabled ?? false,
          timezone: data.timezone || detectedTimezone,
          notificationPrefs: {
            dailyReminder: data.notificationPrefs?.dailyReminder ?? DEFAULT_NOTIFICATION_PREFS.dailyReminder,
            dailyReminderHour: data.notificationPrefs?.dailyReminderHour ?? DEFAULT_NOTIFICATION_PREFS.dailyReminderHour,
            weeklySummary: data.notificationPrefs?.weeklySummary ?? DEFAULT_NOTIFICATION_PREFS.weeklySummary,
            monthlySummary: data.notificationPrefs?.monthlySummary ?? DEFAULT_NOTIFICATION_PREFS.monthlySummary,
            recurringAlerts: data.notificationPrefs?.recurringAlerts ?? DEFAULT_NOTIFICATION_PREFS.recurringAlerts,
          },
        };
        setUser(userData);
      } else {
        // ✅ Nuevo usuario: activar automáticamente 30 días de prueba al registrarse
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
        const newUser: UserProfile = {
          uid: userId,
          email: auth.currentUser?.email || '',
          isPro: false,
          isActive: false,
          isAdmin: isSystemAdmin,
          isTrialActive: true,
          trialEndDate: trialEnd.toISOString(),
          monthlyRecordCount: 0,
          monthlyVoiceCount: 0,
          lastResetDate: now.toISOString(),
          freeRecordsCount: 0,
          onboardingDone: false,
          trialOfferLastShown: 0,
          trialOfferAccepted: true,
          pushEnabled: false,
          timezone: detectedTimezone,
          notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
        };
        await setDoc(userRef, newUser, { merge: true });
        setUser(newUser);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error en UserProvider:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const refreshUser = () => {};

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};
