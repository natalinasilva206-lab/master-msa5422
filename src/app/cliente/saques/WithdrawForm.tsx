'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { requestWithdrawal } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  saldo: number       // pendingBalance — disponível para saque
  cdiBalance: number  // balance — em CDI (não sacável diretamente)
  plano: string
}

export function WithdrawForm({ saldo, cdiBalance, plano }: Props) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!success && saldo > 0) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3500)
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

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-white">Solicitação enviada!</p>
        <p className="text-[12px] text-slate-500 mt-1.5">
          Seu saque está sendo processado.<br />Prazo de liquidação: plano {plano}.
        </p>
      </div>
    )
  }

  if (saldo === 0) {
    return (
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-slate-400">Sem saldo disponível para saque</p>
          {cdiBalance > 0 ? (
            <p className="text-[11px] text-slate-600 mt-2 max-w-[240px]">
              Você tem <span className="text-emerald-400 font-semibold">R$ {formatBRL(cdiBalance)}</span> em CDI rendendo. Para sacar, entre em contato com o suporte ou aguarde a liberação do saldo disponível.
            </p>
          ) : (
            <p className="text-[11px] text-slate-700 mt-2">
              Quando houver saldo disponível, o formulário de saque aparecerá aqui.
            </p>
          )}
        </div>

        {cdiBalance > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Saldo em CDI</p>
              <p className="text-[16px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(cdiBalance)}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Rendendo juros mensalmente</p>
            </div>
            <Link
              href="/cliente/cdi"
              className="shrink-0 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Ver CDI →
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">

      {/* Context: CDI balance */}
      {cdiBalance > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Saldo em CDI (rendendo)</p>
            <p className="text-[14px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(cdiBalance)}</p>
          </div>
          <Link
            href="/cliente/cdi"
            className="shrink-0 text-[10.5px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
          >
            Ver CDI
          </Link>
        </div>
      )}

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
        <p className="text-[10.5px] text-slate-600 mt-1.5 flex items-center justify-between">
          <span>Disponível: <span className="text-emerald-400 font-semibold">R$ {formatBRL(saldo)}</span></span>
          <span className="text-slate-700">Plano {plano}</span>
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

      {/* Conta destino */}
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
          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 pt-0.5">
            <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Saldo restante: R$ {formatBRL(saldo - parsed)}
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
