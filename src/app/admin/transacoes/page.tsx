export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const actionMeta: Record<string, { label: string; sign: string; color: string; badge: string; dot: string }> = {
  ADD_TO_CDI:          { label: 'Aporte CDI',           sign: '+', color: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
  ANTECIPACAO_REQUEST: { label: 'Antecipação',           sign: '+', color: 'text-blue-400',    badge: 'text-blue-400 bg-blue-500/10',       dot: 'bg-blue-500' },
  WITHDRAW_REQUEST:    { label: 'Saque Solicitado',      sign: '-', color: 'text-amber-400',   badge: 'text-amber-400 bg-amber-500/10',     dot: 'bg-amber-500' },
  WITHDRAW_APPROVED:   { label: 'Saque Aprovado',        sign: '-', color: 'text-blue-400',    badge: 'text-blue-400 bg-blue-500/10',       dot: 'bg-blue-400' },
  CDI_CREDIT:          { label: 'Rendimento CDI',        sign: '+', color: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
  BALANCE_ADJUST:      { label: 'Ajuste de Saldo',       sign: '±', color: 'text-slate-300',   badge: 'text-slate-400 bg-slate-700/40',     dot: 'bg-slate-500' },
  KYC_APPROVED:        { label: 'KYC Aprovado',          sign: '',  color: 'text-emerald-400', badge: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
  KYC_BLOCKED:         { label: 'KYC Bloqueado',         sign: '',  color: 'text-red-400',     badge: 'text-red-400 bg-red-500/10',         dot: 'bg-red-500' },
  MERCHANT_CREATED:    { label: 'Empresa Criada',        sign: '',  color: 'text-blue-400',    badge: 'text-blue-400 bg-blue-500/10',       dot: 'bg-blue-500' },
  CDI_RATE_UPDATED:    { label: 'Taxa CDI Atualizada',   sign: '',  color: 'text-purple-400',  badge: 'text-purple-400 bg-purple-500/10',   dot: 'bg-purple-500' },
}

function getAmount(action: string, metadata: string | null): number | null {
  try {
    const m = JSON.parse(metadata ?? '{}')
    if (m.amount) return parseFloat(m.amount)
    if (m.value)  return parseFloat(m.value)
  } catch {}
  return null
}

export default async function AdminTransacoesPage() {
  const [logs, allMerchants] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: 'Merchant' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            merchant: { select: { name: true, plan: true } },
          },
        },
      },
    }),
    prisma.merchant.findMany({ select: { balance: true, pendingBalance: true } }),
  ])

  const totalCdi      = allMerchants.reduce((s, m) => s + m.balance, 0)
  const totalPending  = allMerchants.reduce((s, m) => s + m.pendingBalance, 0)

  const financialLogs = logs.filter((l) => ['ADD_TO_CDI', 'ANTECIPACAO_REQUEST', 'WITHDRAW_REQUEST', 'WITHDRAW_APPROVED', 'CDI_CREDIT', 'BALANCE_ADJUST'].includes(l.action))

  const totalAportado = logs
    .filter((l) => l.action === 'ADD_TO_CDI')
    .reduce((s, l) => s + (getAmount(l.action, l.metadata) ?? 0), 0)

  const totalSacado = logs
    .filter((l) => l.action === 'WITHDRAW_REQUEST')
    .reduce((s, l) => s + (getAmount(l.action, l.metadata) ?? 0), 0)

  return (
    <div>
      <Topbar
        title="Transações"
        breadcrumb="Casa › Financeiro"
        subtitle="Histórico de movimentações financeiras da plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total em CDI',       value: `R$ ${formatBRL(totalCdi)}`,     sub: 'saldo rendendo',          color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { label: 'Total Disponível',   value: `R$ ${formatBRL(totalPending)}`, sub: 'pendingBalance sellers',   color: 'text-amber-400',   bg: 'bg-amber-500/10 text-amber-500',    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Aportes CDI',        value: `R$ ${formatBRL(totalAportado)}`, sub: `${logs.filter((l) => l.action === 'ADD_TO_CDI').length} operações`, color: 'text-blue-400', bg: 'bg-blue-500/10 text-blue-500', icon: 'M12 4v16m8-8H4' },
            { label: 'Saques Solicitados', value: `R$ ${formatBRL(totalSacado)}`,  sub: `${logs.filter((l) => l.action === 'WITHDRAW_REQUEST').length} saques`, color: 'text-purple-400', bg: 'bg-purple-500/10 text-purple-500', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
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

        {/* Tabela */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Histórico de Movimentações</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{logs.length} eventos · financeiros: {financialLogs.length}</p>
            </div>
            <Link
              href="/admin/conciliacao"
              className="text-[11px] font-medium text-slate-500 hover:text-blue-400 transition-colors"
            >
              Audit Log completo →
            </Link>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma movimentação ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Operação</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Seller</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Plano</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.map((log) => {
                    const meta   = actionMeta[log.action] ?? { label: log.action, sign: '', color: 'text-slate-500', badge: 'text-slate-500 bg-slate-800/60', dot: 'bg-slate-700' }
                    const amount = getAmount(log.action, log.metadata)
                    const sellerName = log.user.merchant?.name ?? log.user.name ?? log.user.email ?? '—'
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                            <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded-md ${meta.badge}`}>{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-[12px] font-medium text-slate-300 truncate max-w-[140px]">{sellerName}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-[11px] text-slate-600 font-medium">{log.user.merchant?.plan ?? '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {amount !== null ? (
                            <span className={`text-[13px] font-bold tabular-nums ${meta.color}`}>
                              {meta.sign === '-' ? '−' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-700">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right hidden md:table-cell">
                          <span className="text-[11px] text-slate-600">{formatDate(log.createdAt)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-2.5 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-700">Exibindo {logs.length} de todos os registros</span>
                <Link href="/admin/conciliacao" className="text-[11px] font-medium text-slate-600 hover:text-blue-400 transition-colors">
                  Ver audit log completo →
                </Link>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
