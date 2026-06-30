export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function FaturamentoPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const merchants = await prisma.merchant.findMany({
    orderBy: { balance: 'desc' },
    include: { users: { select: { id: true }, take: 1 } },
  })

  const totalBalance  = merchants.reduce((s, m) => s + m.balance, 0)
  const totalPending  = merchants.reduce((s, m) => s + m.pendingBalance, 0)
  const totalCdi12m   = merchants.reduce((s, m) => s + m.balance * (Math.pow(1 + m.cdiRate / 100, 12) - 1), 0)
  const totalMerch    = merchants.length

  const byPlan: Record<string, { count: number; balance: number }> = {}
  for (const m of merchants) {
    const p = m.plan ?? 'Sem plano'
    if (!byPlan[p]) byPlan[p] = { count: 0, balance: 0 }
    byPlan[p].count++
    byPlan[p].balance += m.balance
  }

  const planOrder = ['Black', 'Prime', 'Growth', 'Start', 'Sem plano']
  const planColor: Record<string, string> = {
    Start:     'bg-slate-500',
    Growth:    'bg-blue-500',
    Prime:     'bg-purple-500',
    Black:     'bg-white',
    'Sem plano': 'bg-slate-700',
  }
  const maxBalance = Math.max(...merchants.map((m) => m.balance), 1)

  return (
    <div>
      <Topbar
        title="Faturamento"
        breadcrumb="Casa › Relatórios"
        subtitle="Visão consolidada de saldos e projeções CDI"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total em CDI',      value: `R$ ${formatBRL(totalBalance)}`,  color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Total Pendente',    value: `R$ ${formatBRL(totalPending)}`,  color: 'text-amber-400',   border: 'border-amber-500/20' },
            { label: 'Projeção CDI 12m',  value: `R$ ${formatBRL(totalCdi12m)}`,  color: 'text-blue-400',    border: 'border-slate-800/70' },
            { label: 'Total Empresas',    value: `${totalMerch}`,                  color: 'text-slate-200',   border: 'border-slate-800/70' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* By plan */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {planOrder.filter((p) => byPlan[p]).map((p) => {
            const data = byPlan[p]
            return (
              <div key={p} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${planColor[p] ?? 'bg-slate-500'}`} />
                  <p className="text-[11px] font-bold text-slate-400">{p}</p>
                </div>
                <p className="text-[18px] font-bold text-white tabular-nums">R$ {formatBRL(data.balance)}</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">{data.count} empresa{data.count !== 1 ? 's' : ''}</p>
              </div>
            )
          })}
        </section>

        {/* Merchant ranking */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Ranking por Saldo CDI</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Empresas ordenadas pelo saldo em CDI</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {merchants.slice(0, 20).map((m, i) => {
              const pct = (m.balance / maxBalance) * 100
              const rend12m = m.balance * (Math.pow(1 + m.cdiRate / 100, 12) - 1)
              return (
                <div key={m.id} className="px-5 py-3 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 w-5 shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12.5px] font-semibold text-slate-200 truncate">{m.name}</span>
                        <span className="text-[9.5px] text-slate-600 font-medium">{m.plan ?? '—'}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-white tabular-nums">R$ {formatBRL(m.balance)}</p>
                      <p className="text-[10px] text-emerald-400 tabular-nums">+R$ {formatBRL(rend12m)} /ano</p>
                    </div>
                  </div>
                  <div className="ml-8 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
