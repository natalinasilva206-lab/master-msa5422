'use client'

import { useState, useTransition } from 'react'
import { replyToTicket } from './actions'

interface Props { ticketId: string }

export function TicketThread({ ticketId }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const r = await replyToTicket(ticketId, text)
      if (r.error) { setResult('err:' + r.error); return }
      setResult('ok')
      setText('')
      setTimeout(() => { setOpen(false); setResult(null) }, 1400)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
      >
        Responder →
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setResult(null) }}
        rows={3}
        placeholder="Sua resposta…"
        className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50"
      />
      {result === 'ok' && <p className="text-[11px] text-emerald-400">✓ Resposta enviada!</p>}
      {result?.startsWith('err:') && <p className="text-[11px] text-red-400">{result.slice(4)}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || !text.trim()}
          className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
        >
          {isPending ? 'Enviando…' : 'Enviar resposta'}
        </button>
        <button onClick={() => { setOpen(false); setText(''); setResult(null) }} className="text-[11px] text-slate-500 hover:text-slate-300">
          Cancelar
        </button>
      </div>
    </div>
  )
}
