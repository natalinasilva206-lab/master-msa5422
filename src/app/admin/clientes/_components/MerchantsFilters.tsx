'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useCallback } from 'react'

interface MerchantsFiltersProps {
  currentQ: string
  currentStatus: string
  currentType: string
}

export function MerchantsFilters({ currentQ, currentStatus, currentType }: MerchantsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`/admin/clientes?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handleSearch(value: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam('q', value), 400)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou documento..."
          defaultValue={currentQ}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
      </div>

      {/* Status */}
      <select
        defaultValue={currentStatus}
        onChange={(e) => updateParam('status', e.target.value)}
        className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm min-w-[160px]"
      >
        <option value="">Todos os status</option>
        <option value="active">Ativo</option>
        <option value="review">Em análise</option>
        <option value="blocked">Bloqueado</option>
      </select>

      {/* Type */}
      <select
        defaultValue={currentType}
        onChange={(e) => updateParam('type', e.target.value)}
        className="px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm min-w-[160px]"
      >
        <option value="">Todos os tipos</option>
        <option value="ecommerce">E-commerce</option>
        <option value="infoprodutor">Infoprodutor</option>
      </select>
    </div>
  )
}
