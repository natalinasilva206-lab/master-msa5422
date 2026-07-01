'use client'

import { useState, useTransition } from 'react'
import { resolveEarlyWithdraw } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export interface EarlyRequest {
  id: string
  merchantId: string
  sellerName: string
  amount: number
  createdAt: Date
  cdiBalance: number
}

interface Props {
  requests: EarlyRequest[]
}

function Spinner({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin shrink-0`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

function RequestRow({ req }: { req: EarlyRequest }) {
  const [isPending, startTransition] = useTransition()
  const [action, setAction]          = useState<'approve' | 'deny' | null>(null)
  const [done, setDone]              = useState<'approved' | 'denied' | null>(null)

  function handle(approve: boolean) {
    const a = approve ? 'approve' : 'deny'
    setAction(a)
    startTransition(async () => {
      await resolveEarlyWithdraw(req.id, req.merchantId, req.amount, approve)
      setDone(approve ? 'approved' : 'denied')
    })
  }

  if (done) {
    return (
      <tr>
        <td colSpan={3} className="px-5 py-3">
          <div className={`flex items-center gap-2 text-[12px] font-medium ${done === 'approved' ? 'text-emerald-400' : 'text-slate-500'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {done === 'approved'
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              }
            </svg>
            {req.sellerName} — resgate {done === 'approved' ? 'aprovado' : 'negado'} (R$ {formatBRL(req.amount)})
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-slate-800/20 transition-colors">
      <td className="px-5 py-3.5">
        <p className="text-[12.5px] font-semibold text-white">{req.sellerName}</p>
        <p className="text-[10.5px] text-slate-600 mt-0.5">{formatDate(req.createdAt)}</p>
      </td>
      <td className="px-4 py-3.5 text-right">
        <p className="text-[13px] font-bold text-amber-400 tabular-nums">R$ {formatBRL(req.amount)}</p>
        <p className="text-[10.5px] text-slate-600 mt-0.5">CDI: R$ {formatBRL(req.cdiBalance)}</p>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handle(false)}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {isPending && action === 'deny' ? <><Spinner />Negando…</> : 'Negar'}
          </button>
          <button
            onClick={() => handle(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {isPending && action === 'approve' ? <><Spinner />Aprovando…</> : 'Aprovar'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export function EarlyWithdrawRequests({ requests }: Props) {
  if (requests.length === 0) return null

  return (
    <section className="bg-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-amber-500/15 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-[13px] font-semibold text-amber-300">Solicitações de Resgate Antecipado</p>
        <span className="ml-auto text-[11px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
          {requests.length} pendente{requests.length !== 1 ? 's' : ''}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-amber-500/10">
            <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Seller</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor solicitado</th>
            <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {requests.map((r) => <RequestRow key={r.id} req={r} />)}
        </tbody>
      </table>
    </section>
  )
}
