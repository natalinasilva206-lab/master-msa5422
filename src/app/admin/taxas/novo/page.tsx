'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { createFeePlan } from '../actions'

const errorMessages: Record<string, string> = {
  name_required: 'O nome do plano é obrigatório.',
  name_exists: 'Já existe um plano com esse nome.',
  negative_margin: 'O custo (%) não pode ser maior que a taxa cobrada (%) — margem ficaria negativa.',
}

export default function NovoPlanoPage() {
  const searchParams = useSearchParams()
  const errorKey = searchParams.get('error')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

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
    <div>
      <Topbar title="Novo plano de taxa" subtitle="Cadastrar plano de taxas e margens" />
      <div className="p-6 max-w-2xl">
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/admin/taxas" className="hover:text-white transition-colors">Taxas</Link>
          <span>/</span>
          <span className="text-white">Novo plano</span>
        </nav>

        {errorKey && errorMessages[errorKey] && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {errorMessages[errorKey]}
          </div>
        )}

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Dados do plano</h2>
          </div>

          <form action={createFeePlan} onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Nome do plano *</label>
              <input
                name="name"
                type="text"
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
                  defaultValue="0"
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
                  defaultValue="0"
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
                  defaultValue="0"
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
                  defaultValue="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
                <label className="block text-sm text-slate-400 mb-1.5">Prazo de saque</label>
                <select
                  name="withdrawalDeadline"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  defaultValue="1 dia útil"
                >
                  <option value="Instantâneo">Instantâneo</option>
                  <option value="Mesmo dia">Mesmo dia</option>
                  <option value="1 dia útil">1 dia útil</option>
                  <option value="2 dias úteis">2 dias úteis</option>
                  <option value="3 dias úteis">3 dias úteis</option>
                </select>
                <p className="text-slate-600 text-[11px] mt-1">Prazo exibido ao seller na página de saques</p>
              </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors"
              >
                {isPending ? 'Salvando...' : 'Criar plano'}
              </button>
              <Link
                href="/admin/taxas"
                className="px-5 py-2.5 text-slate-400 hover:text-white text-[13px] font-semibold rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
