// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
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
        
        // ✅ INFERIR estado de prueba desde trialEndDate si es futuro
        let trialActive = data.isTrialActive === true;
        let trialEnd = data.trialEndDate ?? null;
        
        if (!trialActive && trialEnd) {
          const endDate = trialEnd.toDate ? trialEnd.toDate() : new Date(trialEnd);
          if (endDate > new Date()) {
            trialActive = true;
            // Opcional: actualizar Firestore para futuras lecturas
            await updateDoc(userRef, { isTrialActive: true }).catch(console.error);
          }
        }
        
        const userData: UserProfile = {
          ...data,
          uid: userId,
          isAdmin: (data as any).isAdmin || false,
          isActive: data.isActive ?? false,
          isPro: data.isPro ?? false,
          isTrialActive: trialActive,
          trialEndDate: trialEnd,
          monthlyRecordCount: data.monthlyRecordCount ?? 0,
          monthlyVoiceCount: data.monthlyVoiceCount ?? 0,
          lastResetDate: data.lastResetDate ?? null,
          trialOfferLastShown: data.trialOfferLastShown ?? 0,
          trialOfferAccepted: data.trialOfferAccepted ?? false,
        };
        setUser(userData);
      } else {
        // ✅ Nuevo usuario: 15 días de prueba
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);
        const newUser: UserProfile = {
          uid: userId,
          email: auth.currentUser?.email || '',
          isPro: false,
          isActive: false,
          isTrialActive: true,
          trialEndDate: trialEnd,
          monthlyRecordCount: 0,
          monthlyVoiceCount: 0,
          lastResetDate: new Date(),
          freeRecordsCount: 0,
          onboardingDone: false,
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
