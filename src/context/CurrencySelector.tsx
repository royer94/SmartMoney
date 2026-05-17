import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCIES } from '../types';
import { cn } from '../lib/utils';

export function CurrencySelector({ userId }: { userId?: string }) {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (code: string) => {
    setCurrency(code, userId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currency.flag}</span>
          <div className="text-left">
            <p className="font-semibold text-slate-900">{currency.code} — {currency.name}</p>
            <p className="text-xs text-slate-400">{currency.countries}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 max-h-80 overflow-y-auto">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleSelect(c.code)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left",
                c.code === currency.code && "bg-blue-50 text-blue-600"
              )}
            >
              <span className="text-xl">{c.flag}</span>
              <div>
                <p className="font-semibold text-sm">{c.code} — {c.name}</p>
                <p className="text-xs text-slate-400">{c.countries}</p>
              </div>
              {c.code === currency.code && (
                <span className="ml-auto text-blue-600 font-bold text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
