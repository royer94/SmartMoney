import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCIES, DEFAULT_CURRENCY } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode?: string) {
  const code = currencyCode || localStorage.getItem('currency') || DEFAULT_CURRENCY;
  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  // Monedas sin decimales
  const noDecimals = ['COP', 'CLP', 'PYG', 'CRC'];
  const minimumFractionDigits = noDecimals.includes(code) ? 0 : 2;

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  }).format(amount);
}

export function formatDate(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}
