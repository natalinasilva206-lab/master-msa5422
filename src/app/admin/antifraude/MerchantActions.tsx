'use client'

import { useState } from 'react'
import { blockMerchant, unblockMerchant, markForReview } from './actions'
import { useToast } from '@/components/ui/Toast'

interface Props {
  merchantId: string
  merchantName: string
  currentStatus: string
}

type Action = 'block' | 'unblock' | 'review'

const LABELS: Record<Action, string> = { block: 'bloquear', unblock: 'desbloquear', review: 'enviar para revisão' }

function Spinner() {
  return (
    <svg className="w-2.5 h-2.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}

export function MerchantActions({ merchantId, merchantName, currentStatus }: Props) {
  const [loading, setLoading]   = useState<Action | null>(null)
  const [confirm, setConfirm]   = useState<Action | null>(null)
  const { toast }               = useToast()

  async function execute(action: Action) {
    setConfirm(null)
    setLoading(action)
    try {
      if (action === 'block')   await blockMerchant(merchantId, '')
      else if (action === 'unblock') await unblockMerchant(merchantId)
      else                      await markForReview(merchantId)
      const past = { block: 'bloqueado', unblock: 'desbloqueado', review: 'enviado para revisão' }
      toast(`"${merchantName}" ${past[action]} com sucesso`, 'success')
    } catch (e: any) {
      toast(e?.message ?? 'Erro ao executar ação.', 'error')
    } finally {
      setLoading(null)
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-slate-400">
          {LABELS[confirm]} <strong className="text-white">{merchantName}</strong>?
        </span>
        <button
          onClick={() => execute(confirm)}
          className="text-[10px] font-semibold text-white bg-red-600 hover:bg-red-500 px-2.5 py-1 rounded-full transition-colors"
        >
          Sim
        </button>
        <button
          onClick={() => setConfirm(null)}
          className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 px-2 py-1 transition-colors"
        >
          Não
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {currentStatus !== 'BLOCKED' && (
        <button
          onClick={() => setConfirm('block')}
          disabled={!!loading}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
        >
          {loading === 'block' ? <><Spinner />Bloqueando…</> : 'Bloquear'}
        </button>
      )}
      {currentStatus === 'BLOCKED' && (
        <button
          onClick={() => setConfirm('unblock')}
          disabled={!!loading}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
        >
          {loading === 'unblock' ? <><Spinner />Desbloqueando…</> : 'Desbloquear'}
        </button>
      )}
      {currentStatus !== 'REVIEW' && currentStatus !== 'BLOCKED' && (
        <button
          onClick={() => setConfirm('review')}
          disabled={!!loading}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
        >
          {loading === 'review' ? <><Spinner />Enviando…</> : 'Revisão'}
        </button>
      )}
    </div>
  )
}
