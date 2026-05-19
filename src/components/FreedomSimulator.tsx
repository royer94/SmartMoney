{/* Rentabilidad */}
<div className="space-y-4">
  <div className="flex justify-between items-center">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
      <TrendingUp className="w-3.5 h-3.5" /> Rentabilidad Anual (Nominal)
    </label>
    <div className="flex items-center gap-1">
      <input 
        type="number" step="0.1"
        value={returnRate} 
        onChange={(e) => setReturnRate(Number(e.target.value))}
        className="w-16 text-right font-bold text-emerald-600 bg-transparent border-b border-slate-200 focus:border-emerald-500 outline-none text-sm transition-colors"
      />
      <span className="text-sm font-bold text-emerald-600">%</span>
    </div>
  </div>
  <input 
    type="range" min="1" max="25" step="0.5"
    value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))}
    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-colors"
  />
</div>

{/* Inflación Estimada */}
<div className="space-y-4">
  <div className="flex justify-between items-center">
    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
      <Flame className="w-3.5 h-3.5" /> Inflación Anual Estimada
    </label>
    <div className="flex items-center gap-1">
      <input 
        type="number" step="0.1"
        value={inflationRate} 
        onChange={(e) => setInflationRate(Number(e.target.value))}
        className="w-16 text-right font-bold text-amber-600 bg-transparent border-b border-slate-200 focus:border-amber-500 outline-none text-sm transition-colors"
      />
      <span className="text-sm font-bold text-amber-600">%</span>
    </div>
  </div>
  <input 
    type="range" min="1" max="15" step="0.1"
    value={inflationRate} onChange={(e) => setInflationRate(Number(e.target.value))}
    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-colors"
  />
</div>
