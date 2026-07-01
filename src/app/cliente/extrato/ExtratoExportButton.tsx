'use client'

interface Row {
  data: string
  tipo: string
  descricao: string
  valor: string
  status: string
}

interface Props {
  rows: Row[]
}

export function ExtratoExportButton({ rows }: Props) {
  function download() {
    const header = 'Data;Tipo;Descrição;Valor (R$);Status'
    const lines  = rows.map((r) =>
      [r.data, r.tipo, r.descricao, r.valor, r.status]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(';')
    )
    const csv   = '﻿' + [header, ...lines].join('\r\n')
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href      = url
    a.download  = `extrato_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) return null

  return (
    <button
      onClick={download}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 px-3 py-1.5 rounded-lg transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Exportar CSV
    </button>
  )
}
