'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { requestWithdrawal } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  saldo: number
  plano: string
}

export function WithdrawForm({ saldo, plano }: Props) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0

  function handleAll() {
    setAmount(formatBRL(saldo))
    setError('')
  }

  function handleSubmit() {
    if (parsed <= 0) { setError('Informe um valor.'); return }
    if (parsed > saldo) { setError('Valor maior que o saldo disponível.'); return }
    setError('')
    startTransition(async () => {
      const res = await requestWithdrawal(parsed)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setAmount('')
    })
  }

  if (saldo === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-700">
        <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-[12.5px] font-medium">Saldo insuficiente</p>
        <p className="text-[11px] text-slate-800 mt-1">Você não possui saldo disponível para saque.</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-white">Solicitação enviada!</p>
        <p className="text-[12px] text-slate-500 mt-1.5">
          Seu saque está sendo processado. Prazo: 1 dia útil.
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      {/* Amount input */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Valor do Saque
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[13px] font-semibold text-slate-500 pointer-events-none">R$</span>
          <input
            ref={inputRef}
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
          Disponível: R$ {formatBRL(saldo)} · Plano {plano}
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

      {/* Conta destino placeholder */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Conta de Destino
        </label>
        <div className="w-full px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl text-[12px] text-slate-500 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Conta padrão cadastrada pela administração
        </div>
      </div>

      {/* Preview */}
      {parsed > 0 && parsed <= saldo && (
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5 space-y-1.5">
          <p className="text-[10.5px] font-bold text-blue-400 uppercase tracking-wider">Resumo do saque</p>
          <div className="flex justify-between text-[11.5px]">
            <span className="text-slate-500">Valor solicitado</span>
            <span className="text-slate-200 font-semibold tabular-nums">R$ {formatBRL(parsed)}</span>
          </div>
          <div className="flex justify-between text-[11.5px]">
            <span className="text-slate-500">Taxa</span>
            <span className="text-emerald-400 font-semibold">Grátis</span>
          </div>
          <div className="flex justify-between text-[11.5px] border-t border-slate-800/60 pt-1.5 mt-0.5">
            <span className="text-slate-300 font-semibold">Você receberá</span>
            <span className="text-white font-bold tabular-nums">R$ {formatBRL(parsed)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || parsed <= 0 || parsed > saldo}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Processando...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Solicitar Saque
          </>
        )}
      </button>
    </div>
  )
}
