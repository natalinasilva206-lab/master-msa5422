'use client'

import { useTransition } from 'react'
import { setIrIofSimulation } from './actions'

interface Props {
  enabled: boolean
}

export function IrIofToggle({ enabled }: Props) {
  const [isPending, startT] = useTransition()

  function toggle() {
    startT(async () => { await setIrIofSimulation(!enabled) })
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-white leading-none">Simulação de IR e IOF</p>
        <p className="text-[10.5px] text-slate-500 mt-0.5">
          Exibe estimativa educativa de imposto no painel do seller
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        aria-label={enabled ? 'Desativar simulação de IR/IOF' : 'Ativar simulação de IR/IOF'}
        className={`relative shrink-0 w-10 h-5.5 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-50 ${
          enabled ? 'bg-emerald-600' : 'bg-slate-700'
        }`}
        style={{ height: 22, width: 40 }}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
