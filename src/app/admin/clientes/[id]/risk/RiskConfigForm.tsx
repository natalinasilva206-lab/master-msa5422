'use client'

import { useTransition, useState } from 'react'
import { saveRiskConfig } from './actions'

interface Props {
  merchantId: string
  initial: {
    riskReservePercent: number
    riskReleaseDays: number
    riskLevel: string
    riskReserveMin: number
    riskReserveMax: number
    riskNotes: string
  }
}

export default function RiskConfigForm({ merchantId, initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null)

  const [form, setForm] = useState(initial)

  function set(k: keyof typeof form, v: string | number) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    startTransition(async () => {
      const res = await saveRiskConfig(merchantId, form)
      if (res.error) setMsg({ text: res.error })
      else setMsg({ ok: true, text: 'Configuração salva com sucesso.' })
    })
  }

  const levelColors: Record<string, string> = {
    LOW: 'text-emerald-400',
    MEDIUM: 'text-amber-400',
    HIGH: 'text-red-400',
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Percentual de reserva */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Percentual de Reserva (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.riskReservePercent}
            onChange={(e) => set('riskReservePercent', parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Prazo de liberação */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Prazo de Liberação (dias)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={form.riskReleaseDays}
            onChange={(e) => set('riskReleaseDays', parseInt(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Nível de risco */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Nível de Risco</label>
          <select
            value={form.riskLevel}
            onChange={(e) => set('riskLevel', e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="LOW">Baixo</option>
            <option value="MEDIUM">Médio</option>
            <option value="HIGH">Alto</option>
          </select>
          <p className={`text-xs mt-1 ${levelColors[form.riskLevel] ?? 'text-slate-400'}`}>
            {form.riskLevel === 'LOW' && 'Seller com histórico saudável.'}
            {form.riskLevel === 'MEDIUM' && 'Monitoramento padrão.'}
            {form.riskLevel === 'HIGH' && 'Atenção: seller de alto risco!'}
          </p>
        </div>

        {/* Reserva mínima */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Reserva Mínima (R$) — 0 = sem mínimo</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.riskReserveMin}
            onChange={(e) => set('riskReserveMin', parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Reserva máxima */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Reserva Máxima (R$) — 0 = sem máximo</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.riskReserveMax}
            onChange={(e) => set('riskReserveMax', parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Observações Internas</label>
        <textarea
          rows={3}
          value={form.riskNotes}
          onChange={(e) => set('riskNotes', e.target.value)}
          placeholder="Notas internas sobre o perfil de risco deste seller..."
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
      >
        {isPending ? 'Salvando...' : 'Salvar Configuração'}
      </button>
    </form>
  )
}
