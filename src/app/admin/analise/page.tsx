export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* Minimal SVG bar chart */
function BarChart({ data, color = '#3b82f6' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 500, H = 100, PAD = 8
  const bw = (W - PAD * 2) / data.length - 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = Math.max(((d.value / max) * (H - PAD * 2)), 2)
        const x = PAD + i * ((W - PAD * 2) / data.length) + 2
        const y = H - PAD - bh
        return (
          <rect key={i} x={x} y={y} width={bw} height={bh} rx={2} fill={color} opacity={0.7} />
        )
      })}
    </svg>
  )
}

export default async function AnalisePage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const [merchants, users, logs] = await Promise.all([
    prisma.merchant.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
  ])

  const totalBalance  = merchants.reduce((s, m) => s + m.balance, 0)
  const totalPending  = merchants.reduce((s, m) => s + m.pendingBalance, 0)
  const totalCdi      = merchants.reduce((s, m) => s + m.balance * (Math.pow(1 + m.cdiRate / 100, 12) - 1), 0)
  const totalMerch    = merchants.length
  const totalUsers    = users.length
  const statusCounts  = merchants.reduce<Record<string, number>>((acc, m) => {
    const s = m.status ?? 'UNKNOWN'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const planCounts = merchants.reduce<Record<string, number>>((acc, m) => {
    const p = m.plan ?? 'N/A'
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})

  // Growth by month (last 6 months)
  const now = new Date()
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    return d.toLocaleString('pt-BR', { month: 'short' })
  })
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    return {
      label: monthLabels[i],
      value: merchants.filter((m) => new Date(m.createdAt) >= d && new Date(m.createdAt) < next).length,
    }
  })

  const actionActivity = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    return {
      label: monthLabels[i],
      value: logs.filter((l) => new Date(l.createdAt) >= d && new Date(l.createdAt) < next).length,
    }
  })

  const planOrder = ['Black', 'Prime', 'Growth', 'Start']
  const planColors: Record<string, string> = { Black: '#f1f5f9', Prime: '#a855f7', Growth: '#3b82f6', Start: '#94a3b8' }

  return (
    <div>
      <Topbar
        title="Análise Geral"
        breadcrumb="Casa › Relatórios"
        subtitle="Visão consolidada da plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Main KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total em CDI',    value: `R$ ${formatBRL(totalBalance)}`, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Pendente Total',  value: `R$ ${formatBRL(totalPending)}`, color: 'text-amber-400',   border: 'border-amber-500/20' },
            { label: 'Rendimento 12m',  value: `R$ ${formatBRL(totalCdi)}`,     color: 'text-blue-400',    border: 'border-blue-500/20' },
            { label: 'Empresas',        value: `${totalMerch}`,                 color: 'text-slate-200',   border: 'border-slate-800/70' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Merchant growth */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Novas Empresas / Mês</p>
            </div>
            <div className="px-4 pt-3 pb-1">
              <BarChart data={monthData} color="#3b82f6" />
            </div>
            <div className="px-5 pb-3 flex justify-between">
              {monthLabels.map((l) => (
                <span key={l} className="text-[9.5px] text-slate-700 font-medium capitalize">{l}</span>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Atividade (Audit Log / Mês)</p>
            </div>
            <div className="px-4 pt-3 pb-1">
              <BarChart data={actionActivity} color="#10b981" />
            </div>
            <div className="px-5 pb-3 flex justify-between">
              {monthLabels.map((l) => (
                <span key={l} className="text-[9.5px] text-slate-700 font-medium capitalize">{l}</span>
              ))}
            </div>
          </div>

        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Status breakdown */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <p className="text-[13px] font-semibold text-white mb-3">Status das Empresas</p>
            <div className="space-y-2">
              {Object.entries(statusCounts).map(([status, count]) => {
                const pct = (count / totalMerch) * 100
                const color = status === 'ACTIVE' ? 'bg-emerald-500' : status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11.5px] text-slate-400">{status}</span>
                      <span className="text-[11.5px] font-bold text-white">{count}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Plan breakdown */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <p className="text-[13px] font-semibold text-white mb-3">Distribuição por Plano</p>
            <div className="space-y-2">
              {planOrder.filter((p) => planCounts[p]).map((p) => {
                const count = planCounts[p] ?? 0
                const pct = (count / totalMerch) * 100
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11.5px] text-slate-400">{p}</span>
                      <span className="text-[11.5px] font-bold text-white">{count}</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: planColors[p] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Usuários Totais', value: totalUsers },
            { label: 'Eventos Auditados', value: logs.length },
            { label: 'Empresas Ativas', value: statusCounts['ACTIVE'] ?? 0 },
            { label: 'Em Revisão', value: (statusCounts['PENDING'] ?? 0) + (statusCounts['REVIEW'] ?? 0) },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className="text-[20px] font-bold text-slate-200 tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
