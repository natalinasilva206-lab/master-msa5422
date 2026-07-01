'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { withdrawFromCdi } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  cdiBalance: number
  cdiRate: number
}

export function WithdrawFromCdiButton({ cdiBalance, cdiRate }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setAmount('')
      setError('')
      setSuccess(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0
  const remaining = cdiBalance - parsed
  const rendAfter = remaining * (cdiRate / 100)

  function handleAll() {
    setAmount(formatBRL(cdiBalance))
  }

  function handleSubmit() {
    if (parsed <= 0) { setError('Informe um valor.'); return }
    if (parsed > cdiBalance) { setError('Valor maior que o saldo em CDI.'); return }
    setError('')
    startTransition(async () => {
      const res = await withdrawFromCdi(parsed)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setTimeout(() => { setOpen(false); setSuccess(false) }, 1800)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={cdiBalance <= 0}
        className={`flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold rounded-lg transition-colors ${
          cdiBalance > 0
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
            : 'bg-slate-800/60 border border-slate-700/40 text-slate-600 cursor-not-allowed'
        }`}
        title={cdiBalance <= 0 ? 'Sem saldo em CDI para resgatar' : undefined}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        Resgatar CDI
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-md bg-[#0d1420] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white leading-none">Resgatar do CDI</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Mover saldo CDI para disponível</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800/60"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-[16px] font-bold text-white">Resgate realizado!</p>
                <p className="text-[12px] text-slate-500 mt-1.5">
                  R$ {formatBRL(parsed)} movido para seu saldo disponível.
                </p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">

                {/* Saldo em CDI */}
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Saldo em CDI</p>
                    <p className="text-[18px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(cdiBalance)}</p>
                  </div>
                  <button
                    onClick={handleAll}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Resgatar tudo
                  </button>
                </div>

                {/* Input */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor a resgatar</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-500 pointer-events-none">R$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError('') }}
                      placeholder="0,00"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[15px] font-bold tabular-nums rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition placeholder-slate-700"
                    />
                  </div>
                  {error && (
                    <p className="text-[11.5px] text-red-400 mt-1.5 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                {/* Preview */}
                {parsed > 0 && parsed <= cdiBalance && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3.5 space-y-2">
                    <p className="text-[10.5px] font-bold text-amber-500 uppercase tracking-wider">Após o resgate</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-600 mb-0.5">CDI restante</p>
                        <p className="text-[14px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(remaining)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 mb-0.5">Novo rend. mensal</p>
                        <p className="text-[14px] font-bold text-white tabular-nums">R$ {formatBRL(rendAfter)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                      <svg className="w-3 h-3 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Disponível para saque: +R$ {formatBRL(parsed)}
                    </div>
                  </div>
                )}

                {/* Aviso */}
                <div className="flex items-start gap-2 text-[10.5px] text-slate-600 bg-slate-800/30 rounded-lg px-3 py-2.5">
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  O valor resgatado vai para seu saldo disponível e para de render CDI.
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || parsed <= 0 || parsed > cdiBalance}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isPending ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Resgatando...
                      </>
                    ) : 'Confirmar resgate'}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
