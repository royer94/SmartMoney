// context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserProfile } from '../types';

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => void; // Forzar recarga (opcional)
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
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setUser({ ...data, uid: userId, isAdmin: (data as any).isAdmin || false });
      } else {
        // Crear usuario si no existe (similar a como lo hace useFinance)
        const newUser: UserProfile = {
          uid: userId,
          email: auth.currentUser?.email || '',
          isPro: false,
          freeRecordsCount: 0,
          // Campos de suscripción
          isTrialActive: true,
          trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: false,
          monthlyRecordCount: 0,
          monthlyVoiceCount: 0,
          lastResetDate: new Date(),
        };
        setDoc(userRef, newUser);
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
    // Si se necesita, se puede forzar una recarga manual (ej. recargando la página)
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
