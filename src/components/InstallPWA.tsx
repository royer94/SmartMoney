import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Escuchar el evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // No mostrar el banner si ya está instalado o si el usuario lo descartó recientemente
      const lastDismiss = localStorage.getItem('pwa_banner_dismissed_at');
      let shouldShow = true;
      if (lastDismiss) {
        const hoursSince = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60);
        if (hoursSince < 48) shouldShow = false;
      }
      if (!window.matchMedia('(display-mode: standalone)').matches && shouldShow && !dismissed) {
        setShowBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario instaló la PWA');
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    });
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
  };

  // No mostrar el banner si ya está en modo standalone (es decir, ya instalado)
  if (window.matchMedia('(display-mode: standalone)').matches) return null;

  // Si el banner fue descartado hace menos de 48 horas, no mostrar
  const lastDismiss = localStorage.getItem('pwa_banner_dismissed_at');
  if (lastDismiss) {
    const hoursSince = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60);
    if (hoursSince < 48) return null;
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 backdrop-blur-lg bg-white/90"
        >
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-blue-100 rounded-xl shrink-0">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-slate-800">Instala SmartMoney AI</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Acceso rápido desde tu pantalla de inicio, funciona sin conexión y notificaciones (próximamente).
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  Instalar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1 -mt-1 -mr-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
