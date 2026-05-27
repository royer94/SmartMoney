// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      setUserId(firebaseUser?.uid || null);
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
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
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Asegurar valores por defecto para los campos de suscripción y oferta de trial
        const userData: UserProfile = {
          ...data,
          uid: userId,
          isAdmin: (data as any).isAdmin || false,
          isActive: data.isActive ?? false,
          isPro: data.isPro ?? false,
          isTrialActive: data.isTrialActive ?? false,
          trialEndDate: data.trialEndDate ?? null,
          monthlyRecordCount: data.monthlyRecordCount ?? 0,
          monthlyVoiceCount: data.monthlyVoiceCount ?? 0,
          lastResetDate: data.lastResetDate ?? null,
          // ✅ Nuevos campos para la oferta de trial
          trialOfferLastShown: data.trialOfferLastShown ?? 0,
          trialOfferAccepted: data.trialOfferAccepted ?? false,
        };
        setUser(userData);
      } else {
        // Crear usuario nuevo con todos los campos necesarios (incluyendo los de oferta de trial)
        const newUser: UserProfile = {
          uid: userId,
          email: auth.currentUser?.email || '',
          isPro: false,
          isActive: false,
          isTrialActive: false,
          trialEndDate: null,
          monthlyRecordCount: 0,
          monthlyVoiceCount: 0,
          lastResetDate: null,
          freeRecordsCount: 0,
          onboardingDone: false,
          // ✅ Inicializar campos de oferta de trial
          trialOfferLastShown: 0,
          trialOfferAccepted: false,
        };
        await setDoc(userRef, newUser);
        setUser(newUser);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error en UserProvider:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const refreshUser = () => {
    // No es necesario con onSnapshot, pero se deja por compatibilidad
  };

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
