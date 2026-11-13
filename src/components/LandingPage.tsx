import React from 'react';
import { motion } from 'motion/react';
import {
  Smartphone,
  Zap,
  ShieldCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  BrainCircuit,
  Mail,
  MessageCircle,
  BellRing,
  Check,
  Crown,
  Lock,
} from 'lucide-react';
import {
  FREE_TEXT_LIMIT,
  FREE_VOICE_LIMIT,
  TRIAL_DAYS,
  TRIAL_TEXT_LIMIT,
  TRIAL_VOICE_LIMIT,
} from '../types';
import {
  ModuleGalleryPreviews,
  ReportsPreview,
  VoiceAssistantPreview,
} from './LandingPreviews';

interface LandingPageProps {
  onLogin: () => void;
  isLoggingIn?: boolean;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function LandingPage({ onLogin, isLoggingIn = false }: LandingPageProps) {
  const previews = ModuleGalleryPreviews();

  const galleryCards = [
    {
      key: 'dashboard',
      preview: previews.dashboard,
      title: '1. Panel & Comparativa',
      description: 'Balance neto, ingresos, gastos y comparativa mes vs. mes anterior en tiempo real.',
    },
    {
      key: 'savings',
      preview: previews.savings,
      title: '2. Metas de Ahorro',
      description: 'Crea fondos con objetivo y registra abonos rápidos separados de tus presupuestos.',
    },
    {
      key: 'movements',
      preview: previews.movements,
      title: '3. Movimientos Inteligentes',
      description: 'Historial con filtros, fechas naturales y control de gastos fijos o recurrentes.',
    },
    {
      key: 'advisor',
      preview: previews.advisor,
      title: '4. Análisis con IA',
      icon: <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />,
      description: 'Asesoría automática que detecta suscripciones y fugas de dinero.',
    },
    {
      key: 'liberty',
      preview: previews.liberty,
      title: '5. Simulador de Libertad',
      description: 'Proyecta cuándo alcanzarás tu independencia financiera según tu tasa de ahorro.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden selection:bg-blue-600/30 font-sans">
      {/* NAVBAR SUPERIOR */}
      <header className="w-full border-b border-slate-900 bg-[#030712]/80 backdrop-blur-md fixed top-0 left-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 select-none">
            $martMone<span className="text-white">¥</span>{' '}
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-1">
              AI
            </span>
          </div>

          <button
            type="button"
            disabled={isLoggingIn}
            onClick={onLogin}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all transform active:scale-95 shadow-md shadow-blue-600/10"
          >
            {isLoggingIn ? 'Conectando...' : 'Iniciar sesión'}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 pt-32 pb-12 flex flex-col items-center text-center">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-950/40 border border-blue-800/30 text-blue-400 text-xs md:text-sm font-medium mb-8 backdrop-blur-sm relative z-10"
        >
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Inteligencia Artificial + Finanzas Personales</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-400 max-w-4xl mx-auto leading-[1.15] break-words px-2 relative z-10"
        >
          Tu dinero, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">más inteligente</span> que nunca
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed break-words px-4 relative z-10"
        >
          Registra gastos por voz o texto, controla tus metas de ahorro y proyecta tu libertad financiera — todo en una app que entiende tu idioma.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-full sm:w-auto px-4 relative z-10"
        >
          <button
            type="button"
            disabled={isLoggingIn}
            onClick={onLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base group"
          >
            <GoogleIcon />
            <span>{isLoggingIn ? 'Conectando con Google...' : 'Empezar gratis con Google'}</span>
          </button>
          <p className="mt-3 text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {TRIAL_DAYS} días Pro gratis al registrarte · Sin tarjeta de crédito
          </p>
        </motion.div>
      </section>

      {/* --- SECCIÓN: ASISTENTE DE VOZ EN VIVO --- */}
      <section className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/40 p-3 md:p-5 backdrop-blur-md shadow-2xl flex justify-center"
        >
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none blur-xl rounded-3xl" />
          <VoiceAssistantPreview />
        </motion.div>
      </section>

      {/* --- SECCIÓN GALERÍA DE MÓDULOS ACTUALES --- */}
      <section className="max-w-[90rem] mx-auto px-4 py-12 relative border-t border-slate-900/60">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium mb-3">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Interfaz Actual</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white break-words">
            Tu centro financiero, visualmente impecable
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-2 max-w-2xl mx-auto">
            Explora las herramientas diseñadas para simplificar tus decisiones financieras cotidianas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 justify-items-center">
          {galleryCards.map((card) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col items-center text-center w-full transition-all"
            >
              <div className="w-full aspect-[9/14] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative mb-4">
                {card.preview}
              </div>
              <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-1 justify-center">
                {card.icon}
                {card.title}
              </h3>
              <p className="text-slate-400 text-xs px-1 leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- SECCIÓN: REPORTES INTELIGENTES --- */}
      <section className="max-w-6xl mx-auto px-4 py-16 relative z-10 border-t border-slate-900/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              Auditoría y Control
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight break-words">
              Reportes detallados listos para exportar
            </h2>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed break-words">
              Genera resúmenes mensuales, trimestrales o anuales listos para revisar tus presupuestos, conciliaciones o compartir con tu contador.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0 border border-red-500/10">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold mb-0.5">Exportación PDF de Alta Fidelidad</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Estados financieros limpios, tablas por categoría y cumplimiento de presupuestos.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/10">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold mb-0.5">Formatos CSV y Excel Compatibles</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Descarga tus movimientos tabulados para analizarlos en hojas de cálculo.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 relative flex justify-center"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <ReportsPreview />
          </motion.div>
        </div>
      </section>

      {/* --- SECCIÓN: PLANES CLAROS --- */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-slate-900/60">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
            Empieza gratis, escala cuando quieras
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-2">
            Al crear tu cuenta recibes {TRIAL_DAYS} días de acceso Pro ({TRIAL_TEXT_LIMIT} textos y {TRIAL_VOICE_LIMIT} audios). Luego eliges seguir en Free o pasar a Pro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-7 space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan Free</span>
              <p className="text-3xl font-extrabold text-white mt-1">$0 <span className="text-sm font-normal text-slate-400">/ mes</span></p>
            </div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> {FREE_TEXT_LIMIT} textos y {FREE_VOICE_LIMIT} audios al mes</li>
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 1 presupuesto mensual y Metas de Ahorro</li>
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Comparativa mes vs. mes anterior</li>
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Recordatorios diarios por notificación push</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-blue-500/40 bg-gradient-to-br from-blue-950/60 to-slate-950 p-7 space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Crown className="w-4 h-4" /> Plan Pro
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30">
                {TRIAL_DAYS} días gratis al iniciar
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white">
              Desde $19.900 <span className="text-sm font-normal text-slate-300">COP / mes</span>
            </p>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-400 shrink-0" /> Registros por texto y voz ilimitados</li>
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-400 shrink-0" /> Presupuestos ilimitados + Detección de suscripciones</li>
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-400 shrink-0" /> Asesor IA, Simulador de Libertad e Historial anual</li>
              <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-400 shrink-0" /> Exportación completa a PDF y CSV + Modo Privacidad</li>
            </ul>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN PWA (4 TARJETAS EQUILIBRADAS) --- */}
      <section className="border-t border-slate-900 bg-gradient-to-b from-[#030712] to-[#050b18] py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/40 p-8 md:p-12 backdrop-blur-md">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                  Multiplataforma
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight break-words">
                  Instálalo en cualquier dispositivo
                </h2>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed break-words">
                  Disfruta de la experiencia nativa completa de <strong className="text-white">$martMone¥ AI</strong> sin pasar por las tiendas de aplicaciones tradicionales. Compatible con iOS, Android, macOS y Windows.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Acceso en un Toque</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Añade el ícono en tu pantalla de inicio para entrar directo sin abrir el navegador.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-400 shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Ultra Ligera</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Consume menos de 2MB de almacenamiento y cuida tu batería.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Actualización Instantánea</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Mejoras y parches se aplican automáticamente sin descargas manuales.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Recordatorios Push</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Avisos al final del día y resúmenes semanales para no olvidar ningún gasto.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONFIANZA Y CTA INFERIOR */}
      <section className="max-w-4xl mx-auto px-4 pt-4 pb-12 text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>No pedimos claves ni conexiones bancarias · Tus datos están protegidos por Firebase</span>
        </div>

        <div>
          <motion.button
            type="button"
            disabled={isLoggingIn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all text-base"
          >
            <GoogleIcon />
            <span>{isLoggingIn ? 'Conectando con Google...' : 'Empezar Gratis con Google'}</span>
          </motion.button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-gradient-to-b from-slate-950/80 to-slate-950/40 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-5">
            <a
              href="mailto:contacto@smartmoneyai.click"
              className="group flex items-center gap-4 px-6 py-4 rounded-full border border-white/8 bg-white/4 hover:bg-blue-500/12 hover:border-blue-500/35 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-full bg-blue-500/15 group-hover:bg-blue-500/25 flex items-center justify-center shrink-0 transition-colors duration-300">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Correo</p>
                <p className="text-sm text-blue-300 font-medium">contacto@smartmoneyai.click</p>
              </div>
            </a>

            <a
              href="https://wa.me/573209131046?text=Hola%2C%20quiero%20saber%20m%C3%A1s%20sobre%20SmartMoney%20AI"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 px-6 py-4 rounded-full border border-white/8 bg-white/4 hover:bg-green-500/12 hover:border-green-500/35 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-full bg-green-500/12 group-hover:bg-green-500/22 flex items-center justify-center shrink-0 transition-colors duration-300">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">WhatsApp</p>
                <p className="text-sm text-green-300 font-medium">Soporte inmediato</p>
              </div>
            </a>
          </div>
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} SmartMoney AI. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
