'use client'

import { useState, useTransition } from 'react'
import { createClientAccess } from '../actions'

export function CreateAccessForm({ merchantId, email }: { merchantId: string; email: string }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [pwdError, setPwdError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const pwd = data.get('user_password')?.toString().trim() ?? ''
    if (pwd.length < 6) {
      setPwdError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setPwdError('')
    startTransition(async () => {
      await createClientAccess(merchantId, data)
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Acesso criado com sucesso! O seller pode fazer login com o e-mail <strong className="ml-1">{email}</strong>.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-slate-400 mb-1.5">Nome de acesso</label>
          <input
            name="user_name"
            type="text"
            placeholder="Nome completo (opcional)"
            className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-[13px] placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
          />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-slate-400 mb-1.5">Senha de acesso <span className="text-red-400">*</span></label>
          <input
            name="user_password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
            minLength={6}
            onChange={() => pwdError && setPwdError('')}
            className={`w-full px-4 py-2.5 bg-slate-800/60 border rounded-lg text-white text-[13px] placeholder-slate-600 focus:outline-none focus:ring-1 transition ${pwdError ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/30' : 'border-slate-700/50 focus:border-blue-500/60 focus:ring-blue-500/30'}`}
          />
          {pwdError && (
            <p className="mt-1.5 text-[11.5px] text-red-400 flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
              </svg>
              {pwdError}
            </p>
          )}
        </div>
      </div>
      <div className="text-xs text-slate-500">
        O e-mail de login será: <span className="text-slate-300 font-mono">{email}</span>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
      >
        {pending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Criando acesso...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Criar acesso
          </>
        )}
      </button>
    </form>
  )
}
