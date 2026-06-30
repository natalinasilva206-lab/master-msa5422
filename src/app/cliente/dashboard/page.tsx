export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

const planColors: Record<string, string> = {
  Start:  'text-slate-300',
  Growth: 'text-blue-400',
  Prime:  'text-purple-400',
  Black:  'text-slate-100',
}

const planBg: Record<string, string> = {
  Start:  'bg-slate-700/40',
  Growth: 'bg-blue-600/20 border border-blue-500/20',
  Prime:  'bg-purple-600/20 border border-purple-500/20',
  Black:  'bg-slate-800/80 border border-slate-600/30',
}

const recentTransactions = [
  { id: 'TXN-001', description: 'Venda curso Python',        amount: 297.00,  status: 'APPROVED', date: '29/06/2024' },
  { id: 'TXN-002', description: 'Venda ebook marketing',     amount: 47.00,   status: 'APPROVED', date: '29/06/2024' },
  { id: 'TXN-003', description: 'Venda mentoria',            amount: 1997.00, status: 'PENDING',  date: '28/06/2024' },
  { id: 'TXN-004', description: 'Venda software SaaS',       amount: 89.90,   status: 'APPROVED', date: '28/06/2024' },
  { id: 'TXN-005', description: 'Venda pacote anual',        amount: 597.00,  status: 'REFUNDED', date: '27/06/2024' },
]

const txVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success',
  PENDING:  'warning',
  REFUNDED: 'danger',
}
const txLabel: Record<string, string> = {
  APPROVED: 'Aprovada',
  PENDING:  'Pendente',
  REFUNDED: 'Estornada',
}

export default async function ClienteDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Seller'

  const saldo         = merchant?.balance       ?? 0
  const pendente      = merchant?.pendingBalance ?? 0
  const cdiRate       = merchant?.cdiRate        ?? 1.0
  const rendimentoMes = saldo * (cdiRate / 100)
  const cdiAnual      = anualizarTaxa(cdiRate)
  const plano         = merchant?.plan ?? '—'

  return (
    <div>
      <Topbar
        title="Meu Dashboard"
        subtitle="Resumo da sua conta"
        breadcrumb={`Olá, ${firstName} 👋`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* ── KPI Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Saldo Disponível */}
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/30 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Saldo Disponível</p>
            <p className="text-[22px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(saldo)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Disponível para saque</p>
          </div>

          {/* Volume Transacionado */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 hover:bg-slate-800/40 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">↑ 14,2%</span>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Volume Transacionado</p>
            <p className="text-[22px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(saldo + pendente)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Mês atual</p>
          </div>

          {/* Rendimento Previsto */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Rendimento Previsto</p>
            <p className="text-[22px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(rendimentoMes)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Estimativa do mês · {cdiRate.toFixed(2)}%/mês</p>
          </div>

          {/* Plano Atual */}
          <div className={`rounded-2xl p-5 hover:opacity-90 transition-all ${planBg[plano] ?? 'bg-slate-900/60 border border-slate-800/70'}`}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Plano Atual</p>
            <p className={`text-[22px] font-bold leading-none ${planColors[plano] ?? 'text-white'}`}>{plano}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Taxa CDI: {cdiRate.toFixed(2)}% + R$ 0,29</p>
          </div>

        </section>

        {/* ── Saldo Pendente + CDI Simulação ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Saldo pendente + ações */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12.5px] font-semibold text-white">Saldo Pendente</p>
              <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Aguardando liberação</span>
            </div>
            <p className="text-[28px] font-bold text-amber-400 tabular-nums leading-none">R$ {formatBRL(pendente)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2 mb-5">Valores em processo de liquidação</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cliente/saques" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Solicitar Saque
              </Link>
              <Link href="/cliente/cdi" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-[12px] font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Ver CDI
              </Link>
            </div>
          </div>

          {/* CDI Simulação */}
          {saldo > 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/60">
                <p className="text-[12.5px] font-semibold text-white">Simulação CDI</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">{cdiRate.toFixed(2)}%/mês · {cdiAnual.toFixed(2)}% a.a. (juros compostos)</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-800/40">
                {[
                  { label: '1 mês',   meses: 1  },
                  { label: '3 meses', meses: 3  },
                  { label: '6 meses', meses: 6  },
                  { label: '12 meses', meses: 12 },
                ].map(({ label, meses }) => {
                  const rendimento = saldo * (Math.pow(1 + cdiRate / 100, meses) - 1)
                  const total = saldo + rendimento
                  return (
                    <div key={label} className="p-4">
                      <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{label}</p>
                      <p className="text-[14px] font-bold text-white tabular-nums">R$ {formatBRL(total)}</p>
                      <p className="text-[10.5px] text-emerald-400 mt-0.5 tabular-nums">+R$ {formatBRL(rendimento)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <svg className="w-10 h-10 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-[12.5px] font-medium text-slate-600">Sem saldo para simular</p>
              <p className="text-[11px] text-slate-700 mt-1">Quando seu saldo for liberado, a simulação CDI aparecerá aqui.</p>
            </div>
          )}

        </section>

        {/* ── Últimas Transações ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Últimas Transações</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Histórico recente de vendas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-700 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full font-medium">Dados demo</span>
              <Link href="/cliente/transacoes" className="text-[11.5px] font-medium text-slate-500 hover:text-blue-400 transition-colors">
                Ver todas →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Descrição</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-mono text-slate-500">#{tx.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] text-slate-200">{tx.description}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[13px] font-bold tabular-nums ${tx.status === 'REFUNDED' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tx.status === 'REFUNDED' ? '−' : '+'}R$ {formatBRL(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={txVariant[tx.status] ?? 'neutral'}>
                        {txLabel[tx.status] ?? tx.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                      <span className="text-[11px] text-slate-600">{tx.date}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
