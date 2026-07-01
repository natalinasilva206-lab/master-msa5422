'use client'

import { useState, useTransition } from 'react'
import { approveAntecipacao, rejectAntecipacao } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  id: string
  merchantName: string
  plan: string
  requestedAmount: number
  feePercent: number
  feeAmount: number
  netAmount: number
  notes: string | null
  createdAt: string
}

export function AntecipacaoRow({ id, merchantName, plan, requestedAmount, feePercent, feeAmount, netAmount, notes, createdAt }: Props) {
  const [status, setStatus] = useState<'idle' | 'approved' | 'rejected'>('idle')
  const [error, setError] = useState('')
  const [approving, startApprove] = useTransition()
  const [rejecting, startReject] = useTransition()

  function handleApprove() {
    if (!confirm(`Aprovar antecipação de R$ ${formatBRL(netAmount)} líquido para ${merchantName}?\n\nBruto: R$ ${formatBRL(requestedAmount)}\nTaxa ${feePercent}%: −R$ ${formatBRL(feeAmount)}\nLíquido: R$ ${formatBRL(netAmount)}`)) return
    startApprove(async () => {
      const r = await approveAntecipacao(id)
      if (r?.error) setError(r.error)
      else setStatus('approved')
    })
  }

  function handleReject() {
    const motivo = prompt('Motivo da rejeição (opcional):') ?? undefined
    startReject(async () => {
      const r = await rejectAntecipacao(id, motivo)
      if (r?.error) setError(r.error)
      else setStatus('rejected')
    })
  }

  const busy = approving || rejecting

  return (
    <>
      <tr className={`hover:bg-slate-800/25 transition-colors ${status !== 'idle' ? 'opacity-40' : ''}`}>
        <td className="px-5 py-3.5">
          <div>
            <p className="text-[13px] font-semibold text-white">{merchantName}</p>
            <p className="text-[10.5px] text-slate-500">
              {plan} · Taxa {feePercent}% · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(createdAt))}
            </p>
            {notes && <p className="text-[10px] text-slate-600 mt-0.5 italic">"{notes}"</p>}
          </div>
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="text-[13px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(requestedAmount)}</span>
        </td>
        <td className="px-4 py-3.5 text-right hidden md:table-cell">
          <span className="text-[12px] text-red-400 tabular-nums">−R$ {formatBRL(feeAmount)}</span>
        </td>
        <td className="px-5 py-3.5 text-right">
          <span className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(netAmount)}</span>
        </td>
        <td className="px-4 py-3.5 text-right">
          {status === 'approved' && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Aprovado</span>
          )}
          {status === 'rejected' && (
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">Rejeitado</span>
          )}
          {status === 'idle' && (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={handleApprove}
                disabled={busy}
                className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {approving ? '…' : 'Aprovar'}
              </button>
              <button
                onClick={handleReject}
                disabled={busy}
                className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {rejecting ? '…' : 'Rejeitar'}
              </button>
            </div>
          )}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={5} className="px-5 pb-2">
            <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{error}</p>
          </td>
        </tr>
      )}
    </>
  )
}
