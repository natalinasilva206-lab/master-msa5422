'use client'

import { useState, useTransition } from 'react'
import { requestAntecipacao, cancelAntecipacao } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  futureBalance: number
  taxa: number
  plano: string
  pendingRequest: { id: string; requestedAmount: number; feePercent: number; feeAmount: number; netAmount: number; createdAt: string } | null
}

export function AntecipacaoForm({ futureBalance, taxa, plano, pendingRequest }: Props) {
  const [amount, setAmount]   = useState('')
  const [notes, setNotes]     = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, startSubmit] = useTransition()
  const [cancelling, startCancel] = useTransition()

  const parsed  = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0
  const taxaVal = parsed * (taxa / 100)
  const liquido = parsed - taxaVal

  function handleAll() {
    setAmount(futureBalance.toFixed(2).replace('.', ','))
    setError('')
  }

  function handleSubmit() {
    if (parsed < 10) { setError('Valor mínimo de R$ 10,00.'); return }
    if (parsed > futureBalance) { setError('Valor maior que os recebíveis de cartão disponíveis.'); return }
    setError('')
    startSubmit(async () => {
      const res = await requestAntecipacao(parsed, notes)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setAmount('')
      setNotes('')
    })
  }

  function handleCancel(id: string) {
    if (!confirm('Cancelar esta solicitação de antecipação?')) return
    startCancel(async () => {
      await cancelAntecipacao(id)
    })
  }

  // Already has a pending request
  if (pendingRequest && !success) {
    return (
      <div className="p-5 space-y-4">
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[13px] font-semibold text-amber-400">Solicitação em análise</p>
          </div>
          <div className="space-y-1.5 text-[11.5px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Valor solicitado</span>
              <span className="text-slate-200 font-semibold tabular-nums">R$ {formatBRL(pendingRequest.requestedAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Taxa ({pendingRequest.feePercent}%)</span>
              <span className="text-red-400 tabular-nums">−R$ {formatBRL(pendingRequest.feeAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-amber-500/15 pt-1.5">
              <span className="text-slate-300 font-semibold">A receber (líquido)</span>
              <span className="text-emerald-400 font-bold tabular-nums">R$ {formatBRL(pendingRequest.netAmount)}</span>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-600">
            Enviado em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(pendingRequest.createdAt))}
          </p>
          <button
            onClick={() => handleCancel(pendingRequest.id)}
            disabled={cancelling}
            className="text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelando…' : 'Cancelar solicitação'}
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-white">Solicitação enviada!</p>
        <p className="text-[12px] text-slate-500 mt-1.5">
          Sua solicitação foi recebida e está em análise. Você será notificado quando for processada.
        </p>
      </div>
    )
  }

  if (futureBalance < 10) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-700 px-5 text-center">
        <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[12.5px] font-medium">Sem recebíveis de cartão</p>
        <p className="text-[11px] text-slate-800 mt-1">Quando houver vendas de cartão a liquidar, você poderá solicitar antecipação.</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Valor a antecipar (cartão)
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[13px] font-semibold text-slate-500 pointer-events-none">R$</span>
          <input
            type="text"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="0,00"
            className="w-full pl-9 pr-24 py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[15px] font-bold tabular-nums rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition placeholder-slate-700"
          />
          <button
            onClick={handleAll}
            className="absolute right-2 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 px-2.5 py-1 rounded-lg transition-colors"
          >
            Tudo
          </button>
        </div>
        <p className="text-[10.5px] text-slate-600 mt-1">
          Recebíveis de cartão disponíveis: <span className="text-amber-400 font-semibold">R$ {formatBRL(futureBalance)}</span>
        </p>
        {error && (
          <p className="text-[11.5px] text-red-400 mt-1.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </p>
        )}
      </div>

      {parsed >= 10 && parsed <= futureBalance && (
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5 space-y-1.5">
          <p className="text-[10.5px] font-bold text-blue-400 uppercase tracking-wider">Simulação</p>
          <div className="flex justify-between text-[11.5px]">
            <span className="text-slate-500">Valor bruto</span>
            <span className="text-slate-200 font-semibold tabular-nums">R$ {formatBRL(parsed)}</span>
          </div>
          <div className="flex justify-between text-[11.5px]">
            <span className="text-slate-500">Taxa {plano} ({taxa}%)</span>
            <span className="text-red-400 font-semibold tabular-nums">−R$ {formatBRL(taxaVal)}</span>
          </div>
          <div className="flex justify-between text-[11.5px] border-t border-slate-800/60 pt-1.5 mt-0.5">
            <span className="text-slate-300 font-semibold">A receber (líquido)</span>
            <span className="text-emerald-400 font-bold tabular-nums">R$ {formatBRL(liquido)}</span>
          </div>
          <p className="text-[10px] text-slate-700 pt-0.5">Creditado no saldo disponível após aprovação</p>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Observação (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Motivo ou informações adicionais para o time financeiro..."
          className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-200 text-[12.5px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition placeholder-slate-700 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || parsed < 10 || parsed > futureBalance}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Enviando...
          </>
        ) : (
          'Solicitar Antecipação'
        )}
      </button>
    </div>
  )
}
