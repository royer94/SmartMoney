import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCIES, DEFAULT_CURRENCY } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode?: string) {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('currency') : null;
  const code = currencyCode || saved || DEFAULT_CURRENCY;
  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: any, currencyCode?: string) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);

  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('currency') : null;
  const code = currencyCode || saved || DEFAULT_CURRENCY;
  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  return new Intl.DateTimeFormat(currency.locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}
