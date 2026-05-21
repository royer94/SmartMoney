{/* --- SECCIÓN GALERÍA DE PANTALLAZOS CORREGIDA (.JPEG) --- */}
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

  {/* Grilla responsiva adaptada a tus 4 archivos reales */}
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
        Proyecta tus metas a largo plazo y calcula con precisión cuántos meses de tranquilidad financiera tienes asegurados.
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
