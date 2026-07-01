'use client'

import { useState, useTransition } from 'react'
import { markTicketReplied } from './actions'

interface Props {
  ticketId: string
  sellerName: string
}

export function TicketActions({ ticketId, sellerName }: Props) {
  const [open, setOpen]   = useState(false)
  const [reply, setReply] = useState('')
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  function handleSubmit() {
    if (!reply.trim()) { setError('Escreva uma resposta.'); return }
    setError('')
    start(async () => {
      try {
        await markTicketReplied(ticketId, sellerName, reply)
        setDone(true)
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao responder.')
      }
    })
  }

  if (done) {
    return (
      <span className="shrink-0 text-[9.5px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
        Respondido
      </span>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-full transition-colors"
      >
        Responder
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-2 w-full">
      <textarea
        value={reply}
        onChange={(e) => { setReply(e.target.value); setError('') }}
        placeholder="Digite a resposta para o cliente..."
        rows={3}
        className="w-full text-[12px] bg-slate-800/60 border border-slate-700/60 text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-slate-600 resize-none"
      />
      {error && <p className="text-[10.5px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors"
        >
          {isPending ? 'Enviando…' : 'Enviar resposta'}
        </button>
        <button
          onClick={() => { setOpen(false); setReply(''); setError('') }}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
