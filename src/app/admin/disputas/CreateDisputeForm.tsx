'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDispute, DisputeType } from './actions'
import { TYPE_LABEL, ALL_TYPES } from './constants'

interface Merchant { id: string; name: string }

export default function CreateDisputeForm({ merchants }: { merchants: Merchant[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    type:            'CHARGEBACK' as DisputeType,
    merchantId:      '',
    saleLogId:       '',
    contestedAmount: '',
    deadline:        '',
    assignedTo:      '',
    notes:           '',
  })

  function set(k: keyof typeof form, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createDispute({
        type:            form.type,
        merchantId:      form.merchantId,
        saleLogId:       form.saleLogId.trim() || undefined,
        contestedAmount: parseFloat(form.contestedAmount) || 0,
        deadline:        form.deadline || undefined,
        assignedTo:      form.assignedTo.trim() || undefined,
        notes:           form.notes.trim() || undefined,
      })
      if (res.error) { setError(res.error); return }
      router.push(`/admin/disputas/${res.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tipo */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Tipo do caso *</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  form.type === t
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-white'
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Seller */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Seller vinculado *</label>
          <select
            required
            value={form.merchantId}
            onChange={(e) => set('merchantId', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="">Selecione...</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Valor contestado */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Valor contestado (R$) *</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.contestedAmount}
            onChange={(e) => set('contestedAmount', e.target.value)}
            placeholder="0,00"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Transação vinculada */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">ID da transação (opcional)</label>
          <input
            type="text"
            value={form.saleLogId}
            onChange={(e) => set('saleLogId', e.target.value)}
            placeholder="ex: cm4abc..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Prazo de análise</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => set('deadline', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Responsável */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Responsável interno</label>
          <input
            type="text"
            value={form.assignedTo}
            onChange={(e) => set('assignedTo', e.target.value)}
            placeholder="Nome ou e-mail do responsável"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Observações */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-400 mb-1">Observações iniciais</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Descreva o caso, contexto, histórico..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[13px] font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {isPending ? 'Abrindo caso...' : 'Abrir caso'}
        </button>
        <a href="/admin/disputas" className="text-sm text-slate-400 hover:text-white transition-colors">
          Cancelar
        </a>
      </div>
    </form>
  )
}
