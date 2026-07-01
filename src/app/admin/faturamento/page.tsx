export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatBRLShort(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}K`
  return `R$${v.toFixed(0)}`
}

function parseMeta(desc: string | null) {
  if (!desc) return null
  try { return JSON.parse(desc) } catch { return null }
}

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0,0,0,0); return r
}

type DayBucket = { date: string; volume: number; fees: number; count: number }

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: { periodo?: string }
}) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const periodo = searchParams.periodo ?? '30d'

  const now = new Date()
  let startDate: Date
  let days: number

  if (periodo === '7d') {
    startDate = new Date(now); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0,0,0,0)
    days = 7
  } else if (periodo === 'mes') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  } else {
    // 30d default
    startDate = new Date(now); startDate.setDate(startDate.getDate() - 29); startDate.setHours(0,0,0,0)
    days = 30
  }

  const sales = await prisma.saleLog.findMany({
    where: {
      type: 'VENDA',
      status: 'APPROVED',
      createdAt: { gte: startDate },
    },
    select: { amount: true, description: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  // Build day buckets
  const bucketMap = new Map<string, DayBucket>()
  // Pre-populate all days in range
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    bucketMap.set(key, { date: key, volume: 0, fees: 0, count: 0 })
  }

  for (const s of sales) {
    const key = s.createdAt.toISOString().slice(0, 10)
    const b = bucketMap.get(key)
    if (!b) continue
    const meta = parseMeta(s.description)
    const fee = typeof meta?.fee === 'number' ? meta.fee : s.amount * 0.07
    b.volume += s.amount
    b.fees += fee
    b.count++
  }

  const buckets = Array.from(bucketMap.values())

  const totalVolume = buckets.reduce((s, b) => s + b.volume, 0)
  const totalFees   = buckets.reduce((s, b) => s + b.fees, 0)
  const totalCount  = buckets.reduce((s, b) => s + b.count, 0)
  const ticketMedio = totalCount > 0 ? totalVolume / totalCount : 0

  // Chart dimensions
  const W = 520, H = 180, PAD = { top: 16, right: 12, bottom: 28, left: 54 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxVol  = Math.max(...buckets.map(b => b.volume), 1)
  const maxFee  = Math.max(...buckets.map(b => b.fees), 1)

  function xPos(i: number) { return PAD.left + (i / Math.max(buckets.length - 1, 1)) * innerW }
  function yVolPos(v: number) { return PAD.top + innerH - (v / maxVol) * innerH }
  function yFeePos(v: number) { return PAD.top + innerH - (v / maxFee) * innerH }

  const volPath = buckets.map((b, i) => `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yVolPos(b.volume).toFixed(1)}`).join(' ')
  const volArea = `${volPath} L${xPos(buckets.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`

  const periodos = [
    { key: '7d',  label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'mes', label: 'Mês Atual' },
  ]

  const barW = Math.max(2, (innerW / buckets.length) - 2)

  function fmtAxisDate(dateStr: string) {
    const [,, dd] = dateStr.split('-')
    return dd
  }

  const yVolTicks = [maxVol, maxVol * 0.5, 0]
  const yFeeTicks = [maxFee, maxFee * 0.5, 0]

  return (
    <div>
      <Topbar
        title="Faturamento por Período"
        breadcrumb="Casa › Relatórios › Faturamento"
        subtitle="Análise de faturamento e volume de transações"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Header: period buttons + export */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/60 rounded-lg p-1">
            {periodos.map((p) => (
              <Link
                key={p.key}
                href={`/admin/faturamento?periodo=${p.key}`}
                className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
                  periodo === p.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <Link
            href="/admin/transacoes"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-[13px] font-semibold text-slate-300 hover:bg-slate-700/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </Link>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Volume Total',        value: `R$ ${formatBRL(totalVolume)}`, color: 'text-white',         sub: `${totalCount} transações` },
            { label: 'Taxas Arrecadadas',   value: `R$ ${formatBRL(totalFees)}`,   color: 'text-emerald-400',   sub: totalVolume > 0 ? `${((totalFees/totalVolume)*100).toFixed(1)}% do volume` : '—' },
            { label: 'Total de Transações', value: `${totalCount.toLocaleString('pt-BR')}`, color: 'text-blue-400', sub: 'transações aprovadas' },
            { label: 'Ticket Médio',        value: `R$ ${formatBRL(ticketMedio)}`, color: 'text-slate-200',     sub: 'por transação' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
              <p className="text-[13px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Volume por Dia — area/line chart */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <p className="text-[18px] font-semibold text-white mb-1">Volume por Dia</p>
            <p className="text-[13px] text-slate-500 mb-4">Volume de vendas aprovadas por dia</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* Y-axis grid + labels */}
              {yVolTicks.map((tick, ti) => {
                const y = PAD.top + innerH - (tick / maxVol) * innerH
                return (
                  <g key={ti}>
                    <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#1e293b" strokeWidth="1" />
                    <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fill="#475569" fontSize="9">
                      {formatBRLShort(tick)}
                    </text>
                  </g>
                )
              })}
              {/* X-axis labels (every ~5th day) */}
              {buckets.map((b, i) => {
                if (buckets.length > 14 && i % 5 !== 0) return null
                return (
                  <text key={i} x={xPos(i)} y={PAD.top + innerH + 14} textAnchor="middle" fill="#475569" fontSize="9">
                    {fmtAxisDate(b.date)}
                  </text>
                )
              })}
              {/* Area fill */}
              {buckets.length > 1 && <path d={volArea} fill="url(#volGrad)" />}
              {/* Line */}
              {buckets.length > 1 && <path d={volPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {/* Dots */}
              {buckets.map((b, i) => (
                <circle key={i} cx={xPos(i)} cy={yVolPos(b.volume)} r="2.5" fill="#3b82f6" />
              ))}
            </svg>
          </div>

          {/* Taxas por Dia — bar chart */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <p className="text-[18px] font-semibold text-white mb-1">Taxas por Dia</p>
            <p className="text-[13px] text-slate-500 mb-4">Taxas arrecadadas por dia</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
              {/* Y-axis grid + labels */}
              {yFeeTicks.map((tick, ti) => {
                const y = PAD.top + innerH - (tick / maxFee) * innerH
                return (
                  <g key={ti}>
                    <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#1e293b" strokeWidth="1" />
                    <text x={PAD.left - 6} y={y + 3.5} textAnchor="end" fill="#475569" fontSize="9">
                      {formatBRLShort(tick)}
                    </text>
                  </g>
                )
              })}
              {/* X-axis labels */}
              {buckets.map((b, i) => {
                if (buckets.length > 14 && i % 5 !== 0) return null
                return (
                  <text key={i} x={PAD.left + (i / Math.max(buckets.length - 1, 1)) * innerW} y={PAD.top + innerH + 14} textAnchor="middle" fill="#475569" fontSize="9">
                    {fmtAxisDate(b.date)}
                  </text>
                )
              })}
              {/* Bars */}
              {buckets.map((b, i) => {
                const x = PAD.left + (i / Math.max(buckets.length - 1, 1)) * innerW - barW / 2
                const barH = (b.fees / maxFee) * innerH
                const y = PAD.top + innerH - barH
                return (
                  <rect
                    key={i}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(barH, 0)}
                    rx="2"
                    fill="#10b981"
                    opacity="0.8"
                  />
                )
              })}
            </svg>
          </div>
        </div>

        {/* CDI / empresa ranking (kept below as secondary info) */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60">
            <p className="text-[18px] font-semibold text-white">Faturamento por Empresa</p>
            <p className="text-[13px] text-slate-500 mt-0.5">Volume de vendas aprovadas no período por empresa</p>
          </div>
          <EmpresaRanking startDate={startDate} />
        </div>

      </div>
    </div>
  )
}

async function EmpresaRanking({ startDate }: { startDate: Date }) {
  const rows = await prisma.saleLog.groupBy({
    by: ['merchantId'],
    where: { type: 'VENDA', status: 'APPROVED', createdAt: { gte: startDate } },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 15,
  })

  if (rows.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-[13px] text-slate-600">
        Nenhuma venda aprovada no período.
      </div>
    )
  }

  const ids = rows.map(r => r.merchantId)
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, document: true },
  })
  const mMap = new Map(merchants.map(m => [m.id, m]))
  const maxVol = rows[0]._sum.amount ?? 1

  function formatBRL(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="divide-y divide-slate-800/40">
      {rows.map((r, i) => {
        const m = mMap.get(r.merchantId)
        const vol = r._sum.amount ?? 0
        const cnt = r._count.id
        const pct = (vol / (maxVol || 1)) * 100
        return (
          <div key={r.merchantId} className="px-5 py-3 hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-[12px] font-bold text-slate-700 w-5 shrink-0">#{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-slate-200 truncate">{m?.name ?? r.merchantId}</p>
                <p className="text-[12px] text-slate-600">{cnt} transaç{cnt !== 1 ? 'ões' : 'ão'}</p>
              </div>
              <p className="text-[14px] font-bold text-white tabular-nums shrink-0">R$ {formatBRL(vol)}</p>
            </div>
            <div className="ml-8 h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
