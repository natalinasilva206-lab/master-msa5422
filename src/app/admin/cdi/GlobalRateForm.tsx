'use client'

import { useState, useTransition } from 'react'
import { applyGlobalRate } from './actions'

const PLANS = ['Todos', 'Start', 'Growth', 'Prime', 'Black'] as const

const planColors: Record<string, string> = {
  Todos:  'bg-slate-700/80 text-slate-200 border-slate-600/60',
  Start:  'bg-slate-700/50 text-slate-300 border-slate-600/40',
  Growth: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
  Prime:  'bg-purple-600/20 text-purple-300 border-purple-500/30',
  Black:  'bg-slate-800/80 text-slate-200 border-slate-600/50',
}

interface Props {
  merchantCounts: Record<string, number>
}

export function GlobalRateForm({ merchantCounts }: Props) {
  const [plan, setPlan] = useState<string>('Todos')
  const [rate, setRate] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const count = plan === 'Todos'
    ? Object.values(merchantCounts).reduce((a, b) => a + b, 0)
    : (merchantCounts[plan] ?? 0)

  function handleApply() {
    const parsed = parseFloat(rate.replace(',', '.'))
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return
    startTransition(async () => {
      await applyGlobalRate(parsed, plan === 'Todos' ? undefined : plan)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
      setRate('')
    })
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-white">Aplicar Taxa Global</p>
          <p className="text-[10.5px] text-slate-500 mt-0.5">Defina a mesma taxa CDI para todos os sellers ou por plano</p>
        </div>
        {done && (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Atualizado!
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Plan filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Filtrar por plano</label>
          <div className="flex items-center gap-1">
            {PLANS.map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`px-2.5 py-1.5 text-[11.5px] font-semibold rounded-lg border transition-all ${
                  plan === p
                    ? planColors[p]
                    : 'bg-transparent text-slate-600 border-slate-800/60 hover:text-slate-400 hover:border-slate-700/60'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Rate input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nova taxa (% ao mês)</label>
          <div className="relative flex items-center">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="ex: 1.50"
              onKeyDown={(e) => { if (e.key === 'Enter') handleApply() }}
              className="w-[100px] pr-6 pl-3 py-2 text-[13.5px] tabular-nums bg-slate-800/60 border border-slate-700/60 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
            />
            <span className="absolute right-2.5 text-[12px] text-slate-500 pointer-events-none font-semibold">%</span>
          </div>
        </div>

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={isPending || !rate}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12.5px] font-semibold rounded-lg transition-colors"
        >
          {isPending ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Aplicando...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Aplicar para {count} seller{count !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
