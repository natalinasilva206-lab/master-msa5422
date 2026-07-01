'use client'

import { useState, useTransition } from 'react'
import { assignDispute } from './actions'

export function AssignButton({ disputeId, current }: { disputeId: string; current: string | null }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [name, setName] = useState(current ?? '')

  if (current && !done) {
    return <span className="text-[12px] text-slate-400">{current}</span>
  }

  if (done) {
    return <span className="text-[12px] text-emerald-400">{name}</span>
  }

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await assignDispute(disputeId)
          if (r.name) { setName(r.name); setDone(true) }
        })
      }}
      className="text-[11px] font-semibold text-slate-500 hover:text-blue-400 bg-slate-800/60 hover:bg-blue-500/10 border border-slate-700/40 hover:border-blue-500/20 px-2 py-0.5 rounded-md transition-colors disabled:opacity-40 whitespace-nowrap"
    >
      {pending ? '...' : '+ Atribuir'}
    </button>
  )
}
