'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateMerchant } from '../../actions'

const SERVER_ERRORS: Record<string, string> = {
  campos_obrigatorios: 'Preencha todos os campos obrigatórios.',
  email_duplicado: 'Este e-mail já está sendo usado por outro cliente.',
}

type FormErrors = Partial<
  Record<'name' | 'email' | 'document' | 'type' | 'status' | 'plan', string>
>

const base =
  'w-full px-4 py-2.5 bg-slate-800/60 border rounded-lg text-white placeholder-slate-600 text-[13px] focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition'
const ok = `${base} border-slate-700/50`
const errCls = `${base} border-red-500`

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[12px] text-red-400 mt-1.5">{error}</p>}
    </div>
  )
}

export interface MerchantSnapshot {
  id: string
  name: string
  email: string
  document: string
  type: string
  status: string
  plan: string
}

interface EditFormProps {
  merchant: MerchantSnapshot
  errorKey: string | null
}

export function EditForm({ merchant, errorKey }: EditFormProps) {
  const serverError = errorKey
    ? (SERVER_ERRORS[errorKey] ?? 'Ocorreu um erro. Tente novamente.')
    : null

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
    setErrors({})
    setPending(true)
  }

  const cls = (f: keyof FormErrors) => (errors[f] ? errCls : ok)
  const clear = (f: keyof FormErrors) => () => setErrors((p) => ({ ...p, [f]: undefined }))
  const action = updateMerchant.bind(null, merchant.id)

  return (
    <form action={action} onSubmit={handleSubmit} className="p-6 space-y-5">
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
            defaultValue={merchant.name}
            placeholder="Ex: Loja Alpha"
            className={cls('name')}
            onChange={clear('name')}
          />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input
            name="email"
            type="email"
            defaultValue={merchant.email}
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
          defaultValue={merchant.document}
          placeholder="00.000.000/0001-00"
          className={cls('document')}
          onChange={clear('document')}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Tipo" error={errors.type}>
          <select
            name="type"
            defaultValue={merchant.type}
            className={cls('type')}
            onChange={clear('type')}
          >
            <option value="ECOMMERCE">E-commerce</option>
            <option value="INFOPRODUTOR">Infoprodutor</option>
          </select>
        </Field>
        <Field label="Status" error={errors.status}>
          <select
            name="status"
            defaultValue={merchant.status}
            className={cls('status')}
            onChange={clear('status')}
          >
            <option value="ACTIVE">Ativo</option>
            <option value="REVIEW">Em análise</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </Field>
      </div>

      <Field label="Plano" error={errors.plan}>
        <select
          name="plan"
          defaultValue={merchant.plan}
          className={cls('plan')}
          onChange={clear('plan')}
        >
          <option value="Start">Start</option>
          <option value="Growth">Growth</option>
          <option value="Prime">Prime</option>
          <option value="Black">Black</option>
        </select>
      </Field>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/admin/clientes/${merchant.id}`}
          className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
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
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Salvando...
            </>
          ) : (
            'Salvar alterações'
          )}
        </button>
      </div>
    </form>
  )
}
