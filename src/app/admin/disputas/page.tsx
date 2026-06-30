export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { TYPE_LABEL, TYPE_COLOR, STATUS_LABEL, STATUS_COLOR, STATUS_DOT, ALL_STATUSES, ALL_TYPES } from './constants'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

interface PageProps {
  searchParams: { status?: string; type?: string; q?: string }
}

export default async function DisputasPage({ searchParams }: PageProps) {
  const filterStatus = searchParams.status && searchParams.status !== 'todos' ? searchParams.status : undefined
  const filterType   = searchParams.type   && searchParams.type   !== 'todos' ? searchParams.type   : undefined

  let disputes: Awaited<ReturnType<typeof prisma.dispute.findMany<{ include: { merchant: { select: { id: true; name: true } } } }>>> = []
  let byStatus: Record<string, number> = {}

  try {
    const [rows, counts] = await Promise.all([
      prisma.dispute.findMany({
        where: {
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(filterType   ? { type:   filterType   } : {}),
        },
        include: { merchant: { select: { id: true, name: true } } },
        orderBy: { openedAt: 'desc' },
      }),
      prisma.dispute.groupBy({ by: ['status'], _count: { id: true } }),
    ])
    disputes = rows
    counts.forEach((c) => { byStatus[c.status] = c._count.id })
  } catch (e) {
    console.error('[DisputasPage] DB error:', e)
  }

  const total = Object.values(byStatus).reduce((a, b) => a + b, 0)

  const openCases  = (byStatus['ABERTO'] ?? 0) + (byStatus['EM_ANALISE'] ?? 0) + (byStatus['AGUARDANDO_DOCUMENTO'] ?? 0)
  const blocked    = byStatus['BLOQUEADO'] ?? 0
  const totalBlock = disputes.reduce((s, d) => s + d.blockedAmount, 0)

  const isDeadlineSoon = (d: Date | null) => {
    if (!d) return false
    const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 3
  }
  const isOverdue = (d: Date | null, status: string) => {
    if (!d) return false
    const finished = ['RESOLVIDO_SELLER','RESOLVIDO_CONTRA','DEVOLVIDO_PARCIAL','FINALIZADO']
    return new Date(d) < new Date() && !finished.includes(status)
  }

  return (
    <div>
      <Topbar title="Central de Disputas e MED" subtitle={`${total} caso${total !== 1 ? 's' : ''} no total`} />

      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Casos abertos',        value: openCases,             color: 'text-blue-400' },
            { label: 'Bloqueados',            value: blocked,               color: 'text-red-400' },
            { label: 'Total bloqueado (R$)',  value: `R$ ${fmtBRL(totalBlock)}`, color: 'text-amber-400' },
            { label: 'Total de casos',        value: total,                 color: 'text-slate-300' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + new button */}
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" className="flex flex-wrap gap-2 flex-1">
            <select
              name="status"
              defaultValue={filterStatus ?? 'todos'}
              onChange={(e) => e.target.form?.submit()}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todos">Todos os status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <select
              name="type"
              defaultValue={filterType ?? 'todos'}
              onChange={(e) => e.target.form?.submit()}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todos">Todos os tipos</option>
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </form>
          <Link
            href="/admin/disputas/nova"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Abrir caso
          </Link>
        </div>

        {/* Table */}
        {disputes.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="w-14 h-14 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-400">Nenhum caso encontrado</p>
            <p className="text-xs mt-1 text-slate-600">Tente mudar os filtros ou abra um novo caso.</p>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-800/60">
                    {['Tipo', 'Seller', 'Valor contestado', 'Bloqueado', 'Status', 'Abertura', 'Prazo', 'Responsável', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {disputes.map((d) => {
                    const over    = isOverdue(d.deadline, d.status)
                    const soon    = !over && isDeadlineSoon(d.deadline)
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Tipo */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOR[d.type] ?? 'text-slate-400 bg-slate-700 border-slate-600'}`}>
                            {TYPE_LABEL[d.type] ?? d.type}
                          </span>
                        </td>
                        {/* Seller */}
                        <td className="px-4 py-3">
                          <Link href={`/admin/clientes/${d.merchant.id}`} className="text-xs text-slate-200 hover:text-white font-medium">
                            {d.merchant.name}
                          </Link>
                        </td>
                        {/* Valor contestado */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-white tabular-nums">R$ {fmtBRL(d.contestedAmount)}</span>
                        </td>
                        {/* Bloqueado */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs tabular-nums font-medium ${d.blockedAmount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                            {d.blockedAmount > 0 ? `R$ ${fmtBRL(d.blockedAmount)}` : '—'}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[d.status] ?? ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[d.status] ?? 'bg-slate-400'}`} />
                            {STATUS_LABEL[d.status] ?? d.status}
                          </span>
                        </td>
                        {/* Abertura */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">{fmtDate(d.openedAt)}</td>
                        {/* Prazo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {d.deadline ? (
                            <span className={`text-xs font-medium ${over ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-slate-400'}`}>
                              {fmtDate(d.deadline)}
                              {over && <span className="ml-1 text-[9px] bg-red-500/10 text-red-500 px-1 rounded">VENCIDO</span>}
                              {soon && <span className="ml-1 text-[9px] bg-yellow-500/10 text-yellow-500 px-1 rounded">URGENTE</span>}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Responsável */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">
                          {d.assignedTo ?? <span className="text-slate-600">—</span>}
                        </td>
                        {/* Ver */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/disputas/${d.id}`}
                            className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
