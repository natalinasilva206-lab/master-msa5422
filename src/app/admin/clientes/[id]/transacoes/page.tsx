export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import SellerTabs from '../SellerTabs'

const TYPE_META: Record<string, { label: string; color: string }> = {
  VENDA:          { label: 'Venda',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ESTORNO:        { label: 'Estorno',     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  MED_PIX:        { label: 'MED Pix',    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  REEMBOLSO:      { label: 'Reembolso',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  PIX_DEVOLVIDO:  { label: 'Pix Dev.',   color: 'text-slate-400 bg-slate-700/40 border-slate-600/40' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  APROVADO:   { label: 'Aprovado',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  CANCELADO:  { label: 'Cancelado', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  PENDENTE:   { label: 'Pendente',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface PageProps {
  params: { id: string }
  searchParams: { q?: string; type?: string; status?: string }
}

export default async function SellerTransacoesPage({ params, searchParams }: PageProps) {
  const merchant = await prisma.merchant.findUnique({ where: { id: params.id }, select: { id: true, name: true } })
  if (!merchant) notFound()

  const q = searchParams.q?.trim() ?? ''
  const typeFilter = searchParams.type ?? ''
  const statusFilter = searchParams.status ?? ''

  const logs = await prisma.saleLog.findMany({
    where: {
      merchantId: merchant.id,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q ? { OR: [{ description: { contains: q, mode: 'insensitive' } }, { externalId: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const totalVendas   = logs.filter((l) => l.type === 'VENDA' && l.status === 'APROVADO').reduce((a, l) => a + l.amount, 0)
  const totalEstornos = logs.filter((l) => ['ESTORNO', 'MED_PIX', 'REEMBOLSO'].includes(l.type)).reduce((a, l) => a + l.amount, 0)

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Transações do seller" />

      <div className="p-4 xl:p-6 space-y-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">Clientes</Link>
          <span>/</span>
          <Link href={`/admin/clientes/${merchant.id}`} className="hover:text-white transition-colors">{merchant.name}</Link>
          <span>/</span>
          <span className="text-white">Transações</span>
        </nav>

        <SellerTabs merchantId={merchant.id} />

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total de registros', value: logs.length.toString(), color: 'text-white' },
            { label: 'Volume aprovado', value: `R$ ${formatBRL(totalVendas)}`, color: 'text-emerald-400' },
            { label: 'Estornos / MED', value: `R$ ${formatBRL(totalEstornos)}`, color: 'text-red-400' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <form method="GET" className="flex gap-2 flex-wrap items-center bg-slate-900/60 border border-slate-800/70 rounded-xl p-3">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input name="q" defaultValue={q} placeholder="Buscar por descrição ou ID externo..." className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg pl-9 pr-3 py-2 text-[13px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition" />
          </div>
          <select name="type" defaultValue={typeFilter} className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[13px] text-slate-300 focus:outline-none">
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select name="status" defaultValue={statusFilter} className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[13px] text-slate-300 focus:outline-none">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 text-[12.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">Filtrar</button>
        </form>

        {/* Table */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Transações</p>
            <p className="text-[10.5px] text-slate-600 mt-0.5">{logs.length} registro{logs.length !== 1 ? 's' : ''}</p>
          </div>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              <p className="text-[13px] font-medium">Nenhuma transação encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Descrição / ID Externo</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.map((log) => {
                    const tm = TYPE_META[log.type] ?? { label: log.type, color: 'text-slate-400 bg-slate-700/40 border-slate-600/40' }
                    const sm = STATUS_META[log.status] ?? { label: log.status, color: 'text-slate-400 bg-slate-700/40 border-slate-600/40' }
                    const isDebit = ['ESTORNO', 'MED_PIX', 'REEMBOLSO', 'PIX_DEVOLVIDO'].includes(log.type)
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] text-slate-300">{new Date(log.createdAt).toLocaleDateString('pt-BR')}</p>
                          <p className="text-[10px] text-slate-600">{new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tm.color}`}>{tm.label}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sm.color}`}>{sm.label}</span>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-[12px] text-slate-400 truncate max-w-[220px]">{log.description ?? '—'}</p>
                          {log.externalId && <p className="text-[10px] text-slate-700 font-mono truncate">{log.externalId}</p>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <p className={`text-[13px] font-bold tabular-nums ${isDebit ? 'text-red-400' : 'text-emerald-400'}`}>
                            {isDebit ? '-' : '+'}R$ {formatBRL(log.amount)}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
