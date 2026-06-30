'use client'

import { useTransition } from 'react'
import { approveMerchant, blockMerchant } from './actions'

export function KycActions({ merchantId }: { merchantId: string }) {
  const [approving, startApprove] = useTransition()
  const [blocking, startBlock] = useTransition()

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => startBlock(() => blockMerchant(merchantId))}
        disabled={blocking || approving}
        className="px-3 py-1.5 text-[11.5px] font-semibold text-red-400 hover:text-white hover:bg-red-600 border border-red-500/30 hover:border-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {blocking ? '...' : 'Bloquear'}
      </button>
      <button
        onClick={() => startApprove(() => approveMerchant(merchantId))}
        disabled={approving || blocking}
        className="px-3 py-1.5 text-[11.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {approving ? 'Aprovando...' : 'Aprovar'}
      </button>
    </div>
  )
}
