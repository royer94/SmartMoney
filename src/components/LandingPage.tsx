import React from 'react';
import { motion } from 'motion/react';
import { Smartphone, Zap, ShieldCheck, Download, WifiOff, Eye } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

// Exportación nombrada para satisfacer el "import { LandingPage }" de tu App.tsx
export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden selection:bg-blue-600/30 font-sans">
      
      {/* HERO SECTION - PROTEGIDO CONTRA DESBORDAMIENTO */}
      <section className="relative max-w-7xl mx-auto px-4 pt-24 pb-12 flex flex-col items-center text-center">
        {/* Efecto de luz difusa en el fondo del Hero */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge de IA */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-950/40 border border-blue-800/30 text-blue-400 text-xs md:text-sm font-medium mb-8 backdrop-blur-sm relative z-10"
        >
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Inteligencia Artificial + Finanzas Personales</span>
        </motion.div>

        {/* Título Principal */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-400 max-w-4xl mx-auto leading-[1.15] break-words px-2 relative z-10"
        >
          Tu dinero, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">más inteligente</span> que nunca
        </motion.h1>

        {/* Subtítulo */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed break-words px-4 relative z-10"
        >
          Registra gastos por voz, recibe asesoría financiera personalizada y proyecta tu libertad financiera — todo en una app que entiende tu idioma.
        </motion.p>

        {/* Botón Principal */}
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
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22l.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Empezar gratis con Google</span>
          </button>
          <p className="mt-3 text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sin tarjeta de crédito
          </p>
        </motion.div>
      </section>

      {/* --- SECCIÓN GALERÍA DE PANTALLAZOS (.JPEG CONECTADOS) --- */}
      <section className="max-w-7xl mx-auto px-4 py-16 relative">
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

        {/* Grilla responsiva de 4 columnas inmune a desbordamientos horizontales */}
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

      {/* --- SECCIÓN PWA: INSTALABLE Y VENTAJAS CLAVE --- */}
      <section className="border-t border-slate-900 bg-gradient-to-b from-[#030712] to-[#050b18] py-20 px-4">
        <div className="max-w-5xl mx-auto">
          
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/40 p-8 md:p-12 backdrop-blur-md">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Bloque Izquierdo */}
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

              {/* Bloque Derecho: Ventajas */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Ventaja 1 */}
                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Acceso en un Toque</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Añade un acceso directo e ícono exclusivo en tu pantalla de inicio para entrar directo sin usar el navegador.</p>
                  </div>
                </div>

                {/* Ventaja 2 */}
                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-400 shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Ultra Ligera</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Consume menos de 2MB de almacenamiento del sistema, optimizando drásticamente la batería y recursos.</p>
                  </div>
                </div>

                {/* Ventaja 3 */}
                <div className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex gap-4 items-start">
                  <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 shrink-0">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-1">Modo Offline</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">Permite consultar tus últimos movimientos, balances esenciales y gráficos clave aun si estás sin cobertura de datos.</p>
                  </div>
                </div>

                {/* Ventaja 4 */}
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

      {/* FOOTER */}
      <footer className="text-center py-8 border-t border-slate-950 text-xs text-slate-600 max-w-7xl mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} $martMone¥ AI. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}

// Exportación por defecto añadida como soporte extra en caso de fallos de Rollup/Vite
export default LandingPage;
