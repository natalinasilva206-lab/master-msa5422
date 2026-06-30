'use client'

import { useTransition, useState } from 'react'
import { simulateSale } from './actions'

interface Props {
  merchantId: string
  reservePercent: number
}

export default function SimularVendaForm({ merchantId, reservePercent }: Props) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<null | { ok: true; data: Record<string, unknown> } | { ok: false; error: string }>(null)

  const amountNum = parseFloat(amount) || 0
  const reservePreview = Math.round(amountNum * (reservePercent / 100) * 100) / 100
  const availablePreview = Math.round((amountNum - reservePreview) * 100) / 100

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    startTransition(async () => {
      const res = await simulateSale(merchantId, amountNum, description.trim() || undefined)
      setResult(res as any)
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Valor da Venda (R$)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setResult(null) }}
              placeholder="0,00"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: pedido #1234"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {amountNum > 0 && (
          <div className="bg-slate-800/60 rounded-lg p-3 text-sm grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-slate-400 text-xs">Valor bruto</p>
              <p className="text-white font-medium">R$ {amountNum.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-amber-400 text-xs">Reserva ({reservePercent}%)</p>
              <p className="text-amber-300 font-medium">R$ {reservePreview.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-emerald-400 text-xs">Disponível</p>
              <p className="text-emerald-300 font-medium">R$ {availablePreview.toFixed(2)}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || amountNum <= 0}
          className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {isPending ? 'Processando...' : 'Simular Venda Aprovada'}
        </button>
      </form>

      {result && (
        <div className={`rounded-lg p-4 text-sm ${result.ok ? 'bg-emerald-900/40 border border-emerald-700' : 'bg-red-900/30 border border-red-700'}`}>
          {result.ok ? (
            <div className="space-y-2">
              <p className="text-emerald-400 font-semibold">Venda processada com sucesso!</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-300">
                <span className="text-slate-400">Valor venda:</span>
                <span>R$ {(result.data.valorVenda as number).toFixed(2)}</span>
                <span className="text-slate-400">Reservado ({result.data.reservePercent as number}%):</span>
                <span className="text-amber-300">R$ {(result.data.valorReserva as number).toFixed(2)}</span>
                <span className="text-slate-400">Disponível:</span>
                <span className="text-emerald-300">R$ {(result.data.valorDisponivel as number).toFixed(2)}</span>
                <span className="text-slate-400">Liberação prevista:</span>
                <span>{result.data.releaseAt as string} ({result.data.releaseDays as number} dias)</span>
              </div>
            </div>
          ) : (
            <p className="text-red-400">{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}
