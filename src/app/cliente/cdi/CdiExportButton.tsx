'use client'

import { useState } from 'react'

type Period = '30d' | '90d' | 'ytd' | 'custom'

const PERIOD_LABELS: Record<Period, string> = {
  '30d':    'Últimos 30 dias',
  '90d':    'Últimos 90 dias',
  'ytd':    'Ano atual',
  'custom': 'Período personalizado',
}

function buildUrl(base: string, period: Period, from: string, to: string, format: 'csv' | 'pdf') {
  const p = new URLSearchParams({ period, format })
  if (period === 'custom') { p.set('from', from); p.set('to', to) }
  return `${base}?${p.toString()}`
}

interface Props {
  apiBase?: string
  merchantId?: string // admin-only
}

export function CdiExportButton({ apiBase, merchantId }: Props) {
  const [open, setOpen]     = useState(false)
  const [period, setPeriod] = useState<Period>('90d')
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')

  const endpoint = merchantId
    ? `/api/admin/cdi/export`
    : `/api/cliente/cdi/export`

  function makeUrl(format: 'csv' | 'pdf') {
    const p = new URLSearchParams({ period, format })
    if (merchantId) p.set('merchantId', merchantId)
    if (period === 'custom') { p.set('from', from); p.set('to', to) }
    return `${endpoint}?${p.toString()}`
  }

  function handleExport(format: 'csv' | 'pdf') {
    if (period === 'custom' && (!from || !to)) return
    const url = makeUrl(format)
    if (format === 'pdf') {
      window.open(url, '_blank')
    } else {
      const a = document.createElement('a')
      a.href = url
      a.click()
    }
    setOpen(false)
  }

  const customReady = period !== 'custom' || (!!from && !!to)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white text-[11.5px] font-semibold rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Baixar Extrato CDI
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0d1420] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white leading-none">Exportar Extrato CDI</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Escolha o período e o formato</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">

              {/* Period selector */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Período</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setPeriod(key)}
                      className={`px-3 py-2 rounded-lg text-[11.5px] font-semibold transition-colors text-left border ${
                        period === key
                          ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                          : 'bg-slate-800/40 border-slate-700/30 text-slate-400 hover:text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date range */}
              {period === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">De</label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[12px] text-white focus:outline-none focus:border-blue-500/60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">Até</label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[12px] text-white focus:outline-none focus:border-blue-500/60"
                    />
                  </div>
                </div>
              )}

              {/* Format buttons */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Formato</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={!customReady}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={!customReady}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    PDF
                  </button>
                </div>
                {period === 'custom' && !customReady && (
                  <p className="text-[10.5px] text-amber-500/80 mt-1.5">Selecione as datas de início e fim para exportar.</p>
                )}
              </div>

              <p className="text-[10px] text-slate-700 text-center">
                O PDF será aberto em uma nova aba para impressão ou salvar como arquivo.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
