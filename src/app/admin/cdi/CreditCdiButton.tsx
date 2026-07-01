'use client'

import { useState, useTransition } from 'react'
import { creditCdiToAll } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  lastCreditAt: string | null
  activeCount: number
}

export function CreditCdiButton({ lastCreditAt, activeCount }: Props) {
  const [open, setOpen]       = useState(false)
  const [result, setResult]   = useState<{ count: number; totalCredited: number } | null>(null)
  const [isPending, startT]   = useTransition()

  function handleCredit() {
    startT(async () => {
      const res = await creditCdiToAll()
      setResult(res)
    })
  }

  const lastLabel = lastCreditAt
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(lastCreditAt))
    : 'Nunca executado'

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null) }}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[12.5px] font-semibold rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Creditar CDI
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0d1420] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-white leading-none">Creditar CDI</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Ciclo mensal de rendimento</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {result ? (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[16px] font-bold text-white">CDI creditado!</p>
                  <p className="text-[12px] text-slate-500 mt-1.5">
                    {result.count} seller{result.count !== 1 ? 's' : ''} receberam rendimento
                  </p>
                  <p className="text-[20px] font-bold text-emerald-400 tabular-nums mt-3">
                    R$ {formatBRL(result.totalCredited)}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">total creditado agora</p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-5 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[13px] font-semibold rounded-lg transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">Sellers ativos com saldo CDI</span>
                      <span className="text-white font-semibold">{activeCount}</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500">Último ciclo executado</span>
                      <span className="text-slate-400 font-medium">{lastLabel}</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-[11.5px] text-amber-400">
                    Isso vai creditar o rendimento mensal (balance × cdiRate%) para todos os sellers ativos com saldo em CDI. Execute uma vez por mês.
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setOpen(false)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCredit}
                      disabled={isPending}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isPending ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Creditando...
                        </>
                      ) : 'Executar ciclo CDI'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
