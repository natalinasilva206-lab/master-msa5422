'use client'

import { useState, useTransition } from 'react'
import { generateCdiPreview, approveCdiCycle, cancelCdiCycle } from './actions'
import type { CdiCyclePreviewData } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:   { label: 'Aguardando aprovação', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400' },
  APPROVED:  { label: 'Aprovado',             color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',     dot: 'bg-blue-400' },
  CREDITED:  { label: 'Creditado',            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  CANCELLED: { label: 'Cancelado',            color: 'text-slate-500 bg-slate-800/60 border-slate-700/40',  dot: 'bg-slate-500' },
  ERROR:     { label: 'Erro',                 color: 'text-red-400 bg-red-500/10 border-red-500/20',        dot: 'bg-red-400' },
}

interface CycleRow {
  id: string
  status: string
  previewData: string
  generatedAt: Date
  approvedAt: Date | null
  creditedAt: Date | null
  cancelledAt: Date | null
  errorMessage: string | null
  count: number | null
  totalCredited: number | null
}

interface Props {
  cycles: CycleRow[]
}

export function CdiCyclePanel({ cycles }: Props) {
  const [isPending, start]         = useTransition()
  const [error, setError]          = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmId, setConfirmId]  = useState<string | null>(null)

  const pending = cycles.find((c) => c.status === 'PENDING')

  function handleGenerate() {
    setError('')
    start(async () => {
      try {
        await generateCdiPreview()
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao gerar prévia.')
      }
    })
  }

  function handleApprove(cycleId: string) {
    setConfirmId(null)
    setError('')
    start(async () => {
      try {
        await approveCdiCycle(cycleId)
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao creditar.')
      }
    })
  }

  function handleCancel(cycleId: string) {
    setError('')
    start(async () => {
      try {
        await cancelCdiCycle(cycleId)
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao cancelar.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[13px] font-semibold text-white leading-none">Ciclo CDI — Prévia e Aprovação</p>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            Gere uma prévia, revise os valores e aprove para executar o crédito.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending || !!pending}
          title={pending ? 'Cancele a prévia pendente antes de gerar uma nova.' : ''}
          className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {isPending ? 'Aguarde…' : 'Gerar Prévia'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3.5 py-2.5">
          <svg className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] text-red-400">{error}</p>
        </div>
      )}

      {/* No cycles yet */}
      {cycles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-700">
          <svg className="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-[12.5px] font-medium">Nenhum ciclo gerado ainda</p>
          <p className="text-[10.5px] text-slate-700 mt-1">Clique em "Gerar Prévia" para iniciar.</p>
        </div>
      )}

      {/* Cycle list */}
      {cycles.map((cycle) => {
        const cfg = STATUS_CONFIG[cycle.status] ?? STATUS_CONFIG['ERROR']
        let preview: CdiCyclePreviewData | null = null
        try { preview = JSON.parse(cycle.previewData) } catch {}
        const expanded = expandedId === cycle.id
        const isPendingCycle = cycle.status === 'PENDING'

        return (
          <div key={cycle.id} className={`border rounded-2xl overflow-hidden transition-all ${
            isPendingCycle
              ? 'border-amber-500/25 bg-amber-500/3'
              : 'border-slate-800/60 bg-slate-900/30'
          }`}>
            {/* Cycle header */}
            <div className="px-5 py-4 flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500">
                  Gerada em {formatDate(cycle.generatedAt)}
                  {cycle.creditedAt && ` · Creditada em ${formatDate(cycle.creditedAt)}`}
                  {cycle.cancelledAt && ` · Cancelada em ${formatDate(cycle.cancelledAt)}`}
                </p>
                {cycle.status === 'CREDITED' && cycle.count != null && (
                  <p className="text-[11px] text-emerald-400 mt-0.5">
                    {cycle.count} seller{cycle.count !== 1 ? 's' : ''} · Total R$ {formatBRL(cycle.totalCredited ?? 0)}
                  </p>
                )}
                {cycle.errorMessage && (
                  <p className="text-[11px] text-red-400 mt-0.5">{cycle.errorMessage}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Preview stats */}
                {preview && (
                  <button
                    onClick={() => setExpandedId(expanded ? null : cycle.id)}
                    className="text-[10.5px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {expanded ? 'Ocultar detalhes' : `Ver ${preview.sellers.length} sellers`}
                  </button>
                )}

                {/* Cancel */}
                {isPendingCycle && (
                  <button
                    onClick={() => handleCancel(cycle.id)}
                    disabled={isPending}
                    className="text-[10.5px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                )}

                {/* Approve */}
                {isPendingCycle && (
                  confirmId === cycle.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-400 font-semibold">Confirmar?</span>
                      <button
                        onClick={() => handleApprove(cycle.id)}
                        disabled={isPending}
                        className="text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                      >
                        Sim, creditar
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-[10.5px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(cycle.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-[10.5px] font-bold text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-600/40 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Aprovar e Creditar
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Summary strip */}
            {preview && (
              <div className="px-5 pb-3 flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Sellers elegíveis</p>
                  <p className="text-[15px] font-bold text-white tabular-nums">{preview.totalEligible}</p>
                </div>
                <div>
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Total a creditar</p>
                  <p className="text-[15px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(preview.totalToCredit)}</p>
                </div>
                {preview.inconsistencies.length > 0 && (
                  <div>
                    <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Inconsistências</p>
                    <p className="text-[14px] font-bold text-amber-400 tabular-nums">{preview.inconsistencies.length}</p>
                  </div>
                )}
              </div>
            )}

            {/* Inconsistencies alert */}
            {preview && preview.inconsistencies.length > 0 && (
              <div className="mx-5 mb-3 flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-[10.5px] font-semibold text-amber-400 mb-1">
                    {preview.inconsistencies.length} inconsistência{preview.inconsistencies.length !== 1 ? 's' : ''} encontrada{preview.inconsistencies.length !== 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-0.5">
                    {preview.inconsistencies.map((inc, i) => (
                      <li key={i} className="text-[10px] text-amber-300/70">• {inc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Expanded seller table */}
            {expanded && preview && (
              <div className="border-t border-slate-800/50 overflow-x-auto">
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      {['Seller', 'Saldo base', 'Taxa', 'Rendimento previsto', 'Novo saldo', ''].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {preview.sellers.map((s) => (
                      <tr key={s.id} className={`${s.inconsistency ? 'bg-amber-500/3' : ''} hover:bg-slate-800/20 transition-colors`}>
                        <td className="px-4 py-2.5">
                          <p className="text-slate-300 font-medium">{s.name}</p>
                          <p className="text-[10px] text-slate-600 font-mono">{s.email}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 tabular-nums font-mono">R$ {formatBRL(s.balance)}</td>
                        <td className="px-4 py-2.5 text-slate-400 tabular-nums font-mono">{s.cdiRate.toFixed(4)}%</td>
                        <td className="px-4 py-2.5">
                          <span className={`tabular-nums font-semibold font-mono ${s.yield > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {s.yield > 0 ? `+R$ ${formatBRL(s.yield)}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 tabular-nums font-mono">R$ {formatBRL(s.newBalance)}</td>
                        <td className="px-4 py-2.5">
                          {s.inconsistency && (
                            <span className="text-[9.5px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                              ⚠ {s.inconsistency}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
