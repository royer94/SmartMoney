import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CURRENCIES, Currency, DEFAULT_CURRENCY } from '../types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (code: string, userId?: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    return localStorage.getItem('currency') || DEFAULT_CURRENCY;
  });

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  // Cargar moneda del usuario desde Firestore
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && userDoc.data().currency) {
          const saved = userDoc.data().currency;
          setCurrencyCode(saved);
          localStorage.setItem('currency', saved);
        }
      } catch (e) {
        console.error('[Currency] Error cargando moneda:', e);
      }
    };
    load();
  }, [userId]);

  const setCurrency = async (code: string, uid?: string) => {
    setCurrencyCode(code);
    localStorage.setItem('currency', code);
    // Guardar en Firestore si hay usuario
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', uid), { currency: code });
      } catch (e) {
        console.error('[Currency] Error guardando moneda:', e);
      }
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
