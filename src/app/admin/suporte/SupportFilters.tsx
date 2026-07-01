'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ABERTO',             label: 'Aberto' },
  { value: 'EM_ANALISE',         label: 'Em análise' },
  { value: 'AGUARDANDO_CLIENTE', label: 'Aguard. cliente' },
  { value: 'RESPONDIDO',         label: 'Respondido' },
  { value: 'REABERTO',           label: 'Reaberto' },
  { value: 'FECHADO',            label: 'Fechado' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas prioridades' },
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'ALTA',    label: 'Alta' },
  { value: 'MEDIA',   label: 'Média' },
  { value: 'BAIXA',   label: 'Baixa' },
]

const PLAN_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  { value: 'Start',  label: 'Start' },
  { value: 'Growth', label: 'Growth' },
  { value: 'Prime',  label: 'Prime' },
  { value: 'Black',  label: 'Black' },
]

interface AdminUser { id: string; name: string }

interface Props {
  adminList:  AdminUser[]
  categories: string[]
}

export function SupportFilters({ adminList, categories }: Props) {
  const router = useRouter()
  const sp     = useSearchParams()

  const [q, setQ] = useState(sp.get('q') ?? '')
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  // Debounced text search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push({ q }), 380)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const hasFilters = !!(
    sp.get('q') || sp.get('status') || sp.get('priority') ||
    sp.get('category') || sp.get('assignedTo') || sp.get('plan') ||
    sp.get('from') || sp.get('to')
  )

  function clearFilters() {
    const params = new URLSearchParams()
    const tab = sp.get('tab')
    if (tab) params.set('tab', tab)
    setQ('')
    router.push(`?${params.toString()}`)
  }

  const selectClass = 'bg-slate-900/80 border border-slate-800/70 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500/50 h-8'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Seller, assunto…"
          className="bg-slate-900/80 border border-slate-800/70 rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 h-8 w-44"
        />
      </div>

      {/* Status */}
      <select
        value={sp.get('status') ?? ''}
        onChange={(e) => push({ status: e.target.value })}
        className={selectClass}
      >
        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Priority */}
      <select
        value={sp.get('priority') ?? ''}
        onChange={(e) => push({ priority: e.target.value })}
        className={selectClass}
      >
        {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Category */}
      <select
        value={sp.get('category') ?? ''}
        onChange={(e) => push({ category: e.target.value })}
        className={selectClass}
      >
        <option value="">Todas categorias</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Responsável */}
      <select
        value={sp.get('assignedTo') ?? ''}
        onChange={(e) => push({ assignedTo: e.target.value })}
        className={selectClass}
      >
        <option value="">Todos resp.</option>
        <option value="__none__">Sem responsável</option>
        {adminList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {/* Plan */}
      <select
        value={sp.get('plan') ?? ''}
        onChange={(e) => push({ plan: e.target.value })}
        className={selectClass}
      >
        {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Period */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={sp.get('from') ?? ''}
          onChange={(e) => push({ from: e.target.value })}
          className={`${selectClass} w-32`}
        />
        <span className="text-[10px] text-slate-700">até</span>
        <input
          type="date"
          value={sp.get('to') ?? ''}
          onChange={(e) => push({ to: e.target.value })}
          className={`${selectClass} w-32`}
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors px-2 h-8 border border-slate-800/50 rounded-lg"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
