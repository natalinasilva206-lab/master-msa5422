'use client'

import { useState } from 'react'
import { markTicketReplied } from './actions'

interface Props {
  ticketId: string
  sellerName: string
}

export function TicketActions({ ticketId, sellerName }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handle() {
    if (!confirm(`Marcar ticket de "${sellerName}" como respondido?`)) return
    setLoading(true)
    try {
      await markTicketReplied(ticketId, sellerName)
      setDone(true)
    } catch (e: any) {
      alert(e?.message ?? 'Erro ao marcar como respondido.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="shrink-0 text-[9.5px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
        Respondido
      </span>
    )
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="shrink-0 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
    >
      {loading ? '…' : 'Marcar respondido'}
    </button>
  )
}
