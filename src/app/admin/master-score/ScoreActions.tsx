'use client'

import { useState, useTransition } from 'react'
import { recalcAllScores, recalcSellerScore } from './actions'

export function RecalcAllButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleClick() {
    startTransition(async () => {
      setResult(null)
      const r = await recalcAllScores()
      setResult(r.ok ? `✓ ${r.updated} sellers atualizados` : `✗ ${r.error}`)
      setTimeout(() => setResult(null), 4000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className={`text-[11px] font-semibold ${result.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
          {result}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors"
      >
        {pending ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        {pending ? 'Recalculando…' : 'Recalcular todos'}
      </button>
    </div>
  )
}

export function RecalcSellerButton({ merchantId }: { merchantId: string }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleClick() {
    startTransition(async () => {
      await recalcSellerScore(merchantId)
      setDone(true)
      setTimeout(() => setDone(false), 2500)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Recalcular score deste seller"
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
        done
          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
          : 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border-slate-700/40'
      }`}
    >
      {pending ? (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : done ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
      {done ? 'OK' : ''}
    </button>
  )
}
