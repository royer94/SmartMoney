import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mic, BrainCircuit, TrendingUp, Shield, 
  Zap, ChevronDown, Star, Check, X
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export function LandingPage({ onLogin, isLoggingIn }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      q: '¿Funciona en mi celular sin instalar nada?',
      a: 'SmartMone¥ es una PWA — funciona en cualquier navegador. Puedes agregarla a tu pantalla de inicio para una experiencia nativa.'
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
        <button
          onClick={onLogin}
          disabled={isLoggingIn}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all active:scale-95"
        >
          {isLoggingIn ? 'Cargando...' : 'Iniciar sesión'}
        </button>
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
            Registra gastos por voz, recibe asesoría financiera personalizada y proyecta tu libertad financiera — todo en una app que entiende tu idioma.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 transition-all active:scale-95"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 bg-white rounded-full p-0.5" alt="G" />
              )}
              {isLoggingIn ? 'Cargando...' : 'Empezar gratis con Google'}
            </button>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Check className="w-4 h-4 text-emerald-400" />
              Sin tarjeta de crédito
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              <span className="ml-1">4.9/5</span>
            </div>
            <span>•</span>
            <span>Disponible en Latinoamérica</span>
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

      {/* Screenshots showcase */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
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
                <div className="px-6 pb-6 text-slate-400 leading-relaxed border-t border-white/5 pt-4">
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
            Únete a miles de personas que ya gestionan sus finanzas de forma inteligente.
          </p>
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xl shadow-2xl shadow-blue-600/30 transition-all active:scale-95 mx-auto"
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-6 h-6 bg-white rounded-full p-0.5" alt="G" />
            )}
            {isLoggingIn ? 'Cargando...' : 'Empezar gratis ahora'}
          </button>
          <p className="text-slate-500 text-sm mt-4">Sin tarjeta de crédito · Cancela cuando quieras</p>
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
