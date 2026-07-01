'use client'

import { useTransition, useState } from 'react'
import { retryWebhook, resetApiKey, revokeApiKey } from './actions'

export function RetryWebhookButton({ deliveryId }: { deliveryId: string }) {
  const [isPending, start] = useTransition()
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  function handleRetry() {
    start(async () => {
      const res = await retryWebhook(deliveryId)
      setStatus(res.ok ? 'ok' : 'err')
      setTimeout(() => setStatus('idle'), 3000)
    })
  }

  return (
    <button
      onClick={handleRetry}
      disabled={isPending || status !== 'idle'}
      className={`text-[9.5px] font-semibold px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
        status === 'ok'  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
        status === 'err' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
        'text-blue-400 border-blue-500/25 bg-blue-500/10 hover:bg-blue-500/20'
      }`}
    >
      {isPending ? '…' : status === 'ok' ? 'Enviado' : status === 'err' ? 'Falhou' : 'Retentar'}
    </button>
  )
}

export function ResetApiKeyButton({ merchantId, merchantName }: { merchantId: string; merchantName: string }) {
  const [isPending, start] = useTransition()
  const [newKey, setNewKey] = useState<string | null>(null)

  function handleReset() {
    if (!confirm(`Resetar API Key de "${merchantName}"? A chave atual será invalidada imediatamente.`)) return
    start(async () => {
      const res = await resetApiKey(merchantId)
      if (res.ok && res.apiKey) setNewKey(res.apiKey)
      else alert(res.error ?? 'Erro ao resetar.')
    })
  }

  if (newKey) {
    return (
      <div className="space-y-1">
        <p className="text-[9px] text-emerald-400 font-semibold">Nova key:</p>
        <code className="text-[9px] font-mono text-slate-300 break-all">{newKey}</code>
        <button onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }}
          className="text-[9px] text-blue-400 underline">Copiar e fechar</button>
      </div>
    )
  }

  return (
    <button
      onClick={handleReset}
      disabled={isPending}
      className="text-[9.5px] font-semibold text-amber-400 border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
    >
      {isPending ? '…' : 'Resetar Key'}
    </button>
  )
}

export function RevokeApiKeyButton({ merchantId, merchantName }: { merchantId: string; merchantName: string }) {
  const [isPending, start] = useTransition()
  const [done, setDone] = useState(false)

  function handleRevoke() {
    if (!confirm(`Revogar API Key de "${merchantName}"? O merchant ficará sem acesso à API até gerar uma nova key.`)) return
    start(async () => {
      const res = await revokeApiKey(merchantId)
      if (res.ok) setDone(true)
      else alert(res.error ?? 'Erro ao revogar.')
    })
  }

  return (
    <button
      onClick={handleRevoke}
      disabled={isPending || done}
      className="text-[9.5px] font-semibold text-red-400 border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
    >
      {isPending ? '…' : done ? 'Revogada' : 'Revogar Key'}
    </button>
  )
}
