'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const PERIODS = [
  { label: 'Hoje',    value: '1d'  },
  { label: '7 dias',  value: '7d'  },
  { label: '30 dias', value: '30d' },
  { label: '90 dias', value: '90d' },
  { label: 'Total',   value: 'all' },
]

export function PeriodFilter() {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const current     = searchParams.get('periodo') ?? '30d'

  function select(v: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('periodo', v)
    router.replace(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800/70 rounded-xl p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${
            current === p.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
