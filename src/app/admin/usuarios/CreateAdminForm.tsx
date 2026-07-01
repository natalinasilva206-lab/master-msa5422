'use client'

import { useState, useRef } from 'react'
import { createAdminUser } from './actions'

export function CreateAdminForm() {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData(e.currentTarget)
      await createAdminUser(fd)
      setSuccess(true)
      formRef.current?.reset()
      setTimeout(() => { setOpen(false); setSuccess(false) }, 1500)
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao criar usuário.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setSuccess(false) }}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-4 py-2.5 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Novo Admin
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <p className="text-[14px] font-semibold text-white">Criar Administrador</p>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {[
                { name: 'name',     label: 'Nome completo', type: 'text',     placeholder: 'Ex: Maria Silva' },
                { name: 'email',    label: 'E-mail',        type: 'email',    placeholder: 'admin@empresa.com' },
                { name: 'password', label: 'Senha',         type: 'password', placeholder: 'Mínimo 8 caracteres' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  <input
                    name={f.name}
                    type={f.type}
                    placeholder={f.placeholder}
                    required
                    className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2.5 text-[12.5px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                </div>
              ))}

              {error && (
                <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
              {success && (
                <p className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  Administrador criado com sucesso!
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/60 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-500 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Criando…' : 'Criar Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
