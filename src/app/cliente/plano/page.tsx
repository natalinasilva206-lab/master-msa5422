export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const plans = [
  {
    key: 'Start',
    label: 'Start',
    cdi: '0.80',
    taxa: '2.5%',
    saque: '1 dia útil',
    suporte: 'E-mail',
    color: 'text-slate-300',
    ring: 'ring-slate-700/60',
    badge: 'bg-slate-700/60 text-slate-300',
    dot: 'bg-slate-400',
    features: ['Pagamentos via cartão', 'Painel de vendas', 'CDI automático (0.80%/mês)', 'Relatórios básicos'],
  },
  {
    key: 'Growth',
    label: 'Growth',
    cdi: '0.90',
    taxa: '2.0%',
    saque: '1 dia útil',
    suporte: 'E-mail + Chat',
    color: 'text-blue-400',
    ring: 'ring-blue-500/30',
    badge: 'bg-blue-600/20 text-blue-300',
    dot: 'bg-blue-400',
    features: ['Tudo do Start', 'Taxa reduzida', 'CDI 0.90%/mês', 'Antecipação disponível', 'Relatórios avançados'],
  },
  {
    key: 'Prime',
    label: 'Prime',
    cdi: '1.00',
    taxa: '1.7%',
    saque: 'Mesmo dia',
    suporte: 'Prioritário',
    color: 'text-purple-400',
    ring: 'ring-purple-500/30',
    badge: 'bg-purple-600/20 text-purple-300',
    dot: 'bg-purple-400',
    features: ['Tudo do Growth', 'CDI 1.00%/mês', 'Saque no mesmo dia', 'Gerente de conta', 'API avançada'],
  },
  {
    key: 'Black',
    label: 'Black',
    cdi: '1.20',
    taxa: '1.4%',
    saque: 'Instantâneo',
    suporte: 'Exclusivo 24/7',
    color: 'text-slate-100',
    ring: 'ring-slate-500/40',
    badge: 'bg-slate-800/80 text-slate-200',
    dot: 'bg-white',
    features: ['Tudo do Prime', 'CDI 1.20%/mês', 'Saque instantâneo', 'White-label disponível', 'SLA garantido'],
  },
]

export default async function PlanoPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const planoAtual = merchant?.plan ?? 'Start'
  const cdiRate    = merchant?.cdiRate ?? 0.8
  const saldo      = merchant?.balance ?? 0
  const cdiAnual   = (Math.pow(1 + cdiRate / 100, 12) - 1) * 100

  const currentPlan = plans.find((p) => p.key === planoAtual) ?? plans[0]

  return (
    <div>
      <Topbar
        title="Meu Plano"
        breadcrumb="Minha Conta"
        subtitle={`Plano atual: ${planoAtual} · CDI ${cdiRate.toFixed(2)}%/mês`}
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* Current plan banner */}
        <div className={`bg-slate-900/70 border rounded-xl px-5 py-4 flex items-center gap-4 ring-1 ${currentPlan.ring}`}>
          <div className={`w-3 h-3 rounded-full shrink-0 ${currentPlan.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Plano atual</p>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${currentPlan.badge}`}>{planoAtual}</span>
            </div>
            <p className={`text-[22px] font-bold mt-0.5 ${currentPlan.color}`}>{planoAtual}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Taxa mensal CDI: <strong className="text-slate-300">{cdiRate.toFixed(2)}%</strong> ({cdiAnual.toFixed(2)}% a.a.) ·
              Saldo em CDI: <strong className="text-slate-300">R$ {formatBRL(saldo)}</strong>
            </p>
          </div>
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Rendimento/Mês</p>
            <p className="text-[18px] font-bold text-emerald-400 tabular-nums">
              R$ {formatBRL(saldo * (cdiRate / 100))}
            </p>
          </div>
        </div>

        {/* Plan comparison */}
        <section>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Comparativo de Planos</p>
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
                      <span className={`text-[11px] font-bold ${p.color}`}>{p.cdi}%</span>
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
                </div>
              )
            })}
          </div>
        </section>

        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4">
          <p className="text-[12px] font-semibold text-blue-400 mb-1">Upgrade de Plano</p>
          <p className="text-[11px] text-slate-500">
            Para fazer upgrade de plano, entre em contato com o suporte ou seu gerente de conta. Upgrades são aplicados imediatamente e a nova taxa CDI começa a valer no próximo ciclo mensal.
          </p>
        </div>

      </div>
    </div>
  )
}
