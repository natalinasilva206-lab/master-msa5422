'use client'

import { useTransition, useState } from 'react'
import { saveRiskConfig } from './actions'
import type { RiskSuggestion } from '@/lib/computeRiskSuggestions'

interface Props {
  merchantId:         string
  suggestions:        RiskSuggestion[]
  currentPercent:     number
  currentDays:        number
  currentLevel:       string
  currentMin:         number
  currentMax:         number
  currentNotes:       string
}

const SEVERITY_STYLE: Record<string, { border: string; bg: string; icon: string; badge: string }> = {
  danger:  { border: 'border-red-500/30',    bg: 'bg-red-500/5',    icon: 'text-red-400',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
  warning: { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  icon: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  info:    { border: 'border-blue-500/30',   bg: 'bg-blue-500/5',   icon: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

const SEVERITY_LABEL: Record<string, string> = {
  danger: 'Alto',
  warning: 'Médio',
  info: 'Baixo',
}

function SuggestionIcon({ type }: { type: RiskSuggestion['type'] }) {
  if (type === 'increase_reserve' || type === 'mark_high_risk') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (type === 'decrease_reserve' || type === 'mark_low_risk') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (type === 'increase_days' || type === 'decrease_days') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function RiskSuggestions({
  merchantId,
  suggestions,
  currentPercent,
  currentDays,
  currentLevel,
  currentMin,
  currentMax,
  currentNotes,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState<string[]>([])
  const [applied, setApplied]     = useState<string[]>([])
  const [error, setError]         = useState<string | null>(null)

  const visible = suggestions.filter((s) => !dismissed.includes(s.id) && !applied.includes(s.id))

  if (suggestions.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 px-4 text-slate-500 text-sm">
        <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Nenhuma sugestão no momento. O perfil de risco deste seller está dentro do esperado.
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 px-4 text-slate-500 text-sm">
        <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Todas as sugestões foram tratadas.
      </div>
    )
  }

  function apply(s: RiskSuggestion) {
    setError(null)
    startTransition(async () => {
      const newPercent = s.suggestedPercent ?? currentPercent
      const newDays    = s.suggestedDays    ?? currentDays
      const newLevel   = s.suggestedLevel   ?? currentLevel

      const res = await saveRiskConfig(merchantId, {
        riskReservePercent: newPercent,
        riskReleaseDays:    newDays,
        riskLevel:          newLevel,
        riskReserveMin:     currentMin,
        riskReserveMax:     currentMax,
        riskNotes:          currentNotes,
      })

      if (res.error) {
        setError(res.error)
      } else {
        setApplied((prev) => [...prev, s.id])
      }
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="text-[10.5px] text-slate-500 mb-1">
        {visible.length} sugestão{visible.length !== 1 ? 'ões' : ''} — escolha quais aplicar. O sistema não muda nada automaticamente.
      </div>

      {visible.map((s) => {
        const style = SEVERITY_STYLE[s.severity]
        return (
          <div key={s.id} className={`border ${style.border} ${style.bg} rounded-xl p-4`}>
            <div className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${style.icon} bg-current/10`} style={{ backgroundColor: 'inherit' }}>
                <div className={style.icon}>
                  <SuggestionIcon type={s.type} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-[13px] font-semibold text-white">{s.title}</p>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${style.badge}`}>
                    {SEVERITY_LABEL[s.severity]}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-400 leading-relaxed">{s.reason}</p>

                {/* Suggested values pill */}
                {(s.suggestedPercent !== undefined || s.suggestedDays !== undefined || s.suggestedLevel !== undefined) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.suggestedPercent !== undefined && (
                      <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                        Reserva: {currentPercent}% → {s.suggestedPercent}%
                      </span>
                    )}
                    {s.suggestedDays !== undefined && (
                      <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                        Prazo: {currentDays}d → {s.suggestedDays}d
                      </span>
                    )}
                    {s.suggestedLevel !== undefined && (
                      <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                        Nível: {currentLevel} → {s.suggestedLevel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 shrink-0 ml-2">
                <button
                  onClick={() => apply(s)}
                  disabled={pending}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => setDismissed((prev) => [...prev, s.id])}
                  disabled={pending}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 transition-colors"
                >
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
