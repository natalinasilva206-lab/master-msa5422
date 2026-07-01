'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createMerchant } from '../actions'

const SERVER_ERRORS: Record<string, string> = {
  campos_obrigatorios: 'Preencha todos os campos obrigatórios.',
  email_duplicado: 'Já existe um cliente cadastrado com este e-mail.',
}

type FormErrors = Partial<
  Record<'name' | 'email' | 'document' | 'type' | 'status' | 'plan', string>
>

const base =
  'w-full px-4 py-2.5 bg-slate-800/60 border rounded-lg text-white placeholder-slate-600 text-[13px] focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition'
const ok = `${base} border-slate-700/50`
const err = `${base} border-red-500`

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[12px] text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}

export default function NovoClientePage() {
  const searchParams = useSearchParams()
  const errorKey = searchParams.get('error')
  const serverError = errorKey ? (SERVER_ERRORS[errorKey] ?? 'Ocorreu um erro. Tente novamente.') : null

  const [errors, setErrors] = useState<FormErrors>({})
  const [pending, setPending] = useState(false)

  function validate(data: FormData): FormErrors {
    const e: FormErrors = {}
    if (!data.get('name')?.toString().trim()) e.name = 'Nome é obrigatório.'
    if (!data.get('email')?.toString().trim()) e.email = 'E-mail é obrigatório.'
    if (!data.get('document')?.toString().trim()) e.document = 'Documento é obrigatório.'
    if (!data.get('type')?.toString()) e.type = 'Tipo é obrigatório.'
    if (!data.get('status')?.toString()) e.status = 'Status é obrigatório.'
    if (!data.get('plan')?.toString()) e.plan = 'Plano é obrigatório.'
    return e
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget)
    const fieldErrors = validate(data)
    if (Object.keys(fieldErrors).length > 0) {
      e.preventDefault()
      setErrors(fieldErrors)
      return
    }
    // Validation passed — let the form submit naturally to the server action
    setErrors({})
    setPending(true)
  }

  const cls = (f: keyof FormErrors) => (errors[f] ? err : ok)
  const clear = (f: keyof FormErrors) => () => setErrors((p) => ({ ...p, [f]: undefined }))

  return (
    <div>
      <Topbar title="Novo cliente" subtitle="Cadastrar e-commerce ou infoprodutor na plataforma" />
      <div className="p-6 max-w-2xl">
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">
            Clientes
          </Link>
          <span>/</span>
          <span className="text-white">Novo cliente</span>
        </nav>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Dados do cliente</h2>
          </div>

          <form action={createMerchant} onSubmit={handleSubmit} className="p-6 space-y-5">
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Nome" error={errors.name}>
                <input
                  name="name"
                  type="text"
                  placeholder="Ex: Loja Alpha"
                  className={cls('name')}
                  onChange={clear('name')}
                />
              </Field>
              <Field label="E-mail" error={errors.email}>
                <input
                  name="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  className={cls('email')}
                  onChange={clear('email')}
                />
              </Field>
            </div>

            <Field label="Documento (CNPJ ou CPF)" error={errors.document}>
              <input
                name="document"
                type="text"
                placeholder="00.000.000/0001-00"
                className={cls('document')}
                onChange={clear('document')}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Tipo" error={errors.type}>
                <select name="type" defaultValue="" className={cls('type')} onChange={clear('type')}>
                  <option value="" disabled>Selecione o tipo</option>
                  <option value="ECOMMERCE">E-commerce</option>
                  <option value="INFOPRODUTOR">Infoprodutor</option>
                  <option value="MARKETPLACE">Marketplace</option>
                  <option value="SERVICOS">Prestador de Serviços</option>
                </select>
              </Field>
              <Field label="Status inicial" error={errors.status}>
                <select name="status" defaultValue="" className={cls('status')} onChange={clear('status')}>
                  <option value="" disabled>Selecione o status</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="REVIEW">Em análise</option>
                  <option value="BLOCKED">Bloqueado</option>
                </select>
              </Field>
            </div>

            <Field label="Taxa CDI (% ao mês)">
              <input
                name="cdiRate"
                type="number"
                step="0.01"
                min="0"
                max="10"
                defaultValue="1.00"
                placeholder="1.00"
                className={ok}
              />
            </Field>

            <Field label="Plano" error={errors.plan}>
              <select name="plan" defaultValue="" className={cls('plan')} onChange={clear('plan')}>
                <option value="" disabled>Selecione o plano</option>
                <option value="Start">Start</option>
                <option value="Growth">Growth</option>
                <option value="Prime">Prime</option>
                <option value="Black">Black</option>
              </select>
            </Field>

            {/* Acesso de login (opcional) */}
            <div className="border-t border-slate-700/50 pt-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">Acesso ao painel do seller</p>
                <p className="text-xs text-slate-500 mt-0.5">Opcional — preencha para criar login de acesso à área do seller.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Nome de acesso">
                  <input
                    name="user_name"
                    type="text"
                    placeholder="Nome completo (opcional)"
                    className={ok}
                  />
                </Field>
                <Field label="Senha de acesso">
                  <input
                    name="user_password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className={ok}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/admin/clientes"
                className="px-4 py-2.5 text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Cancelar
              </Link>
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
                    Salvando...
                  </>
                ) : (
                  'Salvar cliente'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
