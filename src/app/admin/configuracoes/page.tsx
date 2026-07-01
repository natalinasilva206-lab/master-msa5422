export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { ConfigActionsPanel } from './ConfigActionsPanel'
import packageJson from '../../../../package.json'

const planColor: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-500',
  Prime:  'bg-purple-500',
  Black:  'bg-white',
}

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const [
    merchantCount,
    activeMerchantCount,
    userCount,
    logCount,
    feePlans,
    merchantsByPlan,
    disputeCount,
    pendingReserves,
    cdiRatesByPlan,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count(),
    prisma.auditLog.count(),
    prisma.feePlan.findMany({ orderBy: { name: 'asc' } }).catch(() => [] as any[]),
    prisma.merchant.groupBy({ by: ['plan'], _count: { id: true }, where: { status: 'ACTIVE' } }).catch(() => [] as any[]),
    prisma.dispute.count({ where: { status: 'ABERTO' } }).catch(() => 0),
    prisma.reserveRelease.count({ where: { status: 'RESERVADO', releaseAt: { lte: new Date() } } }).catch(() => 0),
    // Average CDI rate per plan from real merchant data
    prisma.merchant.groupBy({
      by: ['plan'],
      _avg: { cdiRate: true },
      where: { status: 'ACTIVE' },
    }).catch(() => [] as any[]),
  ])

  const planCountMap: Record<string, number> = {}
  for (const row of merchantsByPlan) {
    planCountMap[row.plan] = row._count.id
  }

  const planCdiMap: Record<string, number | null> = {}
  for (const row of cdiRatesByPlan) {
    planCdiMap[row.plan] = row._avg?.cdiRate ?? null
  }

  const platformInfo = [
    { label: 'Plataforma',     value: 'Master Pagamentos' },
    { label: 'Versão',         value: `v${packageJson.version}` },
    { label: 'Ambiente',       value: 'Produção' },
    { label: 'Banco de Dados', value: 'PostgreSQL (Neon)' },
    { label: 'Framework',      value: 'Next.js 14 App Router' },
    { label: 'ORM',            value: 'Prisma' },
  ]

  const stats = [
    { label: 'Merchants Ativos', value: activeMerchantCount, color: 'text-white' },
    { label: 'Usuários',         value: userCount,           color: 'text-blue-400' },
    { label: 'Audit Events',     value: logCount,            color: 'text-purple-400' },
    { label: 'Disputas Abertas', value: disputeCount,        color: disputeCount > 0 ? 'text-red-400' : 'text-slate-500' },
  ]

  const planOrder = ['Start', 'Growth', 'Prime', 'Black']

  return (
    <div>
      <Topbar
        title="Configurações"
        breadcrumb="Casa › Gestão"
        subtitle="Parâmetros e informações da plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 text-center">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Platform info */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Informações da Plataforma</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {platformInfo.map((row) => (
                <div key={row.label} className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">{row.label}</span>
                  <span className="text-[12px] font-semibold text-slate-200">{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Merchants por plano — apenas ACTIVE */}
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Merchants por Plano</p>
              <span className="text-[10px] text-slate-600">apenas ativos · total {activeMerchantCount}</span>
            </div>
            <div className="p-5 space-y-3">
              {planOrder.map((plan) => {
                const count = planCountMap[plan] ?? 0
                const pct   = activeMerchantCount > 0 ? (count / activeMerchantCount) * 100 : 0
                const color = planColor[plan] ?? 'bg-slate-500'
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-[12px] font-semibold text-slate-200">{plan}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">{count} seller{count !== 1 ? 's' : ''} · {pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color} opacity-70 transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {Object.keys(planCountMap).filter((p) => !planOrder.includes(p)).map((plan) => {
                const count = planCountMap[plan] ?? 0
                return (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-[11.5px] text-slate-500">{plan}</span>
                    <span className="text-[11px] text-slate-600">{count}</span>
                  </div>
                )
              })}
            </div>
          </section>

        </div>

        {/* Fee Plans from DB */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Planos de Tarifas Cadastrados</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {feePlans.length > 0 ? `${feePlans.length} plano${feePlans.length > 1 ? 's' : ''} cadastrado${feePlans.length > 1 ? 's' : ''}` : 'Nenhum plano cadastrado — use a página Taxas para criar'}
              </p>
            </div>
            <a
              href="/admin/taxas/novo"
              className="text-[10.5px] font-semibold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              + Novo plano
            </a>
          </div>
          {feePlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <p className="text-[12.5px] font-medium">Nenhum plano de tarifa cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {['Plano', 'Taxa cobrada %', 'Fixo cobrado', 'Taxa custo %', 'Fixo custo', 'Spread', 'Prazo saque', 'Atualizado'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {feePlans.map((p) => {
                    const spread = p.chargedPercent - p.costPercent
                    const spreadColor = spread <= 0 ? 'text-red-400 font-bold' : spread < 0.5 ? 'text-amber-400' : 'text-emerald-400'
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${planColor[p.name] ?? 'bg-slate-500'}`} />
                            <span className="text-[13px] font-semibold text-slate-200">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-300 font-mono text-[12px]">{p.chargedPercent.toFixed(2)}%</td>
                        <td className="px-5 py-3 text-slate-400 font-mono text-[12px]">R$ {p.chargedFixed.toFixed(2)}</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[12px]">{p.costPercent.toFixed(2)}%</td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-[12px]">R$ {p.costFixed.toFixed(2)}</td>
                        <td className={`px-5 py-3 font-mono text-[12px] ${spreadColor}`}>
                          {spread >= 0 ? '+' : ''}{spread.toFixed(2)}%
                          {spread <= 0 && <span className="ml-1 text-[9px]">⚠</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-[11.5px]">{p.withdrawalDeadline}</td>
                        <td className="px-5 py-3 text-slate-600 text-[10px] tabular-nums whitespace-nowrap">
                          {p.updatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a href={`/admin/taxas/${p.id}/editar`} className="text-[10.5px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 px-2.5 py-1 rounded-lg transition-colors">
                            Editar
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Parâmetros por plano — CDI real do DB, prazo do FeePlan */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Parâmetros por Plano</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">CDI médio real dos sellers ativos · prazo de saque do FeePlan cadastrado</p>
            </div>
            <a href="/admin/cdi" className="text-[10.5px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors">
              Ir para CDI →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Plano', 'Sellers ativos', 'CDI médio/mês', 'Taxa transação', 'Prazo saque'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {planOrder.map((plan) => {
                  const fee = feePlans.find((f: any) => f.name === plan)
                  const taxa = fee ? `${fee.chargedPercent.toFixed(2)}% + R$${fee.chargedFixed.toFixed(2)}` : '—'
                  const prazo = fee?.withdrawalDeadline ?? '—'
                  const cdiAvg = planCdiMap[plan]
                  const cdiLabel = cdiAvg != null ? `${cdiAvg.toFixed(2)}%` : '—'
                  return (
                    <tr key={plan} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${planColor[plan] ?? 'bg-slate-500'}`} />
                          <span className="font-semibold text-slate-200">{plan}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-400 tabular-nums">{planCountMap[plan] ?? 0}</td>
                      <td className="px-5 py-3 text-slate-300 font-mono">{cdiLabel}</td>
                      <td className="px-5 py-3 text-slate-400">{taxa}</td>
                      <td className="px-5 py-3 text-slate-400">{prazo}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <ConfigActionsPanel pendingReserves={pendingReserves as number} />

        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-amber-400">Configurações avançadas</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Alterações de parâmetros de produção (taxas, limites, integrações) requerem acesso ao painel de infraestrutura. Para criar ou editar planos de tarifas, use a página <a href="/admin/taxas" className="text-amber-400 hover:underline">Taxas</a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
