'use client'

import { useState, useTransition } from 'react'
import { setCdiPrazo } from './actions'

interface Props {
  merchantId: string
  expiresAt: string | null  // ISO date string or null
}

function formatDateBR(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso + 'T23:59:59').getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

const presets = [
  { label: '1 mês',   months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses',months: 12 },
]

function addMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function CdiPrazoInput({ merchantId, expiresAt }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(expiresAt ?? '')
  const [current, setCurrent] = useState(expiresAt)
  const [isPending, startTransition] = useTransition()

  const days = daysLeft(current)
  const expired = days !== null && days < 0
  const soonExpires = days !== null && days >= 0 && days <= 7

  function handleSave() {
    startTransition(async () => {
      await setCdiPrazo(merchantId, date || null)
      setCurrent(date || null)
      setOpen(false)
    })
  }

  function handleClear() {
    startTransition(async () => {
      await setCdiPrazo(merchantId, null)
      setCurrent(null)
      setDate('')
      setOpen(false)
    })
  }

  function handlePreset(months: number) {
    setDate(addMonths(months))
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11.5px] font-medium transition-colors group"
        title="Clique para definir prazo CDI"
      >
        {current ? (
          <span className={
            expired ? 'text-red-400' :
            soonExpires ? 'text-amber-400' :
            'text-slate-300'
          }>
            {expired ? '⚠ ' : ''}{formatDateBR(current)}
            {days !== null && !expired && (
              <span className="ml-1 text-[10px] text-slate-600">({days}d)</span>
            )}
            {expired && (
              <span className="ml-1 text-[10px] text-red-600">(vencido)</span>
            )}
          </span>
        ) : (
          <span className="text-slate-700 group-hover:text-slate-400 transition-colors">— definir prazo</span>
        )}
        <svg className="w-3 h-3 text-slate-700 group-hover:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 space-y-3 min-w-[220px] shadow-xl z-10 relative">
      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.months)}
            className="text-[10.5px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2 py-0.5 rounded-md transition-colors"
          >
            +{p.label}
          </button>
        ))}
      </div>

      {/* Date input */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setOpen(false) }}
          className="flex-1 px-2 py-1.5 text-[12px] bg-slate-900 border border-slate-700/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 flex-1 text-[11.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-1.5 transition-colors"
        >
          {isPending ? (
            <>
              <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Salvando…
            </>
          ) : 'Salvar'}
        </button>
        {current && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="text-[11px] text-red-400 hover:text-red-300 transition-colors px-1.5"
            title="Remover prazo"
          >
            Remover
          </button>
        )}
        <button
          onClick={() => { setDate(current ?? ''); setOpen(false) }}
          className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
