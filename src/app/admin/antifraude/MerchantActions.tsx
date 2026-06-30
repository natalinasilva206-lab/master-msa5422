'use client'

import { useState } from 'react'
import { blockMerchant, unblockMerchant, markForReview } from './actions'

interface Props {
  merchantId: string
  merchantName: string
  currentStatus: string
}

export function MerchantActions({ merchantId, merchantName, currentStatus }: Props) {
  const [loading, setLoading] = useState<string | null>(null)

  async function run(action: 'block' | 'unblock' | 'review') {
    const labels = { block: 'bloquear', unblock: 'desbloquear', review: 'enviar para revisão' }
    if (!confirm(`Confirmar: ${labels[action]} "${merchantName}"?`)) return
    setLoading(action)
    try {
      if (action === 'block') {
        await blockMerchant(merchantId, '')
      } else if (action === 'unblock') {
        await unblockMerchant(merchantId)
      } else {
        await markForReview(merchantId)
      }
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao executar ação.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {currentStatus !== 'BLOCKED' && (
        <button
          onClick={() => run('block')}
          disabled={!!loading}
          className="text-[10px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
        >
          {loading === 'block' ? '…' : 'Bloquear'}
        </button>
      )}
      {currentStatus === 'BLOCKED' && (
        <button
          onClick={() => run('unblock')}
          disabled={!!loading}
          className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
        >
          {loading === 'unblock' ? '…' : 'Desbloquear'}
        </button>
      )}
      {currentStatus !== 'REVIEW' && currentStatus !== 'BLOCKED' && (
        <button
          onClick={() => run('review')}
          disabled={!!loading}
          className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
        >
          {loading === 'review' ? '…' : 'Revisão'}
        </button>
      )}
    </div>
  )
}
