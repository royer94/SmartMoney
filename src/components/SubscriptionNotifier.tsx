import React, { useEffect, useState } from 'react';
import { Bell, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface SubscriptionNotifierProps {
  user: UserProfile;
}

export function SubscriptionNotifier({ user }: SubscriptionNotifierProps) {
  const [alert, setAlert] = useState<{ type: 'warning' | 'reminder', message: string } | null>(null);

  useEffect(() => {
    if (!user.proExpiresAt) return;

    const expiryDate = new Date(user.proExpiresAt);
    const now = new Date();
    
    // Calculate difference in days
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (user.isPro) {
      // Pro active: check if expiring soon (within 3 days)
      if (diffDays <= 3 && diffDays > 0) {
        setAlert({
          type: 'warning',
          message: `Tu suscripción Pro vence en ${diffDays} ${diffDays === 1 ? 'día' : 'días'}. ¡Renuévala para no perder tus beneficios!`
        });
      } else if (diffDays <= 0) {
        // Technically expired but flag isPro might still be true in state until next refresh
        setAlert({
          type: 'warning',
          message: `Tu suscripción Pro ha vencido. ¡Renuévala ahora!`
        });
      }
    } else {
      // Not Pro: check if it's been expired for multiples of 3 days
      // We only show this if they WERE pro once (proExpiresAt exists)
      const daysSinceExpiry = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
      
      if (daysSinceExpiry > 0 && daysSinceExpiry % 3 === 0) {
        // Show every 3 days
        setAlert({
          type: 'reminder',
          message: 'Tu plan Pro terminó. Regresa para disfrutar de registros ilimitados y funciones avanzadas.'
        });
      }
    }
  }, [user.isPro, user.proExpiresAt]);

  if (!alert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-6 left-4 right-4 z-[110] md:left-auto md:right-6 md:max-w-md"
      >
        <div className={cn(
          "p-4 rounded-2xl shadow-2xl border flex items-start gap-4 backdrop-blur-xl transition-colors",
          alert.type === 'warning' 
            ? "bg-amber-50 border-amber-200 text-amber-900" 
            : "bg-indigo-50 border-indigo-200 text-indigo-900"
        )}>
          <div className={cn(
            "p-2 rounded-xl transition-colors shrink-0",
            alert.type === 'warning' ? "bg-amber-200 text-amber-600" : "bg-indigo-200 text-indigo-600"
          )}>
            {alert.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">
              {alert.type === 'warning' ? 'Aviso de Vencimiento' : 'Recordatorio de Plan'}
            </p>
            <p className="text-sm font-medium leading-snug">
              {alert.message}
            </p>
          </div>

          <button 
            onClick={() => setAlert(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 opacity-40 hover:opacity-100" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function for component
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
