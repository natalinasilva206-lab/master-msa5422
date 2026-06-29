export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Taxa mensal → equivalente anual composto: (1 + r/100)^12 - 1
function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

const planColors: Record<string, string> = {
  Start:  'text-slate-400',
  Growth: 'text-blue-400',
  Prime:  'text-purple-400',
  Black:  'text-slate-200',
}

const recentTransactions = [
  { id: 'TXN-8821', description: 'Venda — Curso de Marketing Digital', amount: 297.00,  status: 'APPROVED', date: '29/06' },
  { id: 'TXN-8820', description: 'Venda — Ebook Tráfego Pago',        amount: 47.00,   status: 'APPROVED', date: '29/06' },
  { id: 'TXN-8819', description: 'Venda — Mentoria Individual',        amount: 1997.00, status: 'PENDING',  date: '28/06' },
  { id: 'TXN-8818', description: 'Venda — Pacote Anual SaaS',          amount: 597.00,  status: 'APPROVED', date: '28/06' },
  { id: 'TXN-8817', description: 'Venda — Workshop Presencial',        amount: 397.00,  status: 'REFUNDED', date: '27/06' },
]

const txVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success',
  PENDING:  'warning',
  REFUNDED: 'danger',
}
const txLabel: Record<string, string> = {
  APPROVED: 'Aprovada',
  PENDING:  'Pendente',
  REFUNDED: 'Reembolsada',
}

export default async function ClienteDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant

  const saldo         = merchant?.balance       ?? 0
  const pendente      = merchant?.pendingBalance ?? 0
  const cdiRate       = merchant?.cdiRate       ?? 1.0
  const rendimentoMes = saldo * (cdiRate / 100)
  const cdiAnual      = anualizarTaxa(cdiRate)
  const plano         = merchant?.plan ?? '—'

  return (
    <div>
      <Topbar
        title={`Olá, ${session?.user?.name?.split(' ')[0] ?? 'Seller'}`}
        subtitle={merchant ? `${merchant.name} · Plano ${plano}` : 'Sua conta'}
      />

      <div className="p-5 xl:p-8 space-y-6">

        {/* ── KPIs ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Saldo disponível */}
          <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-5 hover:border-emerald-500/30 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Disponível</p>
            <p className="text-[24px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(saldo)}</p>
            <p className="text-[11px] text-slate-600 mt-2">Disponível para saque</p>
          </div>

          {/* Saldo pendente */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Saldo Pendente</p>
            <p className="text-[24px] font-bold text-amber-400 tabular-nums leading-none">R$ {formatBRL(pendente)}</p>
            <p className="text-[11px] text-slate-600 mt-2">Aguardando liberação</p>
          </div>

          {/* Rendimento CDI */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Rendimento CDI / mês</p>
            <p className="text-[24px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(rendimentoMes)}</p>
            <p className="text-[11px] text-slate-600 mt-2">
              {cdiRate.toFixed(2)}%/mês · {cdiAnual.toFixed(2)}% a.a.
            </p>
          </div>

          {/* Plano atual */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
            <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Plano Atual</p>
            <p className={`text-[24px] font-bold tabular-nums leading-none ${planColors[plano] ?? 'text-white'}`}>
              {plano}
            </p>
            <p className="text-[11px] text-slate-600 mt-2">Taxa CDI: {cdiRate.toFixed(2)}%/mês</p>
          </div>

        </section>

        {/* ── Simulação CDI ── */}
        {saldo > 0 && (
          <section className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest">Simulação de Rendimento CDI</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/60">
              {[
                { label: '1 mês',  meses: 1  },
                { label: '3 meses', meses: 3  },
                { label: '6 meses', meses: 6  },
                { label: '12 meses', meses: 12 },
              ].map(({ label, meses }) => {
                const rendimento = saldo * (Math.pow(1 + cdiRate / 100, meses) - 1)
                const total = saldo + rendimento
                return (
                  <div key={label} className="p-4">
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-[15px] font-bold text-white tabular-nums">R$ {formatBRL(total)}</p>
                    <p className="text-[11px] text-emerald-400 mt-1 tabular-nums">+R$ {formatBRL(rendimento)}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Transações recentes ── */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Transações recentes</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Últimas movimentações da conta</p>
            </div>
            <span className="text-[10.5px] text-slate-600 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full">
              Dados demonstrativos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80">
                  <th className="text-left px-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="text-right px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-4 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors duration-100">
                    <td className="px-5 py-3.5">
                      <span className="text-[11.5px] font-mono text-slate-500">#{tx.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] text-white">{tx.description}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[13px] font-semibold tabular-nums ${tx.status === 'REFUNDED' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tx.status === 'REFUNDED' ? '−' : '+'}R$ {formatBRL(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={txVariant[tx.status] ?? 'neutral'}>
                        {txLabel[tx.status] ?? tx.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[12px] text-slate-500">{tx.date}</span>
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
