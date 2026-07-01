'use client'

import { useState } from 'react'
import { changePassword } from './actions'

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await changePassword(new FormData(e.currentTarget))
      setSuccess(true)
      setOpen(false)
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setSuccess(false) }}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 rounded-xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[12.5px] font-semibold text-slate-200">Alterar Senha</p>
            <p className="text-[10.5px] text-slate-600">Atualize sua senha de acesso</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {success && (
        <p className="text-center text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          Senha alterada com sucesso.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#0d1117] border border-slate-800/80 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[14px] font-semibold text-white">Alterar Senha</p>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handle} className="space-y-3">
              {[
                { name: 'currentPassword', label: 'Senha atual' },
                { name: 'newPassword',     label: 'Nova senha' },
                { name: 'confirmPassword', label: 'Confirmar nova senha' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{f.label}</label>
                  <input
                    type="password"
                    name={f.name}
                    required
                    minLength={f.name === 'currentPassword' ? 1 : 8}
                    className="w-full bg-slate-900/80 border border-slate-700/60 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-700 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                  />
                </div>
              ))}

              {error && (
                <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 rounded-lg py-2.5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg py-2.5 transition-colors"
                >
                  {loading ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
