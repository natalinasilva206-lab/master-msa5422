'use client'

import { useTransition, useState } from 'react'
import { resolveEarlyWithdraw } from '../cdi/actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface AprovacaoItem {
  id: string
  merchantId: string
  sellerName: string
  sellerEmail: string
  amount: number
  cdiBalance: number
  lockAmount: number
  lockExpiresAt: string | null
  createdAt: Date
}

export function AprovacaoRow({ item }: { item: AprovacaoItem }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<'approved' | 'denied' | null>(null)

  function handle(approve: boolean) {
    startTransition(async () => {
      await resolveEarlyWithdraw(item.id, item.merchantId, item.amount, approve)
      setDone(approve ? 'approved' : 'denied')
    })
  }

  if (done) {
    return (
      <tr className="opacity-50">
        <td colSpan={5} className="px-5 py-3 text-center">
          <span className={`text-[11.5px] font-semibold ${done === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
            {done === 'approved' ? '✓ Aprovado' : '✕ Negado'} — R$ {formatBRL(item.amount)} · {item.sellerName}
          </span>
        </td>
      </tr>
    )
  }

  const daysToExpiry = item.lockExpiresAt
    ? Math.ceil((new Date(item.lockExpiresAt + 'T23:59:59').getTime() - Date.now()) / 86400000)
    : null

  return (
    <tr className="hover:bg-slate-800/20 transition-colors group">
      {/* Seller */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {item.sellerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-white">{item.sellerName}</p>
            <p className="text-[10.5px] text-slate-600">{item.sellerEmail}</p>
          </div>
        </div>
      </td>

      {/* Título / Vencimento */}
      <td className="px-4 py-4 hidden md:table-cell">
        <p className="text-[11.5px] font-semibold text-slate-300">
          R$ {formatBRL(item.lockAmount)} bloqueados
        </p>
        {item.lockExpiresAt && (
          <p className="text-[10px] text-slate-600 mt-0.5">
            Vence em {new Intl.DateTimeFormat('pt-BR').format(new Date(item.lockExpiresAt + 'T12:00:00'))}
            {daysToExpiry !== null && ` · ${daysToExpiry}d`}
          </p>
        )}
      </td>

      {/* Saldo CDI */}
      <td className="px-4 py-4 text-right hidden lg:table-cell">
        <p className="text-[11.5px] font-semibold text-emerald-400 tabular-nums">R$ {formatBRL(item.cdiBalance)}</p>
        <p className="text-[9.5px] text-slate-600 mt-0.5">saldo CDI total</p>
      </td>

      {/* Valor solicitado */}
      <td className="px-4 py-4 text-right">
        <p className="text-[14px] font-bold text-amber-400 tabular-nums">R$ {formatBRL(item.amount)}</p>
        <p className="text-[9.5px] text-slate-600 mt-0.5">
          {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}
        </p>
      </td>

      {/* Ações */}
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handle(false)}
            disabled={isPending}
            className="text-[11.5px] font-semibold text-red-400 hover:text-white border border-red-500/20 hover:bg-red-500 hover:border-red-500 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          >
            Negar
          </button>
          <button
            onClick={() => handle(true)}
            disabled={isPending}
            className="text-[11.5px] font-semibold text-emerald-400 hover:text-white border border-emerald-500/30 hover:bg-emerald-600 hover:border-emerald-600 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          >
            {isPending ? '...' : 'Aprovar'}
          </button>
        </div>
      </td>
    </tr>
  )
}
