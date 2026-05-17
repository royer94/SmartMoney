import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CURRENCIES, Currency, DEFAULT_CURRENCY } from '../types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (code: string, userId?: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Detectar moneda según el navegador
const detectCurrency = (): string => {
  try {
    const locale = navigator.language || 'es-CO';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timezone.includes('Mexico') || locale.startsWith('es-MX')) return 'MXN';
    if (timezone.includes('Argentina') || locale.startsWith('es-AR')) return 'ARS';
    if (timezone.includes('Santiago') || locale.startsWith('es-CL')) return 'CLP';
    if (timezone.includes('Lima') || locale.startsWith('es-PE')) return 'PEN';
    if (timezone.includes('Montevideo') || locale.startsWith('es-UY')) return 'UYU';
    if (timezone.includes('Asuncion') || locale.startsWith('es-PY')) return 'PYG';
    if (timezone.includes('La_Paz') || locale.startsWith('es-BO')) return 'BOB';
    if (timezone.includes('Costa_Rica') || locale.startsWith('es-CR')) return 'CRC';
    if (timezone.includes('Guatemala') || locale.startsWith('es-GT')) return 'GTQ';
    if (timezone.includes('Guayaquil') || timezone.includes('Caracas') || timezone.includes('Panama')) return 'USD';
    if (locale.startsWith('en-US')) return 'USD';
    if (locale.startsWith('es-ES') || locale.startsWith('fr') || locale.startsWith('de')) return 'EUR';
    return DEFAULT_CURRENCY; // COP por defecto
  } catch {
    return DEFAULT_CURRENCY;
  }
};

export function CurrencyProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    // 1. Si ya tiene una guardada en localStorage, usarla
    const saved = localStorage.getItem('currency');
    if (saved) return saved;
    // 2. Si no, detectar automáticamente
    const detected = detectCurrency();
    localStorage.setItem('currency', detected);
    return detected;
  });

  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  // Cargar moneda del usuario desde Firestore (tiene prioridad sobre detección)
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists() && userDoc.data().currency) {
          const saved = userDoc.data().currency;
          setCurrencyCode(saved);
          localStorage.setItem('currency', saved);
        } else {
          // Primera vez — guardar la moneda detectada en Firestore
          const detected = localStorage.getItem('currency') || detectCurrency();
          await updateDoc(doc(db, 'users', userId), { currency: detected }).catch(() => {});
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
