'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { addToCdi } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  pendingBalance: number
  currentBalance: number
  cdiRate: number
}

export function AddToCdiButton({ pendingBalance, currentBalance, cdiRate }: Props) {
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
  const newBalance = currentBalance + parsed
  const newRend = newBalance * (cdiRate / 100)

  function handleAll() {
    setAmount(formatBRL(pendingBalance))
  }

  function handleSubmit() {
    if (parsed <= 0) { setError('Informe um valor.'); return }
    if (parsed > pendingBalance) { setError('Valor maior que o saldo pendente.'); return }
    setError('')
    startTransition(async () => {
      const res = await addToCdi(parsed)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setTimeout(() => { setOpen(false); setSuccess(false) }, 1800)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={pendingBalance <= 0}
        className={`flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold rounded-lg transition-colors ${
          pendingBalance > 0
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-slate-800/80 border border-slate-700/60 text-slate-500 cursor-not-allowed'
        }`}
        title={pendingBalance <= 0 ? 'Sem saldo pendente disponível' : undefined}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {pendingBalance > 0 ? 'Aportar no CDI' : 'Sem saldo pendente'}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-md bg-[#0d1420] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white leading-none">Aportar no CDI</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Mover saldo pendente para rendimento</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800/60">
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
                <p className="text-[16px] font-bold text-white">Aporte realizado!</p>
                <p className="text-[12px] text-slate-500 mt-1.5">
                  R$ {formatBRL(parsed)} adicionado ao seu saldo CDI.
                </p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">

                {/* Saldo pendente disponível */}
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">Saldo pendente disponível</p>
                    <p className="text-[18px] font-bold text-amber-400 tabular-nums">R$ {formatBRL(pendingBalance)}</p>
                  </div>
                  <button
                    onClick={handleAll}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Usar tudo
                  </button>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor a aportar</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-500 pointer-events-none">R$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError('') }}
                      placeholder="0,00"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[15px] font-bold tabular-nums rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition placeholder-slate-700"
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
                {parsed > 0 && parsed <= pendingBalance && (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5 space-y-2">
                    <p className="text-[10.5px] font-bold text-emerald-500 uppercase tracking-wider">Após o aporte</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-slate-600 mb-0.5">Novo saldo CDI</p>
                        <p className="text-[14px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(newBalance)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-600 mb-0.5">Rend. mensal estimado</p>
                        <p className="text-[14px] font-bold text-white tabular-nums">R$ {formatBRL(newRend)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                      <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Saldo pendente restante: R$ {formatBRL(pendingBalance - parsed)}
                    </div>
                  </div>
                )}

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
                    disabled={isPending || parsed <= 0 || parsed > pendingBalance}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isPending ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Aportando...
                      </>
                    ) : 'Confirmar aporte'}
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
