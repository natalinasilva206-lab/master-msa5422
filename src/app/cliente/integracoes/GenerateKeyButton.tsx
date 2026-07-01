'use client'

import { useState, useTransition } from 'react'
import { gerarApiKey } from './actions'

export function GenerateKeyButton({ hasKey }: { hasKey: boolean }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handle() {
    if (hasKey && !confirm('Isso invalidará sua API Key atual. Todas as integrações usando a chave antiga pararão de funcionar. Continuar?')) return
    setError(null)
    startTransition(async () => {
      const res = await gerarApiKey()
      if (!res.ok) { setError(res.error ?? 'Erro ao gerar chave'); return }
      setDone(true)
      // Reload para exibir a nova chave
      window.location.reload()
    })
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {error && <span className="text-[11px] text-red-400">{error}</span>}
      {done && <span className="text-[11px] text-emerald-400">Chave gerada! Recarregando…</span>}
      <button
        onClick={handle}
        disabled={pending}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold rounded-lg border transition-colors disabled:opacity-50
          bg-slate-800/60 hover:bg-slate-700 border-slate-700/40 text-slate-300 hover:text-white"
      >
        {pending ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        )}
        {pending ? 'Gerando…' : hasKey ? 'Regerar API Key' : 'Gerar API Key'}
      </button>
    </div>
  )
}
