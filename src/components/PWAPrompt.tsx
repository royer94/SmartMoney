import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PWAPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/android/.test(ua)) {
      setPlatform('android');
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // Show only if not installed and hasn't been dismissed recently
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (!isStandalone && !dismissed) {
      // Show prompt after 1.5 seconds instead of 3
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
        >
          <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-slate-700/50 backdrop-blur-xl relative overflow-hidden">
            <button 
              onClick={dismiss}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>

            <div className="flex items-start gap-4 pr-6">
              <div className="p-3 bg-blue-600 rounded-2xl">
                <Download className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Instala SmartMone¥ AI</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para una mejor experiencia, añade la app a tu pantalla de inicio.
                </p>
                
                <div className="mt-3 pt-3 border-t border-white/10">
                  {platform === 'ios' ? (
                    <p className="text-[10px] text-slate-400 flex items-center gap-2">
                      Toca <Share className="w-3 h-3" /> y luego "Añadir a pantalla de inicio"
                    </p>
                  ) : platform === 'android' ? (
                    <p className="text-[10px] text-slate-400">
                      Toca los tres puntos <span className="font-bold italic">⋮</span> y luego "Instalar aplicación"
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Usa las opciones de tu navegador para instalar como aplicación.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
