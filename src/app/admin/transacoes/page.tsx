export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(d))
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const avatarGradients = [
  'from-blue-500 to-blue-700', 'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700', 'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600', 'from-cyan-500 to-cyan-700',
]

const statusMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
  APROVADO:  { label: 'Aprovado',  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  PENDENTE:  { label: 'Pendente',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  CANCELADO: { label: 'Cancelado', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
}

const typeMeta: Record<string, { label: string; color: string }> = {
  VENDA:         { label: 'Venda',         color: 'text-emerald-400' },
  ESTORNO:       { label: 'Estorno',       color: 'text-red-400' },
  MED_PIX:       { label: 'MED Pix',       color: 'text-orange-400' },
  REEMBOLSO:     { label: 'Reembolso',     color: 'text-amber-400' },
  PIX_DEVOLVIDO: { label: 'Pix Devolvido', color: 'text-slate-400' },
}

function parseMeta(desc: string | null) {
  if (!desc) return null
  try { return JSON.parse(desc) } catch { return null }
}

interface PageProps {
  searchParams: {
    q?: string
    periodo?: string
    tipo?: string
    status?: string
  }
}

export default async function AdminTransacoesPage({ searchParams }: PageProps) {
  const q       = searchParams?.q?.trim() ?? ''
  const periodo = searchParams?.periodo ?? 'max'
  const tipo    = searchParams?.tipo ?? ''
  const status  = searchParams?.status ?? ''

  // Period range
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const periodoMap: Record<string, Date | null> = {
    hoje:   startOf(now),
    ontem:  new Date(startOf(now).getTime() - 86400000),
    '7d':   new Date(now.getTime() - 7  * 86400000),
    '30d':  new Date(now.getTime() - 30 * 86400000),
    max:    null,
  }
  const periodoEnd: Record<string, Date | null> = {
    ontem: startOf(now),
  }
  const desde = periodoMap[periodo] ?? null
  const ate   = periodoEnd[periodo] ?? null

  const where: Record<string, unknown> = {
    ...(tipo   ? { type: tipo }   : {}),
    ...(status ? { status }       : {}),
    ...(desde  ? { createdAt: { gte: desde, ...(ate ? { lt: ate } : {}) } } : {}),
    ...(q ? {
      OR: [
        { id:          { contains: q, mode: 'insensitive' } },
        { externalId:  { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { merchant: { name: { contains: q, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  // KPI counts use the full dataset (no period filter) for totals
  const [saleLogs, totalStats, totalCount, aprovCount] = await Promise.all([
    prisma.saleLog.findMany({
      where,
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: { merchant: { select: { id: true, name: true, document: true, plan: true } } },
    }).catch(() => []),
    prisma.saleLog.aggregate({
      where: { type: 'VENDA', status: 'APROVADO', ...(desde ? { createdAt: { gte: desde, ...(ate ? { lt: ate } : {}) } } : {}) },
      _sum: { amount: true },
      _count: { id: true },
    }).catch(() => null),
    prisma.saleLog.count({ where: desde ? { createdAt: { gte: desde, ...(ate ? { lt: ate } : {}) } } : {} }).catch(() => 0),
    prisma.saleLog.count({ where: { status: 'APROVADO', ...(desde ? { createdAt: { gte: desde, ...(ate ? { lt: ate } : {}) } } : {}) } }).catch(() => 0),
  ])

  const volumeTotal  = totalStats?._sum?.amount ?? 0
  const totalTx      = totalCount
  const taxaAprov    = totalTx > 0 ? ((aprovCount / totalTx) * 100).toFixed(1) : '0.0'

  // Estimate fees from parsed description metadata
  let taxasTotal = 0
  for (const tx of saleLogs) {
    const meta = parseMeta(tx.description)
    if (meta?.fee) taxasTotal += Number(meta.fee) || 0
    else if (meta?.taxa) taxasTotal += Number(meta.taxa) || 0
  }

  const periodos = [
    { label: 'Hoje',    value: 'hoje' },
    { label: 'Ontem',   value: 'ontem' },
    { label: '7 dias',  value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: 'Máximo',  value: 'max' },
  ]

  function makeHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ periodo, tipo, status, ...(q ? { q } : {}), ...overrides })
    return `/admin/transacoes?${p.toString()}`
  }

  return (
    <div>
      <Topbar
        title="Transações Globais"
        breadcrumb="Casa › Administração"
        subtitle="Visualize todas as transações da plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Volume Total',
              value: `R$ ${formatBRL(volumeTotal)}`,
              sub: `${totalStats?._count?.id ?? 0} vendas aprovadas no período`,
              color: 'text-white',
              bg: 'bg-blue-500/10 text-blue-400',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              label: 'Taxas Arrecadadas',
              value: taxasTotal > 0 ? `R$ ${formatBRL(taxasTotal)}` : `R$ ${formatBRL(volumeTotal * 0.07)}`,
              sub: 'taxas da plataforma',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 text-emerald-400',
              icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            },
            {
              label: 'Total Transações',
              value: String(totalTx),
              sub: 'no período selecionado',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 text-blue-400',
              icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            },
            {
              label: 'Taxa de Aprovação',
              value: `${taxaAprov}%`,
              sub: `${aprovCount} aprovadas de ${totalTx}`,
              color: Number(taxaAprov) >= 70 ? 'text-emerald-400' : Number(taxaAprov) >= 40 ? 'text-amber-400' : 'text-red-400',
              bg: 'bg-slate-800/60 text-slate-400',
              icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
            },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[19px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${c.bg}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Period filter + search */}
        <div className="space-y-3">
          {/* Period tabs */}
          <div className="flex items-center gap-1">
            {periodos.map(({ label, value }) => (
              <Link
                key={value}
                href={makeHref({ periodo: value })}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  periodo === value
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/30'
                    : 'bg-slate-900/60 border border-slate-800/70 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Search + dropdowns */}
          <form method="GET" action="/admin/transacoes" className="flex items-center gap-2 flex-wrap">
            <input type="hidden" name="periodo" value={periodo} />
            <div className="relative flex-1 min-w-[220px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Buscar por ID, cliente, email ou empresa..."
                className="w-full bg-slate-900/60 border border-slate-800/70 rounded-xl pl-9 pr-3 py-2.5 text-[12.5px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
              />
            </div>
            <select
              name="tipo"
              defaultValue={tipo}
              className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-3 py-2.5 text-[12.5px] text-slate-400 focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer appearance-none pr-7 relative"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
            >
              <option value="">Todos os tipos</option>
              <option value="VENDA">Venda</option>
              <option value="ESTORNO">Estorno</option>
              <option value="MED_PIX">MED Pix</option>
              <option value="REEMBOLSO">Reembolso</option>
              <option value="PIX_DEVOLVIDO">Pix Devolvido</option>
            </select>
            <select
              name="status"
              defaultValue={status}
              className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-3 py-2.5 text-[12.5px] text-slate-400 focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer appearance-none pr-7"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
            >
              <option value="">Todos os status</option>
              <option value="APROVADO">Aprovado</option>
              <option value="PENDENTE">Pendente</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold rounded-xl transition-colors"
            >
              Buscar
            </button>
            {(q || tipo || status) && (
              <Link href={makeHref({ q: '', tipo: '', status: '' })} className="px-3 py-2.5 text-[11.5px] text-slate-500 hover:text-slate-300 border border-slate-800/70 rounded-xl transition-colors">
                Limpar
              </Link>
            )}
          </form>
        </div>

        {/* Table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-[13px] font-semibold text-white">Todas as Transações</p>
              <span className="text-[10.5px] text-slate-600 ml-1">· {saleLogs.length} resultado{saleLogs.length !== 1 ? 's' : ''}</span>
            </div>
            <span className="text-[10px] font-medium text-slate-600 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full">
              máx. 200 por página
            </span>
          </div>

          {saleLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma transação encontrada</p>
              <p className="text-[11px] text-slate-800 mt-1">Tente ajustar os filtros ou o período.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="w-8 px-4 py-3" />
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Método</th>
                    <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                    <th className="text-right px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Táxons</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dados</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {saleLogs.map((tx, i) => {
                    const st   = statusMeta[tx.status]  ?? statusMeta['PENDENTE']
                    const tp   = typeMeta[tx.type]      ?? typeMeta['VENDA']
                    const meta = parseMeta(tx.description)
                    const customerName = meta?.customerName ?? meta?.nome ?? meta?.name ?? null
                    const customerEmail = meta?.customerEmail ?? meta?.email ?? null
                    const customerDoc = meta?.customerDocument ?? meta?.cpf ?? meta?.document ?? null
                    const method = meta?.method ?? meta?.metodo ?? meta?.paymentMethod ?? (tx.type === 'VENDA' ? 'PIX' : null)
                    const fee = meta?.fee ?? meta?.taxa ?? null
                    const shortId = tx.externalId?.slice(0, 8).toUpperCase() ?? tx.id.slice(0, 8).toUpperCase()
                    const idFull = tx.externalId ?? tx.id
                    const isNeg = tx.type !== 'VENDA'

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors group">
                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <div className="w-4 h-4 rounded border border-slate-700/60 group-hover:border-slate-600" />
                        </td>

                        {/* ID */}
                        <td className="px-3 py-3.5">
                          <p className="text-[13px] font-bold text-slate-300 font-mono">#{shortId}</p>
                          <p className="text-[11px] text-slate-700 font-mono truncate max-w-[110px] mt-0.5">{idFull.slice(0, 20)}{idFull.length > 20 ? '…' : ''}</p>
                        </td>

                        {/* Empresa */}
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                              {getInitials(tx.merchant.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-slate-200 truncate max-w-[140px]">{tx.merchant.name}</p>
                              <p className="text-[11px] text-slate-600 font-mono truncate">{tx.merchant.document}</p>
                            </div>
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="px-3 py-3.5">
                          {customerName ? (
                            <div>
                              <p className="text-[13px] font-semibold text-slate-300 truncate max-w-[140px]">{customerName}</p>
                              {customerEmail && <p className="text-[11px] text-slate-600 truncate max-w-[140px]">{customerEmail}</p>}
                              {customerDoc && <p className="text-[11px] text-slate-700 font-mono">{customerDoc}</p>}
                            </div>
                          ) : (
                            <div>
                              <p className="text-[13px] text-slate-600 truncate max-w-[140px]">
                                {tx.description ? tx.description.slice(0, 30) : '—'}
                              </p>
                              <span className={`text-[11px] font-semibold ${tp.color}`}>{tp.label}</span>
                            </div>
                          )}
                        </td>

                        {/* Método */}
                        <td className="px-3 py-3.5 text-center">
                          <span className="inline-block text-[11px] font-bold text-slate-300 bg-slate-800/70 border border-slate-700/40 px-2.5 py-0.5 rounded-md">
                            {method ?? 'PIX'}
                          </span>
                        </td>

                        {/* Valor */}
                        <td className="px-3 py-3.5 text-right">
                          <span className={`text-[13px] font-bold tabular-nums ${isNeg ? 'text-red-400' : 'text-white'}`}>
                            {isNeg ? '−' : ''}R$ {formatBRL(tx.amount)}
                          </span>
                        </td>

                        {/* Táxons */}
                        <td className="px-3 py-3.5 text-right">
                          <span className="text-[13px] font-medium text-slate-500 tabular-nums">
                            {fee != null ? `R$ ${formatBRL(Number(fee))}` : '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3.5">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.color} ${st.bg} ${st.border}`}>
                            {st.label}
                          </span>
                        </td>

                        {/* Dados */}
                        <td className="px-3 py-3.5">
                          <span className="text-[12px] text-slate-500 whitespace-nowrap">
                            {formatDateTime(tx.createdAt)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/admin/clientes/${tx.merchant.id}`}
                            className="text-slate-600 hover:text-slate-300 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-700">
                  Exibindo {saleLogs.length} transaç{saleLogs.length !== 1 ? 'ões' : 'ão'}
                </span>
                <span className="text-[11px] text-slate-700">
                  Período: {periodos.find((p) => p.value === periodo)?.label ?? 'Máximo'}
                </span>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
