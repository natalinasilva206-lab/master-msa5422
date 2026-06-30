export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const plans = [
  {
    key: 'Start',
    label: 'Start',
    cdiRate: 0.80,
    taxa: '2.5%',
    saque: '1 dia útil',
    suporte: 'E-mail',
    color: 'text-slate-300',
    ring: 'ring-slate-700/60',
    badge: 'bg-slate-700/60 text-slate-300',
    dot: 'bg-slate-400',
    barColor: 'bg-slate-500/60',
    features: ['Pagamentos via cartão', 'Painel de vendas', 'CDI 0.80%/mês', 'Relatórios básicos'],
  },
  {
    key: 'Growth',
    label: 'Growth',
    cdiRate: 0.90,
    taxa: '2.0%',
    saque: '1 dia útil',
    suporte: 'E-mail + Chat',
    color: 'text-blue-400',
    ring: 'ring-blue-500/30',
    badge: 'bg-blue-600/20 text-blue-300',
    dot: 'bg-blue-400',
    barColor: 'bg-blue-500/60',
    features: ['Tudo do Start', 'Taxa reduzida de transação', 'CDI 0.90%/mês', 'Antecipação disponível', 'Relatórios avançados'],
  },
  {
    key: 'Prime',
    label: 'Prime',
    cdiRate: 1.00,
    taxa: '1.7%',
    saque: 'Mesmo dia',
    suporte: 'Prioritário',
    color: 'text-purple-400',
    ring: 'ring-purple-500/30',
    badge: 'bg-purple-600/20 text-purple-300',
    dot: 'bg-purple-400',
    barColor: 'bg-purple-500/60',
    features: ['Tudo do Growth', 'CDI 1.00%/mês', 'Saque no mesmo dia', 'Gerente de conta', 'API avançada'],
  },
  {
    key: 'Black',
    label: 'Black',
    cdiRate: 1.20,
    taxa: '1.4%',
    saque: 'Instantâneo',
    suporte: 'Exclusivo 24/7',
    color: 'text-slate-100',
    ring: 'ring-slate-500/40',
    badge: 'bg-slate-800/80 text-slate-200',
    dot: 'bg-white',
    barColor: 'bg-slate-300/50',
    features: ['Tudo do Prime', 'CDI 1.20%/mês', 'Saque instantâneo', 'White-label disponível', 'SLA garantido'],
  },
]

export default async function PlanoPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant    = user?.merchant
  const planoAtual  = merchant?.plan ?? 'Start'
  const cdiRate     = merchant?.cdiRate ?? 0.8
  const saldo       = merchant?.balance ?? 0
  const pendente    = merchant?.pendingBalance ?? 0
  const cdiAnual    = (Math.pow(1 + cdiRate / 100, 12) - 1) * 100

  const currentPlan = plans.find((p) => p.key === planoAtual) ?? plans[0]
  const currentIdx  = plans.findIndex((p) => p.key === planoAtual)
  const nextPlan    = plans[currentIdx + 1] ?? null

  // Simulação: ganho em 12 meses por plano baseado no saldo atual
  const simBase = saldo > 0 ? saldo : 10000
  const maxRend12 = simBase * (Math.pow(1 + plans[plans.length - 1].cdiRate / 100, 12) - 1)

  return (
    <div>
      <Topbar
        title="Meu Plano"
        breadcrumb="Minha Conta"
        subtitle={`Plano atual: ${planoAtual} · CDI ${cdiRate.toFixed(2)}%/mês · ${cdiAnual.toFixed(2)}% a.a.`}
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* Banner plano atual */}
        <div className={`bg-slate-900/70 border rounded-xl px-5 py-4 ring-1 ${currentPlan.ring}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`w-3 h-3 rounded-full shrink-0 ${currentPlan.dot}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Plano atual</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${currentPlan.badge}`}>{planoAtual}</span>
              </div>
              <p className={`text-[22px] font-bold ${currentPlan.color}`}>{planoAtual}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Taxa CDI: <strong className="text-slate-300">{cdiRate.toFixed(2)}%/mês</strong> ({cdiAnual.toFixed(2)}% a.a.) ·
                Saldo em CDI: <strong className="text-slate-300">R$ {formatBRL(saldo)}</strong>
              </p>
            </div>
            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">Rendimento / Mês</p>
              <p className="text-[20px] font-bold text-emerald-400 tabular-nums">
                R$ {formatBRL(saldo * (cdiRate / 100))}
              </p>
              <p className="text-[9.5px] text-slate-600 mt-0.5">sobre R$ {formatBRL(saldo)} em CDI</p>
            </div>
          </div>
        </div>

        {/* Simulação de ganho por plano */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Simulação de Ganho por Plano em 12 meses</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">
                Base: R$ {formatBRL(simBase)} em CDI · {saldo === 0 ? 'simulação com R$ 10.000' : 'seu saldo atual'}
              </p>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-800/40">
              {plans.map((p, i) => {
                const rend12 = simBase * (Math.pow(1 + p.cdiRate / 100, 12) - 1)
                const pct    = (rend12 / maxRend12) * 100
                const isAtual = p.key === planoAtual
                const rendAnual = (Math.pow(1 + p.cdiRate / 100, 12) - 1) * 100
                const diffFromCurrent = rend12 - simBase * (Math.pow(1 + cdiRate / 100, 12) - 1)
                return (
                  <div key={p.key} className={`px-5 py-4 ${isAtual ? 'bg-slate-800/30' : 'hover:bg-slate-800/20'} transition-colors`}>
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.dot}`} />
                        <span className={`text-[13px] font-bold ${p.color}`}>{p.label}</span>
                        {isAtual && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badge}`}>Atual</span>
                        )}
                        <span className="text-[10.5px] text-slate-600">{p.cdiRate.toFixed(2)}%/mês · {rendAnual.toFixed(2)}% a.a.</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(rend12)}</p>
                        {!isAtual && diffFromCurrent > 0 && (
                          <p className="text-[10px] text-blue-400 tabular-nums">+R$ {formatBRL(diffFromCurrent)} a mais</p>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${p.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Upgrade CTA */}
        {nextPlan && (
          <div className={`border rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap ring-1 ${nextPlan.ring} bg-slate-900/60`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${nextPlan.badge}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[13px] font-bold ${nextPlan.color}`}>Upgrade para {nextPlan.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Aumente sua taxa CDI de <strong className="text-slate-400">{cdiRate.toFixed(2)}%</strong> para <strong className={nextPlan.color}>{nextPlan.cdiRate.toFixed(2)}%/mês</strong>
                {saldo > 0 && (
                  <> · Ganhe <strong className="text-emerald-400">+R$ {formatBRL(saldo * (Math.pow(1 + nextPlan.cdiRate / 100, 12) - 1) - saldo * (Math.pow(1 + cdiRate / 100, 12) - 1))}</strong> a mais em 12 meses</>
                )}
              </p>
            </div>
            <Link
              href="/cliente/suporte"
              className={`shrink-0 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all border ${nextPlan.ring} ${nextPlan.badge} hover:opacity-80`}
            >
              Solicitar Upgrade →
            </Link>
          </div>
        )}

        {/* Comparativo de planos */}
        <section>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Comparativo Completo de Planos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {plans.map((p) => {
              const active = p.key === planoAtual
              return (
                <div key={p.key} className={`bg-slate-900/60 border rounded-xl p-4 relative ${active ? `ring-1 ${p.ring} border-transparent` : 'border-slate-800/70'}`}>
                  {active && (
                    <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badge}`}>
                      Atual
                    </div>
                  )}
                  <div className={`w-2.5 h-2.5 rounded-full mb-3 ${p.dot}`} />
                  <p className={`text-[16px] font-bold mb-3 ${p.color}`}>{p.label}</p>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] text-slate-600">CDI/mês</span>
                      <span className={`text-[11px] font-bold ${p.color}`}>{p.cdiRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] text-slate-600">Taxa transação</span>
                      <span className="text-[11px] font-semibold text-slate-300">{p.taxa}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] text-slate-600">Saque</span>
                      <span className="text-[11px] font-semibold text-slate-300">{p.saque}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] text-slate-600">Suporte</span>
                      <span className="text-[11px] font-semibold text-slate-300">{p.suporte}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-start gap-1.5">
                        <svg className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[10.5px] text-slate-400">{f}</span>
                      </div>
                    ))}
                  </div>
                  {!active && p.key !== planoAtual && currentIdx < plans.findIndex(pp => pp.key === p.key) && (
                    <Link
                      href="/cliente/suporte"
                      className={`mt-3 block text-center py-1.5 rounded-lg border text-[11px] font-semibold transition-colors hover:opacity-80 ${p.badge} ${p.ring}`}
                    >
                      Fazer upgrade →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4">
          <p className="text-[12px] font-semibold text-blue-400 mb-1">Como fazer upgrade?</p>
          <p className="text-[11px] text-slate-500">
            Entre em contato pelo <Link href="/cliente/suporte" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Suporte</Link> ou pelo seu gerente de conta. Upgrades são aplicados imediatamente e a nova taxa CDI começa a valer no próximo ciclo mensal.
          </p>
        </div>

      </div>
    </div>
  )
}
