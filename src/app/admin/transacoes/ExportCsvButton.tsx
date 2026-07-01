'use client'

interface Row {
  id: string
  merchantName: string
  type: string
  status: string
  amount: number
  description: string | null
  externalId: string | null
  createdAt: string
}

export function ExportCsvButton({ rows }: { rows: Row[] }) {
  function download() {
    const header = ['ID', 'Merchant', 'Tipo', 'Status', 'Valor (R$)', 'Descrição', 'ID Externo', 'Data']
    const lines = rows.map((r) => [
      r.id,
      r.merchantName,
      r.type,
      r.status,
      r.amount.toFixed(2).replace('.', ','),
      r.description ?? '',
      r.externalId ?? '',
      r.createdAt,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))

    const csv = '﻿' + [header.join(';'), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `transacoes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={download}
      title="Exportar CSV"
      className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Exportar CSV
    </button>
  )
}
