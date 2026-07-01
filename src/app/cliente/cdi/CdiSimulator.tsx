'use client'

import { useState } from 'react'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function smoothPath(pts: { x: number; y: number }[], W: number, H: number): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2
    d += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`
  }
  return d
}

interface Props {
  cdiRate: number
  initialBalance: number
}

const PERIODS = [
  { label: '12 meses', n: 12 },
  { label: '24 meses', n: 24 },
  { label: '36 meses', n: 36 },
]

export function CdiSimulator({ cdiRate, initialBalance }: Props) {
  const [rawAmount, setRawAmount] = useState(
    initialBalance > 0 ? initialBalance.toFixed(2).replace('.', ',') : '1.000,00'
  )
  const [period, setPeriod] = useState(12)

  const parsedAmount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.')) || 0
  const steps = Array.from({ length: period + 1 }, (_, n) => ({
    n,
    value: parsedAmount * Math.pow(1 + cdiRate / 100, n),
  }))
  const finalValue = steps[steps.length - 1]?.value ?? 0
  const totalGain = finalValue - parsedAmount

  // SVG chart
  const W = 500
  const H = 120
  const PAD = 12
  const minV = parsedAmount
  const maxV = finalValue > minV ? finalValue : minV * 1.01
  const pts = steps.map((s, i) => ({
    x: PAD + (i / period) * (W - PAD * 2),
    y: H - PAD - ((s.value - minV) / (maxV - minV || 1)) * (H - PAD * 2),
  }))
  const linePath = smoothPath(pts, W, H)
  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x} ${H - PAD} L ${pts[0].x} ${H - PAD} Z`

  // Show dots at start, mid, end
  const dotIdxs = [0, Math.floor(period / 2), period]

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[13px] font-semibold text-white">Simulador CDI</p>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            {initialBalance === 0 ? 'Simulação com valor exemplo — aporte saldo para ver sua projeção real' : 'Projeção de rendimento sobre seu saldo atual'}
          </p>
        </div>
        {/* Period selector */}
        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/40 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.n}
              onClick={() => setPeriod(p.n)}
              className={`px-3 py-1 text-[11.5px] font-semibold rounded-md transition-all ${
                period === p.n
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simulation notice when no real balance */}
      {initialBalance === 0 && (
        <div className="mx-5 mt-4 flex items-start gap-2 bg-blue-500/5 border border-blue-500/15 rounded-xl px-3.5 py-2.5">
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[10.5px] text-slate-500">
            Você ainda não tem saldo em CDI. Os valores abaixo são uma simulação. Aporte saldo para ver sua projeção real.
          </p>
        </div>
      )}

      {/* Amount input */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[13px] font-semibold text-slate-500 pointer-events-none">R$</span>
          <input
            type="text"
            value={rawAmount}
            onChange={(e) => setRawAmount(e.target.value)}
            className="pl-9 pr-3 py-2 w-44 bg-slate-800/60 border border-slate-700/60 text-white text-[14px] font-bold tabular-nums rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition"
            placeholder="1.000,00"
          />
        </div>
        <div className="text-[11px] text-slate-600">×</div>
        <div className="text-[12px] text-slate-400">
          <span className="font-bold text-blue-400">{cdiRate.toFixed(2)}%</span>/mês por <span className="font-bold text-white">{period}</span> meses
        </div>
      </div>

      {/* Result bar */}
      <div className="px-5 pb-4 flex items-center gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Total acumulado</p>
          <p className="text-[24px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(finalValue)}</p>
        </div>
        <div className="h-8 w-px bg-slate-800/60 hidden sm:block" />
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Rendimento</p>
          <p className="text-[20px] font-bold text-emerald-400 tabular-nums leading-none">+R$ {formatBRL(totalGain)}</p>
        </div>
        <div className="h-8 w-px bg-slate-800/60 hidden sm:block" />
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Rentabilidade</p>
          <p className="text-[20px] font-bold text-amber-400 tabular-nums leading-none">
            {parsedAmount > 0 ? ((totalGain / parsedAmount) * 100).toFixed(2) : '0,00'}%
          </p>
        </div>
      </div>

      {/* SVG Chart */}
      {parsedAmount > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-slate-950/40 rounded-xl overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((f, i) => (
                <line key={i} x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)} stroke="#1e293b" strokeWidth={1} />
              ))}
              <path d={areaPath} fill="url(#simGrad)" />
              <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" />
              {dotIdxs.map((idx) => (
                pts[idx] && (
                  <circle key={idx} cx={pts[idx].x} cy={pts[idx].y} r={3.5} fill="#10b981" stroke="#080c12" strokeWidth={1.5} />
                )
              ))}
            </svg>
            {/* X-axis labels */}
            <div className="px-3 pb-2 flex justify-between">
              <span className="text-[9.5px] text-slate-700">Agora</span>
              <span className="text-[9.5px] text-slate-700">{Math.floor(period / 2)}m</span>
              <span className="text-[9.5px] text-slate-700">{period}m</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
