'use client'

import { useTransition } from 'react'
import { retryCdiWebhookDelivery } from './actions'
import { useToast } from '@/components/ui/Toast'

export function WebhookRetryButton({ deliveryId }: { deliveryId: string }) {
  const [isPending, start] = useTransition()
  const { toast } = useToast()

  function handleRetry() {
    start(async () => {
      const result = await retryCdiWebhookDelivery(deliveryId)
      if (result.success) {
        toast('Webhook reenviado com sucesso', 'success')
      } else {
        toast(`Retry falhou: ${result.error ?? 'Erro desconhecido'}`, 'error')
      }
    })
  }

  return (
    <button
      onClick={handleRetry}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
    >
      {isPending ? (
        <>
          <svg className="w-2.5 h-2.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Reenviando…
        </>
      ) : 'Reenviar'}
    </button>
  )
}
