'use client'
import { useState, useTransition } from 'react'
import { updateCdiRate } from './actions'

interface Props {
  merchantId: string
  initialRate: number
}

export function CdiRateInput({ merchantId, initialRate }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialRate.toFixed(2))
  const [current, setCurrent] = useState(initialRate)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const parsed = parseFloat(value.replace(',', '.'))
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return
    startTransition(async () => {
      await updateCdiRate(merchantId, parsed)
      setCurrent(parsed)
      setValue(parsed.toFixed(2))
      setEditing(false)
    })
  }

  const handleCancel = () => {
    setValue(current.toFixed(2))
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            step="0.01"
            min="0"
            max="100"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            className="w-[72px] pr-5 pl-2 py-1 text-[13px] tabular-nums bg-slate-800 border border-blue-500/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
          />
          <span className="absolute right-2 text-[11px] text-slate-400 pointer-events-none">%</span>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-[11.5px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          {isPending ? '...' : 'Salvar'}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="text-[11.5px] text-slate-600 hover:text-slate-400 transition-colors"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 text-[14px] font-bold text-blue-400 hover:text-blue-300 transition-colors group"
      title="Clique para editar a taxa CDI"
    >
      {current.toFixed(2)}%
      <svg
        className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  )
}
