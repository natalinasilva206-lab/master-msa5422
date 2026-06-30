'use client'

import { useTransition } from 'react'
import { resolveWithdrawal } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export interface WithdrawRequest {
  id: string
  merchantId: string
  sellerName: string
  amount: number
  createdAt: Date
  pendingBalance: number
}

function RequestRow({ req }: { req: WithdrawRequest }) {
  const [isPending, startTransition] = useTransition()

  function handle(approve: boolean) {
    startTransition(async () => {
      await resolveWithdrawal(req.id, req.merchantId, req.amount, approve)
    })
  }

  return (
    <tr className="hover:bg-slate-800/20 transition-colors">
      <td className="px-5 py-3.5">
        <p className="text-[12.5px] font-semibold text-white">{req.sellerName}</p>
        <p className="text-[10.5px] text-slate-600 mt-0.5">{formatDate(req.createdAt)}</p>
      </td>
      <td className="px-4 py-3.5 text-right">
        <p className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(req.amount)}</p>
        <p className="text-[10.5px] text-slate-600 mt-0.5">Disp: R$ {formatBRL(req.pendingBalance)}</p>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handle(false)}
            disabled={isPending}
            className="text-[11.5px] font-semibold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            Negar
          </button>
          <button
            onClick={() => handle(true)}
            disabled={isPending}
            className="text-[11.5px] font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {isPending ? '...' : 'Aprovar'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export function WithdrawPendingRequests({ requests }: { requests: WithdrawRequest[] }) {
  if (requests.length === 0) return null

  return (
    <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-emerald-500/15 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-[13px] font-semibold text-emerald-300">Saques Aguardando Aprovação</p>
        <span className="ml-auto text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          {requests.length} pendente{requests.length !== 1 ? 's' : ''}
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-emerald-500/10">
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
