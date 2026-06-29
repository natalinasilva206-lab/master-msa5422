'use client'

import { useTransition } from 'react'
import { deleteFeePlan } from '../actions'

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Excluir o plano "${name}"? Esta ação não pode ser desfeita.`)) return
    startTransition(() => deleteFeePlan(id))
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 hover:text-white hover:bg-red-600 border border-red-500/30 hover:border-red-600 rounded-lg transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {isPending ? 'Excluindo...' : 'Excluir'}
    </button>
  )
}
