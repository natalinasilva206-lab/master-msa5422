'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateFeePlan } from '../../actions'
import type { FeePlan } from '@prisma/client'

const errorMessages: Record<string, string> = {
  name_required: 'O nome do plano é obrigatório.',
  name_exists: 'Já existe um plano com esse nome.',
}

export function EditPlanForm({ plan, errorKey }: { plan: FeePlan; errorKey: string | null }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const action = updateFeePlan.bind(null, plan.id)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const errs: Record<string, string> = {}
    if (!name) errs.name = 'Nome obrigatório'
    if (Object.keys(errs).length > 0) {
      e.preventDefault()
      setErrors(errs)
      return
    }
    setErrors({})
    startTransition(() => {})
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
      {errorKey && errorMessages[errorKey] && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {errorMessages[errorKey]}
        </div>
      )}

      <div>
        <label className="block text-sm text-slate-400 mb-1.5">Nome do plano *</label>
        <input
          name="name"
          type="text"
          defaultValue={plan.name}
          placeholder="Ex: Start, Growth, Prime, Black"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Taxa cobrada (%)</label>
          <input
            name="chargedPercent"
            type="number"
            step="0.01"
            min="0"
            defaultValue={plan.chargedPercent}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Taxa cobrada fixa (R$)</label>
          <input
            name="chargedFixed"
            type="number"
            step="0.01"
            min="0"
            defaultValue={plan.chargedFixed}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Custo (%)</label>
          <input
            name="costPercent"
            type="number"
            step="0.01"
            min="0"
            defaultValue={plan.costPercent}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Custo fixo (R$)</label>
          <input
            name="costFixed"
            type="number"
            step="0.01"
            min="0"
            defaultValue={plan.costFixed}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <Link
          href={`/admin/taxas/${plan.id}`}
          className="px-5 py-2.5 text-slate-400 hover:text-white text-sm font-semibold rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
