import React from 'react';
import { motion } from 'motion/react';
import { Smartphone, Zap, ShieldCheck, Download, WifiOff, Eye, FileSpreadsheet, FileText } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

// Icono oficial de Google en SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.11C18.232 1.18 15.49 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.83 11.57-11.64 0-.812-.087-1.423-.195-2.075H12.24z" />
  </svg>
);

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden selection:bg-blue-600/30 font-sans">
      
      {/* NAVBAR SUPERIOR */}
      <header className="w-full border-b border-slate-900 bg-[#030712]/80 backdrop-blur-md fixed top-0 left-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 select-none">
            $martMone<span className="text-blue-400">¥</span> <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 ml-1">AI</span>
          </div>
          
          <button 
            onClick={onLogin}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all transform active:scale-95 shadow-md shadow-blue-600/10"
          >
            Iniciar sesión
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
          Registra gastos por voz, recibe asesoría financiera personalizada y proyecta tu libertad financiera — todo en una app que entiende tu idioma.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 w-full sm:w-auto px-4 relative z-10"
        >
          <button 
            onClick={onLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base group"
          >
            <GoogleIcon />
            <span>Empezar gratis con Google</span>
          </button>
          <p className="mt-3 text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sin tarjeta de crédito
          </p>
        </motion.div>
      </section>

      {/* --- SECCIÓN: ASISTENTE DE VOZ (usuario_voz2.jpg) --- */}
      <section className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/40 p-2 md:p-4 backdrop-blur-md shadow-2xl flex justify-center"
        >
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none blur-xl rounded-3xl" />
          
          <img 
            src="/screenshots/usuario_voz2.jpg" 
            alt="Interfaz del Asistente de Voz Financiero" 
            className="w-full h-auto max-w-4xl rounded-2xl object-cover border border-slate-900/80 shadow-inner"
            loading="eager"
          />
        </motion.div>
      </section>

      {/* --- NUEVA SECCIÓN: REPORTES INTELIGENTES (reportes.jpeg) --- */}
      <section className="max-w-6xl mx-auto px-4 py-16 relative z-10 border-t border-slate-900/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Contenido Técnico y Descriptivo */}
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
              Lleva tu contabilidad al siguiente nivel analítico. Genera resúmenes avanzados e historiales consolidados estructurados perfectamente para conciliaciones o análisis externos.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 shrink-0 border border-red-500/10">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold mb-0.5">Exportación PDF de Alta Fidelidad</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Estados financieros limpios, gráficos vectoriales integrados y listos para imprimir o presentar.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/10">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-semibold mb-0.5">Formatos CSV y Excel Compatibles</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Descarga matrices de datos crudos perfectamente tabuladas con tus transacciones para manipular en hojas de cálculo.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Visualización del Screenshot de Reportes */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 relative flex justify-center"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-2 backdrop-blur-sm shadow-xl w-full max-w-2xl">
              <img 
                src="/screenshots/reportes.jpeg" 
                alt="Panel de Generación de Reportes Avanzados en PDF y CSV" 
                className="w-full h-auto rounded-xl object-cover border border-slate-900/50"
                loading="lazy"
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* --- SECCIÓN GALERÍA DE PANTALLAZOS --- */}
      <section className="max-w-7xl mx-auto px-4 py-12 relative border-t border-slate-900/60">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium mb-3">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Interfaz de la Aplicación</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white break-words">
            Tu centro financiero, visualmente impecable
          </h2>
          <p className="text-sm md:text-base text-slate-400 mt-2 max-w-2xl mx-auto">
            Explora las herramientas diseñadas para simplificar tus decisiones financieras cotidianas.
          </p>
        </div>

        {/* Grilla responsiva de 4 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
          
          {/* Tarjeta 1: Dashboard */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col items-center text-center w-full transition-all"
          >
            <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative mb-4">
              <img 
                src="/screenshots/dashboard.jpeg" 
                alt="Dashboard Inteligente de $martMone¥" 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Panel de Control</h3>
            <p className="text-slate-400 text-xs px-1 leading-relaxed">
              Un vistazo claro a tu patrimonio neto, balances actuales y últimas transacciones en tiempo real.
            </p>
          </motion.div>

          {/* Tarjeta 2: Distribución de Gastos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col items-center text-center w-full transition-all"
          >
            <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative mb-4">
              <img 
                src="/screenshots/dist_gastos.jpeg" 
                alt="Distribución de Gastos" 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Análisis de Gastos</h3>
            <p className="text-slate-400 text-xs px-1 leading-relaxed">
              Gráficos inteligentes que clasifican automáticamente tus consumos en categorías claras.
            </p>
          </motion.div>

          {/* Tarjeta 3: Libertad Financiera */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col items-center text-center w-full transition-all"
          >
            <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative mb-4">
              <img 
                src="/screenshots/libertad.jpeg" 
                alt="Simulador de Libertad Financiera" 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Simulador de Libertad</h3>
            <p className="text-slate-400 text-xs px-1 leading-relaxed">
              Proyecta tus metas a largo plazo y calcula con precisión cuántos meses de tranquilidad tienes asegurados.
            </p>
          </motion.div>

          {/* Tarjeta 4: Historial de Movimientos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col items-center text-center w-full transition-all"
          >
            <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative mb-4">
              <img 
                src="/screenshots/movimientos.jpeg" 
                alt="Historial de Movimientos" 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <h3 className="text-white font-semibold text-base mb-1">Historial Inteligente</h3>
            <p className="text-slate-400 text-xs px-1 leading-relaxed">
              Revisa, edita o marca tus gastos fijos como recurrentes para mantener tus cuentas bajo control absoluto.
            </p>
          </motion.div>

        </div>
      </section>

      {/* RELLENO ESPACIO INTERMEDIO */}
      <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col items-center justify-center relative z-10">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogin}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all text-base"
        >
          <GoogleIcon />
          <span>Empezar Gratis con Google</span>
        </motion.button>
      </div>

      {/* --- SECCIÓN PWA --- */}
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
                  Disfruta de la experiencia nativa completa de **$martMone¥ AI** sin pasar por las tiendas de aplicaciones tradicionales. Es 100% compatible con iOS, Android, macOS y Windows.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Acceso en un Toque</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Añade un acceso directo e ícono exclusivo en tu pantalla de inicio para entrar directo sin usar el navegador.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-400 shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Ultra Ligera</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Consume menos de 2MB de almacenamiento del sistema, optimizando drásticamente la batería y recursos.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 shrink-0">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Modo Offline</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Permite consultar tus últimos movimientos, balances esenciales y gráficos clave aun si estás sin cobertura de datos.</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Actualización Instantánea</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Las mejoras del núcleo de IA y parches visuales se instalan en segundo plano automáticamente sin descargas manuales.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* RELLENO ESPACIO INFERIOR */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-4 pb-12 flex flex-col items-center justify-center relative z-10">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogin}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all text-base"
        >
          <GoogleIcon />
          <span>Empezar Gratis con Google</span>
        </motion.button>
      </div>

      {/* FOOTER */}
      <footer className="text-center py-8 border-t border-slate-950 text-xs text-slate-600 max-w-7xl mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} $martMone¥ AI. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}

export default LandingPage;
