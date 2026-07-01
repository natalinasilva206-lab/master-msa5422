'use client'

import { useState, useTransition } from 'react'
import { applyMasterScoreSuggestion } from './actions'
import type { ReservaSugerida } from '@/lib/masterScore'

interface Props {
  merchantId:        string
  scoreTotal:        number
  nivelScore:        string
  statusRisco:       string
  reservaSugerida:   ReservaSugerida
  reservaAtual:      number   // riskReservePercent atual
  prazoAtual:        number   // riskReleaseDays atual
  riskLevelAtual:    string
  masterScoreHref:   string
}

const nivelColor: Record<string, { text: string; border: string; bg: string; dot: string }> = {
  Diamante: { text: 'text-cyan-300',   border: 'border-cyan-500/30',   bg: 'bg-cyan-500/8',    dot: 'bg-cyan-400' },
  Ouro:     { text: 'text-amber-300',  border: 'border-amber-500/30',  bg: 'bg-amber-500/8',   dot: 'bg-amber-400' },
  Prata:    { text: 'text-slate-300',  border: 'border-slate-600/50',  bg: 'bg-slate-700/20',  dot: 'bg-slate-400' },
  Bronze:   { text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-500/8',  dot: 'bg-orange-500' },
}

const acaoStyle: Record<string, { label: string; color: string; arrow: string }> = {
  reduzir:  { label: 'Reduzir reserva',  color: 'text-emerald-400', arrow: '↓' },
  manter:   { label: 'Manter política',  color: 'text-blue-400',    arrow: '=' },
  aumentar: { label: 'Aumentar reserva', color: 'text-red-400',     arrow: '↑' },
}

export default function MasterScoreRiskBanner({
  merchantId,
  scoreTotal,
  nivelScore,
  statusRisco,
  reservaSugerida,
  reservaAtual,
  prazoAtual,
  riskLevelAtual,
  masterScoreHref,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [applied, setApplied] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [ignored, setIgnored] = useState(false)

  if (ignored) return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-3 text-sm text-slate-400">
      Sugestão ignorada. Mantendo configuração atual de reserva.
    </div>
  )

  const nivel = nivelColor[nivelScore] ?? nivelColor['Bronze']
  const acao  = acaoStyle[reservaSugerida.acaoSugerida]

  // Ponto médio da faixa sugerida
  const pctSugerido  = Math.round((reservaSugerida.reservaPercMin + reservaSugerida.reservaPercMax) / 2)
  const prazoSugerido = Math.round((reservaSugerida.prazoMin + reservaSugerida.prazoMax) / 2)
  const levelSugerido = reservaSugerida.riskLevelSugerido

  const jaMantendo = (
    reservaAtual >= reservaSugerida.reservaPercMin &&
    reservaAtual <= reservaSugerida.reservaPercMax &&
    prazoAtual   >= reservaSugerida.prazoMin &&
    prazoAtual   <= reservaSugerida.prazoMax &&
    riskLevelAtual === levelSugerido
  )

  function handleApply() {
    setError(null)
    startTransition(async () => {
      const res = await applyMasterScoreSuggestion(merchantId, pctSugerido, prazoSugerido, levelSugerido)
      if (res.error) { setError(res.error); return }
      setApplied(true)
    })
  }

  return (
    <div className={`border ${nivel.border} ${nivel.bg} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${nivel.dot}`} />
          <p className="text-[13px] font-semibold text-white">
            Sugestão do Master Score
          </p>
          <a
            href={masterScoreHref}
            className="text-[10px] font-medium text-slate-600 hover:text-slate-400 transition-colors"
          >
            ver detalhes →
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-bold tabular-nums ${nivel.text}`}>
            {Math.round(scoreTotal)} pts
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${nivel.border} ${nivel.text}`}>
            {nivelScore}
          </span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className={`text-[11px] font-semibold ${acao.color}`}>
            {acao.arrow} {acao.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">

        {/* Descrição */}
        <p className="text-[11.5px] text-slate-400 leading-relaxed">{reservaSugerida.descricao}</p>

        {/* Comparativo atual vs sugerido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Reserva */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Reserva de Risco</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-slate-600 mb-0.5">Atual</p>
                <p className="text-[20px] font-bold tabular-nums text-slate-300">{reservaAtual}%</p>
              </div>
              <svg className="w-4 h-4 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="flex-1">
                <p className="text-[10px] text-slate-600 mb-0.5">Sugerida</p>
                <p className={`text-[20px] font-bold tabular-nums ${acao.color}`}>{pctSugerido}%</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  faixa: {reservaSugerida.reservaPercMin}%–{reservaSugerida.reservaPercMax}%
                </p>
              </div>
            </div>
          </div>

          {/* Prazo */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Prazo de Liberação</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-slate-600 mb-0.5">Atual</p>
                <p className="text-[20px] font-bold tabular-nums text-slate-300">{prazoAtual}d</p>
              </div>
              <svg className="w-4 h-4 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="flex-1">
                <p className="text-[10px] text-slate-600 mb-0.5">Sugerido</p>
                <p className={`text-[20px] font-bold tabular-nums ${acao.color}`}>{prazoSugerido}d</p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  faixa: {reservaSugerida.prazoMin}–{reservaSugerida.prazoMax} dias
                </p>
              </div>
            </div>
          </div>

          {/* Nível de risco */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Nível de Risco</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-slate-600 mb-0.5">Atual</p>
                <p className="text-[20px] font-bold tabular-nums text-slate-300">{riskLevelAtual}</p>
              </div>
              <svg className="w-4 h-4 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <div className="flex-1">
                <p className="text-[10px] text-slate-600 mb-0.5">Sugerido</p>
                <p className={`text-[20px] font-bold tabular-nums ${acao.color}`}>{levelSugerido}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Feedback de erro */}
        {error && (
          <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Ações */}
        {applied ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-[12px] font-semibold">Sugestão aplicada com sucesso. Recarregue para ver os valores atualizados.</p>
          </div>
        ) : jaMantendo ? (
          <div className="flex items-center gap-2 text-blue-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[12px] font-medium text-slate-400">A configuração atual já está dentro da faixa sugerida pelo Master Score.</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApply}
              disabled={pending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              {pending ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {pending ? 'Aplicando…' : 'Aplicar sugestão'}
            </button>
            <button
              onClick={() => setIgnored(true)}
              disabled={pending}
              className="px-4 py-2 text-[12px] font-semibold text-slate-500 hover:text-slate-300 bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
            >
              Ignorar
            </button>
            <p className="text-[10.5px] text-slate-700 ml-1">
              O ADM decide — nenhuma ação é aplicada automaticamente.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
