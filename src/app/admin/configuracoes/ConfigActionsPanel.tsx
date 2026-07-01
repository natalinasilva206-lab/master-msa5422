'use client'

import { useState, useTransition } from 'react'
import { forceReleaseReserves, triggerScoreRecalc } from './actions'

interface Result {
  ok: boolean
  msg: string
}

function ActionButton({
  label,
  description,
  icon,
  color,
  onRun,
}: {
  label: string
  description: string
  icon: React.ReactNode
  color: string
  onRun: () => Promise<string>
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<Result | null>(null)

  function handleClick() {
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
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white">{label}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleClick}
          disabled={pending}
          className="text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? 'Executando…' : 'Executar'}
        </button>
        {result && (
          <p className={`text-[11px] font-medium ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {result.ok ? '✓' : '✕'} {result.msg}
          </p>
        )}
      </div>
    </div>
  )
}

export function ConfigActionsPanel({ pendingReserves }: { pendingReserves: number }) {
  return (
    <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800/60">
        <p className="text-[13px] font-semibold text-white">Manutenção do Sistema</p>
        <p className="text-[10.5px] text-slate-500 mt-0.5">Operações administrativas que podem ser disparadas manualmente</p>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ActionButton
          label="Liberar Reservas Vencidas"
          description={`Processa reservas de risco com prazo vencido e libera o saldo para os sellers. ${pendingReserves > 0 ? `${pendingReserves} reserva${pendingReserves !== 1 ? 's' : ''} aguardando.` : 'Nenhuma reserva vencida no momento.'}`}
          color="bg-amber-500/10 text-amber-400"
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
        <ActionButton
          label="Recalcular Todos os Scores"
          description="Recalcula o Master Score de todos os sellers com base nas métricas atuais. O cron job automático roda diariamente."
          color="bg-blue-500/10 text-blue-400"
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
