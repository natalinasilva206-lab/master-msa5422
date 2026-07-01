'use client'
import { useState, useTransition, useEffect } from 'react'
import { updateBalance } from './actions'

interface Props {
  merchantId: string
  initialBalance: number
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BalanceInput({ merchantId, initialBalance }: Props) {
  const [editing, setEditing]         = useState(false)
  const [value, setValue]             = useState(String(initialBalance.toFixed(2)).replace('.', ','))
  const [reason, setReason]           = useState('')
  const [current, setCurrent]         = useState(initialBalance)
  const [isPending, startTransition]  = useTransition()
  const [saved, setSaved]             = useState(false)
  const [err, setErr]                 = useState('')

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [saved])

  const handleOpen = () => {
    setValue(formatBRL(current))
    setReason('')
    setErr('')
    setEditing(true)
    setSaved(false)
  }

  const handleSave = () => {
    const parsed = parseFloat(value.replace(/\./g, '').replace(',', '.'))
    if (isNaN(parsed) || parsed < 0) { setErr('Valor inválido.'); return }
    if (!reason.trim()) { setErr('Motivo é obrigatório.'); return }
    setErr('')
    startTransition(async () => {
      const res = await updateBalance(merchantId, parsed, reason.trim())
      if (res.error) { setErr(res.error); return }
      setCurrent(parsed)
      setValue(formatBRL(parsed))
      setReason('')
      setEditing(false)
      setSaved(true)
    })
  }

  const handleCancel = () => {
    setValue(formatBRL(current))
    setReason('')
    setErr('')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 min-w-[260px]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 shrink-0">R$</span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Escape') handleCancel() }}
            className="w-28 px-2 py-1 text-[13px] tabular-nums bg-slate-800 border border-emerald-500/50 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
          />
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo do ajuste (obrigatório)"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          className="w-full px-2 py-1 text-[11.5px] bg-slate-800 border border-slate-600/50 text-slate-200 placeholder-slate-600 rounded-lg focus:outline-none focus:border-amber-500/60"
        />
        {err && <p className="text-[10.5px] text-red-400">{err}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Salvando…
              </>
            ) : 'Salvar'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="text-[11.5px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleOpen}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group"
      title="Clique para editar o saldo"
    >
      {saved ? (
        <span className="inline-flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          R$ {formatBRL(current)}
        </span>
      ) : (
        <>
          R$ {formatBRL(current)}
          <svg
            className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </>
      )}
    </button>
  )
}
