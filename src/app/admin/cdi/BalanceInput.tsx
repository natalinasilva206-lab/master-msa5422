'use client'
import { useState, useTransition } from 'react'
import { updateBalance } from './actions'

interface Props {
  merchantId: string
  initialBalance: number
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BalanceInput({ merchantId, initialBalance }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(initialBalance.toFixed(2)).replace('.', ','))
  const [current, setCurrent] = useState(initialBalance)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const parsed = parseFloat(value.replace(/\./g, '').replace(',', '.'))
    if (isNaN(parsed) || parsed < 0) return
    startTransition(async () => {
      await updateBalance(merchantId, parsed)
      setCurrent(parsed)
      setValue(formatBRL(parsed))
      setEditing(false)
    })
  }

  const handleCancel = () => {
    setValue(formatBRL(current))
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center gap-1">
          <span className="text-[11px] text-slate-500 shrink-0">R$</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            className="w-28 px-2 py-1 text-[13px] tabular-nums bg-slate-800 border border-emerald-500/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
          />
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
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group"
      title="Clique para editar o saldo"
    >
      R$ {formatBRL(current)}
      <svg
        className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  )
}
