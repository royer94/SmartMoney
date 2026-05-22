import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Detectar si es iOS (Safari)
  const isIOS = () => {
    const userAgent = window.navigator.userAgent;
    return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  };

  useEffect(() => {
    // Evento para Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const lastDismiss = localStorage.getItem('pwa_banner_dismissed_at');
      let shouldShow = true;
      if (lastDismiss) {
        const hoursSince = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60);
        if (hoursSince < 48) shouldShow = false;
      }
      if (!window.matchMedia('(display-mode: standalone)').matches && shouldShow && !dismissed) {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Para iOS, mostrar aviso manual si no está instalado
    if (isIOS() && !window.matchMedia('(display-mode: standalone)').matches) {
      const iosDismissed = localStorage.getItem('ios_instructions_dismissed');
      if (!iosDismissed) {
        // Pequeño retardo para no molestar al inicio
        setTimeout(() => setShowIOSInstructions(true), 2000);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuario instaló la PWA');
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    });
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
  };

  const handleDismissIOS = () => {
    setShowIOSInstructions(false);
    localStorage.setItem('ios_instructions_dismissed', 'true');
  };

  // No mostrar banners si ya está en modo standalone (instalado)
  if (window.matchMedia('(display-mode: standalone)').matches) return null;

  return (
    <AnimatePresence>
      {/* Banner para Android/Chrome */}
      {showInstallBanner && (
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
                Acceso rápido desde tu pantalla de inicio, funciona sin conexión y notificaciones.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                >
                  Instalar
                </button>
                <button
                  onClick={handleDismissInstall}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={handleDismissInstall} className="p-1 -mt-1 -mr-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Tooltip / aviso para iOS (Safari) */}
      {showIOSInstructions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4"
        >
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-gray-100 rounded-xl shrink-0">
              <Smartphone className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-slate-800">Instalar en iPhone/iPad</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Para agregar esta app a tu pantalla de inicio:
              </p>
              <ol className="text-xs text-slate-600 list-decimal list-inside mt-2 space-y-1">
                <li>Abre en <strong>Safari</strong> (no en Chrome).</li>
                <li>Toca el ícono <strong>Compartir ↑</strong> en la barra inferior.</li>
                <li>Desplázate y elige <strong>Agregar a pantalla de inicio</strong>.</li>
                <li>Toca <strong>Agregar</strong> para confirmar.</li>
              </ol>
              <button
                onClick={handleDismissIOS}
                className="mt-3 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all w-full"
              >
                Entendido
              </button>
            </div>
            <button onClick={handleDismissIOS} className="p-1 -mt-1 -mr-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
