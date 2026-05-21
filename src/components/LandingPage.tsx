import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, BrainCircuit, TrendingUp, Shield, 
  Zap, ChevronDown, Star, Check, X,
  Smartphone, ShieldCheck, Download, HelpCircle
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export function LandingPage({ onLogin, isLoggingIn }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showPwaSteps, setShowPwaSteps] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // Detectar plataforma del usuario para personalizar la guía de instalación
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Capturar el evento nativo de instalación de la PWA (Chrome / Android / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (platform === 'ios') {
      setShowPwaSteps(true);
      return;
    }

    if (!deferredPrompt) {
      setShowPwaSteps(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const features = [
    {
      icon: Mic,
      color: 'bg-blue-500',
      title: 'Registra por voz o texto',
      description: 'Di "Gasté 20 mil en almuerzo" y la IA detecta, categoriza y registra automáticamente en segundos.'
    },
    {
      icon: BrainCircuit,
      color: 'bg-purple-500',
      title: 'Asesor financiero IA',
      description: 'Análisis profundo de tus hábitos, predicciones de fin de mes y consejos personalizados basados en tus datos reales.'
    },
    {
      icon: TrendingUp,
      color: 'bg-emerald-500',
      title: 'Simulador de libertad financiera',
      description: 'Calcula exactamente cuánto necesitas ahorrar para vivir de tus rentas. Proyecta tu retiro con datos reales.'
    },
    {
      icon: Shield,
      color: 'bg-amber-500',
      title: 'Presupuestos inteligentes',
      description: 'Crea límites de gasto mensuales por categoría. Recibe alertas cuando te acerques al límite.'
    }
  ];

  const faqs = [
    {
      q: '¿Es segura mi información financiera?',
      a: 'Sí. Tus datos se almacenan en Firebase con cifrado de nivel bancario. Nunca compartimos tu información con terceros.'
    },
    {
      q: '¿Cómo instalo la aplicación en mi celular o computadora?',
      a: 'SmartMone¥ es una PWA (Progressive Web App). No requiere ir a la App Store o Play Store. Solo dale click al botón "Instalar App" en esta página o selecciona "Añadir a la pantalla de inicio" desde el menú de tu navegador para usarla de forma nativa a pantalla completa.'
    },
    {
      q: '¿Puedo cancelar el plan Pro en cualquier momento?',
      a: 'Sí, sin contratos ni permanencia. El plan Pro se renueva mensualmente y puedes cancelar cuando quieras.'
    },
    {
      q: '¿Funciona para cualquier moneda latinoamericana?',
      a: 'Sí. Soportamos COP, MXN, ARS, CLP, PEN, UYU, BOB, CRC, GTQ, USD y EUR. La app detecta tu moneda automáticamente.'
    },
    {
      q: '¿La IA entiende español coloquial?',
      a: 'Totalmente. Puedes decir "me gasté 50 pesos en el super" o "recibí el sueldo hoy" y la IA entiende perfectamente.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white overflow-x-hidden">
      
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <img src="/SM_icon.png" alt="SmartMone¥" className="w-8 h-8 rounded-xl" />
          <span className="font-black text-xl tracking-tight">$martMone¥<span className="text-blue-400 italic">AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePwaInstall}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-medium text-xs transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            Instalar App
          </button>
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
          >
            {isLoggingIn ? 'Cargando...' : 'Iniciar sesión'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(37,99,235,0.15),transparent_70%)]" />
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Inteligencia Artificial + Finanzas Personales
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
            Tu dinero,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              más inteligente
            </span>{' '}
            que nunca
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Registra gastos por voz al instante instalando la app directa en tu pantalla de inicio. Olvídate de las tiendas de aplicaciones tradicionales y la fricción del navegador.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="G" />
              )}
              {isLoggingIn ? 'Cargando...' : 'Empezar gratis con Google'}
            </button>
            
            <button
              onClick={handlePwaInstall}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-base transition-all active:scale-95 text-slate-200"
            >
              <Download className="w-5 h-5 text-blue-400" />
              {platform === 'ios' ? 'Cómo instalar en iPhone' : 'Instalar App Oficial'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              <span className="ml-1">4.9/5</span>
            </div>
            <span>•</span>
            <span>Acceso Instantáneo PWA</span>
            <span>•</span>
            <span>100% en español</span>
          </div>
        </motion.div>

        {/* App screenshots */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 mt-16 w-full max-w-5xl mx-auto"
        >
          <div className="flex justify-center items-end gap-4 overflow-hidden">
            <div className="hidden md:block w-52 rounded-3xl overflow-hidden border border-white/10 shadow-2xl transform -rotate-3 translate-y-4 opacity-70">
              <img src="/screenshots/dist_gastos.jpeg" alt="Distribución de gastos" className="w-full" />
            </div>
            <div className="w-64 md:w-72 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/10 transform scale-105">
              <img src="/screenshots/dashboard.jpeg" alt="Dashboard principal" className="w-full" />
            </div>
            <div className="hidden md:block w-52 rounded-3xl overflow-hidden border border-white/10 shadow-2xl transform rotate-3 translate-y-4 opacity-70">
              <img src="/screenshots/libertad.jpeg" alt="Libertad financiera" className="w-full" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0f1e] to-transparent" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Todo lo que necesitas para{' '}
            <span className="text-blue-400">controlar tu dinero</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Diseñado para personas reales, no para contadores. Simple, rápido y poderoso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all group"
            >
              <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NUEVA SECCIÓN: Optimizada Prioridad de Instalación PWA */}
      <section className="py-20 px-6 bg-gradient-to-b from-white/[0.01] to-white/[0.03] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" /> Experiencia Fluida e Inmersiva
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Instala <span className="text-blue-400">$martMone¥</span> y úsala como una App nativa
            </h2>
            <p className="text-slate-400 leading-relaxed">
              No busques en tiendas ni gastes espacio en almacenamiento pesado. Añade la aplicación a tu celular en 3 segundos de manera oficial y dile adiós a las pestañas del navegador.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl mt-0.5">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Grabación por voz sin interrupciones</h4>
                  <p className="text-sm text-slate-400">Abre la app desde tu pantalla de inicio y registra tus movimientos de inmediato al hablar, sin esperas de recarga.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl mt-0.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Pantalla completa dedicada</h4>
                  <p className="text-sm text-slate-400">Oculta las barras del navegador web para tener una experiencia completamente inmersiva, limpia y libre de zooms accidentales.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Liviana y siempre actualizada</h4>
                  <p className="text-sm text-slate-400">Ocupa menos de 2MB de memoria y se actualiza sola automáticamente en segundo plano de forma segura.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={handlePwaInstall}
                className="px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-3 group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                {platform === 'ios' ? 'Ver pasos para iPhone' : 'Instalar en un toque'}
              </button>
              <button 
                onClick={() => setShowPwaSteps(!showPwaSteps)}
                className="px-5 py-4 bg-white/5 text-slate-300 font-medium rounded-2xl hover:bg-white/10 transition-colors flex items-center gap-2 text-sm border border-white/10"
              >
                <HelpCircle className="w-4 h-4" /> ¿Cómo funciona?
              </button>
            </div>
          </div>

          {/* Animación Guía Desplegable PWA */}
          <div className="flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {showPwaSteps ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4"
                >
                  <h3 className="font-bold text-base text-slate-200">Pasos según tu sistema:</h3>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-[#0a0f1e] rounded-xl border border-white/5">
                      <span className="text-blue-400 font-bold block mb-1"> iOS / iPhone (Safari)</span>
                      Presiona el botón de <span className="text-blue-400 font-bold">Compartir ↑</span> abajo en tu navegador y selecciona <span className="text-white font-medium">"Añadir a la pantalla de inicio"</span>.
                    </div>
                    <div className="p-3 bg-[#0a0f1e] rounded-xl border border-white/5">
                      <span className="text-emerald-400 font-bold block mb-1">🤖 Android (Chrome)</span>
                      Toca el botón "Instalar en un toque" o pulsa los 3 puntos superiores de tu navegador y elige <span className="text-white font-medium">"Instalar aplicación"</span>.
                    </div>
                    <div className="p-3 bg-[#0a0f1e] rounded-xl border border-white/5">
                      <span className="text-purple-400 font-bold block mb-1">💻 Escritorio (Chrome/Edge)</span>
                      Haz clic en el ícono de descarga que aparece en la parte derecha superior de tu <span className="text-white font-medium">barra de direcciones URL</span>.
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative w-[260px] h-[480px] bg-slate-950 rounded-[36px] border-[8px] border-slate-800 shadow-2xl overflow-hidden mx-auto"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-b-xl z-30" />
                  <div className="absolute inset-0 bg-slate-900 p-4 pt-8 flex flex-col justify-between text-center">
                    <div className="space-y-3 mt-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center font-black text-xl shadow-lg">
                        $M
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">$martMone¥</h3>
                        <p className="text-[10px] text-slate-500">Asistente Financiero Pro</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-3 rounded-2xl space-y-2 mb-2 animate-pulse">
                      <p className="text-[10px] text-slate-300 font-medium">¿Añadir a la pantalla de inicio?</p>
                      <div className="flex gap-2 justify-center">
                        <div className="px-2 py-1 bg-white/10 text-[9px] font-bold rounded-lg text-slate-400">Cancelar</div>
                        <div className="px-2 py-1 bg-blue-600 text-[9px] font-bold rounded-lg text-white">Instalar</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Screenshots showcase */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Diseñada para el <span className="text-blue-400">mundo real</span>
            </h2>
            <p className="text-slate-400 text-lg">Así se ve SmartMone¥ en acción</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { src: '/screenshots/dashboard.jpeg', label: 'Dashboard' },
              { src: '/screenshots/dist_gastos.jpeg', label: 'Análisis de gastos' },
              { src: '/screenshots/movimientos.jpeg', label: 'Movimientos' },
              { src: '/screenshots/libertad.jpeg', label: 'Libertad financiera' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl overflow-hidden border border-white/10 shadow-xl"
              >
                <img src={s.src} alt={s.label} className="w-full" />
                <div className="p-3 text-center text-xs text-slate-400 font-medium bg-white/5">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Precios <span className="text-blue-400">simples y justos</span>
          </h2>
          <p className="text-slate-400 text-lg">Empieza gratis, mejora cuando quieras</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
            <div className="mb-6">
              <h3 className="text-2xl font-black mb-1">Free</h3>
              <div className="text-4xl font-black">$0<span className="text-lg text-slate-400 font-normal">/mes</span></div>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Hasta 20 registros al mes',
                '1 presupuesto mensual',
                'IA para registrar gastos',
                'Dashboard con gráficas',
                'Acceso desde cualquier dispositivo',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
              {[
                'Reportes PDF y CSV',
                'Asesor IA avanzado',
                'Simulador de libertad',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-600">
                  <X className="w-5 h-5 text-slate-700 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={onLogin}
              className="w-full py-4 border border-white/20 hover:bg-white/5 rounded-2xl font-bold transition-all active:scale-95"
            >
              Empezar gratis
            </button>
          </div>

          {/* Pro */}
          <div className="p-8 rounded-3xl bg-blue-600 border border-blue-500 relative overflow-hidden">
            <div className="absolute top-4 right-4 px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-black uppercase">
              Más popular
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-black mb-1">Pro</h3>
              <div className="text-4xl font-black">$4.99<span className="text-lg text-blue-200 font-normal"> USD/mes</span></div>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                'Registros ilimitados',
                'Presupuestos ilimitados',
                'Asesor financiero IA avanzado',
                'Simulador de libertad financiera',
                'Reportes PDF y CSV',
                'Historial de flujo de 6 meses',
                'Modo privacidad',
                'Soporte prioritario',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white">
                  <Check className="w-5 h-5 text-blue-200 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={onLogin}
              className="w-full py-4 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-black transition-all active:scale-95 shadow-xl"
            >
              Empezar con Pro
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tight mb-4">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-semibold pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-slate-400 leading-relaxed border-t border-white/5 pt-4 whitespace-pre-line">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
            Toma el control de tu dinero{' '}
            <span className="text-blue-400">hoy mismo</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Únete a miles de personas que ya gestionan sus finanzas instalando su app con un solo click.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95"
            >
              {isLoggingIn ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-6 h-6 bg-white rounded-full p-0.5" alt="G" />
              )}
              {isLoggingIn ? 'Cargando...' : 'Empezar gratis ahora'}
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-4">Sin tarjeta de crédito · Instálala como PWA</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src="/SM_icon.png" alt="SmartMone¥" className="w-6 h-6 rounded-lg" />
          <span className="font-bold text-white">$martMone¥AI</span>
        </div>
        <p>© 2026 SmartMone¥ AI · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
