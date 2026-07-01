'use client'

import { useState } from 'react'
import { approveAntecipacao } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  merchantId: string
  name: string
  plan: string
  taxaPercent: number
  initial: string
  gradient: string
  pendingBalance: number
  taxa: number
  liquido: number
}

export function AntecipacaoRow({ merchantId, name, plan, taxaPercent, initial, gradient, pendingBalance, taxa, liquido }: Props) {
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleApprove() {
    if (loading || done) return
    if (!confirm(`Aprovar antecipação de recebíveis de cartão de R$ ${formatBRL(liquido)} para ${name}? (taxa ${taxaPercent}%)`)) return
    setLoading(true)
    setError('')
    try {
      await approveAntecipacao(merchantId)
      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao aprovar antecipação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <tr className={`hover:bg-slate-800/25 transition-colors ${done ? 'opacity-40' : ''}`}>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
              {initial}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white truncate max-w-[120px]">{name}</p>
              <p className="text-[11px] text-slate-600">Cartão · {plan} · {taxaPercent}%</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="text-[13px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(pendingBalance)}</span>
        </td>
        <td className="px-4 py-3.5 text-right hidden md:table-cell">
          <span className="text-[12px] text-red-400 tabular-nums">−R$ {formatBRL(taxa)}</span>
        </td>
        <td className="px-5 py-3.5 text-right">
          <span className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(liquido)}</span>
        </td>
        <td className="px-4 py-3.5 text-right">
          {done ? (
            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              Aprovado
            </span>
          ) : (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando…' : 'Aprovar'}
            </button>
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
