'use client'

import { useTransition } from 'react'
import { toggleMerchantStatus } from '../actions'

interface ToggleStatusButtonProps {
  id: string
  status: string
}

export function ToggleStatusButton({ id, status }: ToggleStatusButtonProps) {
  const [pending, startTransition] = useTransition()
  const action = toggleMerchantStatus.bind(null, id)

  if (status === 'REVIEW') {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-500 bg-slate-800/50 border border-slate-700/40 rounded-lg cursor-default">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Em análise — edite para alterar status
      </span>
    )
  }

  const isBlocked = status === 'BLOCKED'

  return (
    <form
      action={action}
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(() => action())
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isBlocked
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
            : 'bg-red-600/90 hover:bg-red-600 text-white'
        }`}
      >
        {pending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {isBlocked ? 'Ativando...' : 'Bloqueando...'}
          </>
        ) : isBlocked ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ativar cliente
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Bloquear cliente
          </>
        )}
      </button>
    </form>
  )
}
