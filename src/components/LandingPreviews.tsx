import React from 'react';
import {
  Mic,
  Check,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  RefreshCcw,
  Rocket,
  FileText,
  FileSpreadsheet,
  GitCompareArrows,
} from 'lucide-react';

export function VoiceAssistantPreview() {
  return (
    <div className="w-full max-w-4xl rounded-2xl bg-slate-900/90 border border-slate-800 p-5 md:p-8 shadow-2xl space-y-5 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Asistente Financiero IA</p>
            <p className="text-[11px] text-slate-400">Voz o texto en lenguaje natural</p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          En vivo
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex justify-end">
          <div className="max-w-md rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-xs sm:text-sm text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20">
            <Mic className="w-4 h-4 shrink-0 text-blue-200" />
            <span>&ldquo;Gasté 25737 en luz del 8 de noviembre&rdquo;</span>
          </div>
        </div>

        <div className="max-w-lg rounded-2xl rounded-tl-sm bg-slate-800/90 border border-slate-700/80 p-4 space-y-3">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Detecté un <span className="text-rose-400 font-semibold">gasto</span> de{' '}
            <span className="text-white font-bold">$25.737</span> en{' '}
            <span className="text-blue-400 font-semibold">Servicios</span>{' '}
            <span className="text-slate-400">(fecha: 8 nov)</span>. ¿Deseas registrarlo?
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                Luz
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                Servicios
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold">
              <Check className="w-3.5 h-3.5" />
              Confirmar
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {[
          'Ayer gasté 10.000 en pan',
          'Me pagaron veinticinco mil de un envío',
          'Pagué 38.900 de Netflix',
        ].map((chip) => (
          <span
            key={chip}
            className="text-[11px] px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ModuleGalleryPreviews() {
  return {
    dashboard: (
      <div className="w-full h-full bg-slate-950 p-3.5 flex flex-col justify-between text-left">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumen</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              -12% gastos
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-[10px] text-slate-400">Balance neto</p>
            <p className="text-base font-extrabold text-blue-400">+$1.780.000</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-[9px] text-slate-400">Ingresos</p>
              <p className="text-xs font-bold text-emerald-400">$3.200.000</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-[9px] text-slate-400">Gastos</p>
              <p className="text-xs font-bold text-rose-400">$1.420.000</p>
            </div>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400">
            <GitCompareArrows className="w-3 h-3" />
            Nov vs. Oct (a la fecha)
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-blue-500 rounded-full" />
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full w-full bg-slate-600 rounded-full" />
          </div>
        </div>
      </div>
    ),
    savings: (
      <div className="w-full h-full bg-slate-950 p-3.5 flex flex-col justify-between text-left">
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase">Metas de Ahorro</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-white">
              <span>Fondo emergencia</span>
              <span className="text-emerald-400">75%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-emerald-500 rounded-full" />
            </div>
            <p className="text-[9px] text-slate-400">$1.500.000 / $2.000.000</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-white">
              <span>Viaje</span>
              <span className="text-blue-400">40%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-2/5 bg-blue-500 rounded-full" />
            </div>
            <p className="text-[9px] text-slate-400">$800.000 / $2.000.000</p>
          </div>
        </div>
        <div className="text-center py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
          + Abonar rápido
        </div>
      </div>
    ),
    movements: (
      <div className="w-full h-full bg-slate-950 p-3.5 flex flex-col justify-between text-left">
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Movimientos</span>
          {[
            { name: 'Luz', cat: 'Servicios · 8 nov', amount: '-$25.737', neg: true },
            { name: 'Panadería', cat: 'Supermercado · Ayer', amount: '-$10.000', neg: true },
            { name: 'Envío', cat: 'Salario · Hoy', amount: '+$25.000', neg: false },
          ].map((tx) => (
            <div
              key={tx.name}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{tx.name}</p>
                <p className="text-[9px] text-slate-400 truncate">{tx.cat}</p>
              </div>
              <span className={`text-[11px] font-bold shrink-0 ${tx.neg ? 'text-rose-400' : 'text-emerald-400'}`}>
                {tx.amount}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800">
          <span>Filtros por mes</span>
          <span className="text-blue-400 font-semibold">Editar / Recurrente</span>
        </div>
      </div>
    ),
    advisor: (
      <div className="w-full h-full bg-slate-950 p-3.5 flex flex-col justify-between text-left">
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            AI Advisor
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] text-slate-200 leading-relaxed">
            Tus gastos en <strong className="text-white">Comida</strong> bajaron 14% frente al mes pasado. ¡Vas por buen camino!
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
              <RefreshCcw className="w-3 h-3" />
              Suscripción detectada
            </div>
            <p className="text-[11px] text-white font-semibold">Netflix · $38.900/mes</p>
          </div>
        </div>
        <div className="text-[9px] text-slate-400">Alertas de presupuesto 50% · 80% · 100%</div>
      </div>
    ),
    liberty: (
      <div className="w-full h-full bg-slate-950 p-3.5 flex flex-col justify-between text-left">
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase">
            <Rocket className="w-3.5 h-3.5" />
            Libertad Financiera
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 text-center">
            <p className="text-[9px] text-indigo-300 uppercase">Tasa de ahorro actual</p>
            <p className="text-2xl font-black text-white">32%</p>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Meta estimada: 11 años</p>
          </div>
          <div className="flex items-end gap-1.5 h-12 px-1">
            {[25, 38, 52, 68, 85, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-md"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <p className="text-[9px] text-slate-400">Proyección con interés compuesto</p>
      </div>
    ),
  };
}

export function ReportsPreview() {
  return (
    <div className="w-full max-w-2xl rounded-xl bg-slate-900/90 border border-slate-800 p-5 md:p-6 space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <p className="text-sm font-bold text-white">Reportes Financieros</p>
          <p className="text-[11px] text-slate-400">Mensual · Trimestral · Anual</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold">
            <FileText className="w-3 h-3" /> PDF
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
            <FileSpreadsheet className="w-3 h-3" /> CSV
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <p className="text-[10px] text-slate-400">Ingresos</p>
          <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> $3.200.000
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <p className="text-[10px] text-slate-400">Gastos</p>
          <p className="text-sm font-bold text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> $1.420.000
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
          <p className="text-[10px] text-slate-400">Ahorro</p>
          <p className="text-sm font-bold text-blue-400">$1.780.000</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden text-[11px]">
        <div className="grid grid-cols-3 bg-slate-950 px-3 py-2 text-slate-400 font-semibold">
          <span>Categoría</span>
          <span>Presupuesto</span>
          <span className="text-right">Ejecutado</span>
        </div>
        {[
          { cat: 'Supermercado', budget: '$600.000', spent: '$485.000' },
          { cat: 'Servicios', budget: '$350.000', spent: '$295.737' },
          { cat: 'Transporte', budget: '$250.000', spent: '$180.000' },
        ].map((row) => (
          <div key={row.cat} className="grid grid-cols-3 px-3 py-2 border-t border-slate-800/80 text-slate-300">
            <span className="font-medium text-white">{row.cat}</span>
            <span>{row.budget}</span>
            <span className="text-right font-semibold">{row.spent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
