'use client'

import { useState, useTransition } from 'react'
import { forceReleaseReserves, triggerScoreRecalc } from './actions'

interface Result {
  ok: boolean
  msg: string
}

function ActionCard({
  label,
  description,
  danger,
  confirmMessage,
  icon,
  color,
  moduleHref,
  moduleLabel,
  badge,
  onRun,
}: {
  label: string
  description: string
  danger?: boolean
  confirmMessage?: string
  icon: React.ReactNode
  color: string
  moduleHref: string
  moduleLabel: string
  badge?: { text: string; variant: 'amber' | 'red' } | null
  onRun: () => Promise<string>
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    setResult(null)
    startTransition(async () => {
      try {
        const msg = await onRun()
        setResult({ ok: true, msg })
      } catch (e: any) {
        setResult({ ok: false, msg: e?.message ?? 'Erro desconhecido.' })
      }
    })
  }

  return (
    <div className={`bg-slate-900/40 border rounded-xl p-4 flex flex-col gap-3 ${danger ? 'border-amber-500/20' : 'border-slate-800/60'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-white">{label}</p>
            {badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                badge.variant === 'amber'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                  : 'bg-red-500/15 text-red-400 border-red-500/25'
              }`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClick}
            disabled={pending}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              danger
                ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20'
                : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700/50'
            }`}
          >
            {pending ? 'Executando…' : 'Executar'}
          </button>
          {result && (
            <p className={`text-[11px] font-medium ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.ok ? '✓' : '✕'} {result.msg}
            </p>
          )}
        </div>
        <a
          href={moduleHref}
          className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          {moduleLabel} →
        </a>
      </div>
    </div>
  )
}

export function ConfigActionsPanel({ pendingReserves }: { pendingReserves: number }) {
  return (
    <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800/60">
        <p className="text-[13px] font-semibold text-white">Manutenção do Sistema</p>
        <p className="text-[10.5px] text-slate-500 mt-0.5">Operações administrativas manuais — ações financeiras exigem confirmação</p>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionCard
          label="Liberar Reservas Vencidas"
          description="Processa reservas de risco com prazo vencido e libera o saldo para os sellers. Operação financeira irreversível."
          danger
          confirmMessage={`Confirmar liberação de ${pendingReserves} reserva${pendingReserves !== 1 ? 's' : ''} vencida${pendingReserves !== 1 ? 's' : ''}? Esta operação é irreversível.`}
          color="bg-amber-500/10 text-amber-400"
          moduleHref="/admin/risco"
          moduleLabel="Ver Reservas"
          badge={pendingReserves > 0 ? { text: `${pendingReserves} pendente${pendingReserves !== 1 ? 's' : ''}`, variant: 'amber' } : null}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          }
          onRun={async () => {
            const r = await forceReleaseReserves()
            if (r.processed === 0) return 'Nenhuma reserva vencida para liberar.'
            return `${r.processed} reserva${r.processed !== 1 ? 's' : ''} liberada${r.processed !== 1 ? 's' : ''} com sucesso.`
          }}
        />
        <ActionCard
          label="Recalcular Todos os Scores"
          description="Recalcula o Master Score de todos os sellers com base nas métricas atuais. O cron job automático roda diariamente."
          color="bg-blue-500/10 text-blue-400"
          moduleHref="/admin/master-score"
          moduleLabel="Ver Master Score"
          badge={null}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          onRun={async () => {
            const r = await triggerScoreRecalc()
            return `${(r as any).updated ?? '?'} score${((r as any).updated ?? 0) !== 1 ? 's' : ''} atualizado${((r as any).updated ?? 0) !== 1 ? 's' : ''}.`
          }}
        />
      </div>
    </section>
  )
}
