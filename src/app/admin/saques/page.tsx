export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
]

export default async function SaquesPage() {
  const merchants = await prisma.merchant.findMany({
    where: { status: 'ACTIVE', balance: { gt: 0 } },
    orderBy: { balance: 'desc' },
    take: 8,
  })

  const totalDisponivel = merchants.reduce((s, m) => s + m.balance, 0)

  return (
    <div>
      <Topbar
        title="Saques"
        breadcrumb="Casa › Financeiro"
        subtitle="Gerencie solicitações de saque dos sellers."
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Saques Pendentes', value: '0', sub: 'aguardando aprovação', color: 'text-slate-500', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', bg: 'bg-slate-800/60 text-slate-600' },
            { label: 'Saldo Disponível', value: `R$ ${formatBRL(totalDisponivel)}`, sub: 'total em custódia', color: 'text-emerald-400', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', bg: 'bg-emerald-500/10 text-emerald-500' },
            { label: 'Processados Hoje', value: 'R$ 0,00', sub: 'em saques liberados', color: 'text-slate-500', icon: 'M5 10l7-7m0 0l7 7m-7-7v18', bg: 'bg-blue-500/10 text-blue-500' },
            { label: 'Sellers com Saldo', value: String(merchants.length), sub: 'aptos a sacar', color: 'text-white', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', bg: 'bg-purple-500/10 text-purple-500' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[17px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
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

        {/* Fila de saques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Saques pendentes */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Saques Pendentes</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">Aguardando aprovação manual</p>
              </div>
              <span className="text-[10.5px] font-semibold text-slate-600 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full">
                0 pendentes
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[12.5px] font-medium">Nenhum saque pendente</p>
              <p className="text-[11px] text-slate-800 mt-0.5">As solicitações aparecerão aqui.</p>
            </div>
          </div>

          {/* Sellers com saldo disponível */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Saldo por Seller</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Valores disponíveis para saque</p>
            </div>
            {merchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12.5px] font-medium">Nenhum seller com saldo</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[340px] overflow-y-auto">
                {merchants.map((m, i) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-800/25 transition-colors">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                      {getInitials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200 truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-600">{m.plan} · {m.cdiRate.toFixed(1)}%/mês CDI</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(m.balance)}</p>
                      <Badge variant="success">Disponível</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Info */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-amber-400">Módulo de saques em desenvolvimento</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              O fluxo de solicitação e aprovação de saques será integrado em breve. Os saldos exibidos são gerenciados via CDI e Rendimentos.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
