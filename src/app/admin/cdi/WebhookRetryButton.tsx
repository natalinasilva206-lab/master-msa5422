'use client'

import { useTransition } from 'react'
import { retryCdiWebhookDelivery } from './actions'

export function WebhookRetryButton({ deliveryId }: { deliveryId: string }) {
  const [isPending, start] = useTransition()

  function handleRetry() {
    start(async () => {
      const result = await retryCdiWebhookDelivery(deliveryId)
      if (!result.success) alert(`Retry falhou: ${result.error ?? 'Erro desconhecido'}`)
    })
  }

  return (
    <button
      onClick={handleRetry}
      disabled={isPending}
      className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
    >
      {isPending ? 'Reenviando…' : 'Reenviar'}
    </button>
  )
}
