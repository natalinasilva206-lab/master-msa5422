'use client'

import { useState, useTransition } from 'react'
import { resetMerchantPassword } from '../actions'

interface Props {
  merchantId: string
  hasUser: boolean
}

export function ResetPasswordButton({ merchantId, hasUser }: Props) {
  const [result, setResult] = useState<{ tempPassword?: string; error?: string } | null>(null)
  const [resetting, startReset] = useTransition()

  function handleReset() {
    if (!confirm('Isso vai redefinir a senha do seller. Uma senha temporária será gerada. Confirmar?')) return
    startReset(async () => {
      const r = await resetMerchantPassword(merchantId)
      setResult(r ?? null)
    })
  }

  if (!hasUser) return null

  return (
    <div>
      <button
        onClick={handleReset}
        disabled={resetting}
        className="flex items-center gap-2 px-3.5 py-1.5 text-[12px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-40 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        {resetting ? 'Redefinindo...' : 'Resetar Senha'}
      </button>
      {result?.error && <p className="text-[11.5px] text-red-400 mt-2">{result.error}</p>}
      {result?.tempPassword && (
        <div className="mt-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 space-y-1">
          <p className="text-[10.5px] font-bold text-amber-400 uppercase tracking-wider">Senha temporária gerada</p>
          <p className="text-[14px] font-mono font-bold text-white tracking-widest">{result.tempPassword}</p>
          <p className="text-[10px] text-slate-500">Passe esta senha ao seller. Ele deve alterá-la ao fazer login.</p>
        </div>
      )}
    </div>
  )
}
