export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
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
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  // Merchants with pendingBalance (withdrawable)
  const merchants = await prisma.merchant.findMany({
    where: { status: 'ACTIVE', pendingBalance: { gt: 0 } },
    orderBy: { pendingBalance: 'desc' },
    take: 10,
  })

  // Recent withdrawal requests from AuditLog
  const withdrawLogs = await prisma.auditLog.findMany({
    where: { action: { in: ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { user: { select: { name: true, email: true } } },
  })

  const pendingLogs  = withdrawLogs.filter((l) => l.action === 'WITHDRAW_REQUEST')
  const approvedLogs = withdrawLogs.filter((l) => l.action === 'WITHDRAW_APPROVED')

  const totalDisponivel   = merchants.reduce((s, m) => s + m.pendingBalance, 0)
  const totalAprovadoHoje = approvedLogs.reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

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
            {
              label: 'Saques Pendentes',
              value: String(pendingLogs.length),
              sub: pendingLogs.length > 0 ? 'aguardando aprovação' : 'nenhum em aberto',
              color: pendingLogs.length > 0 ? 'text-amber-400' : 'text-slate-500',
              bg: pendingLogs.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800/60 text-slate-600',
              icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            },
            {
              label: 'Saldo Disponível',
              value: `R$ ${formatBRL(totalDisponivel)}`,
              sub: 'total pendingBalance sellers',
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 text-emerald-500',
              icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
            },
            {
              label: 'Aprovados',
              value: `R$ ${formatBRL(totalAprovadoHoje)}`,
              sub: `${approvedLogs.length} saques aprovados`,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 text-blue-500',
              icon: 'M5 10l7-7m0 0l7 7m-7-7v18',
            },
            {
              label: 'Sellers com Saldo',
              value: String(merchants.length),
              sub: 'aptos a solicitar saque',
              color: 'text-white',
              bg: 'bg-purple-500/10 text-purple-500',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
            },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Fila de solicitações */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Solicitações Recentes</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">Últimas {withdrawLogs.length} movimentações</p>
              </div>
              {pendingLogs.length > 0 && (
                <span className="text-[10.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  {pendingLogs.length} pendente{pendingLogs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {withdrawLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhuma solicitação ainda</p>
                <p className="text-[11px] text-slate-800 mt-0.5">As solicitações de saque aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[380px] overflow-y-auto">
                {withdrawLogs.map((log) => {
                  const isPending  = log.action === 'WITHDRAW_REQUEST'
                  let amount = 0
                  try { amount = parseFloat(JSON.parse(log.metadata ?? '{}').amount || 0) } catch {}
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isPending ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={isPending ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' : 'M5 13l4 4L19 7'} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-200 truncate">
                          {log.user.name ?? log.user.email}
                        </p>
                        <p className="text-[10.5px] text-slate-600">{formatDate(log.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-white tabular-nums">R$ {formatBRL(amount)}</p>
                        <span className={`text-[10px] font-semibold ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {isPending ? 'Pendente' : 'Aprovado'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sellers com saldo disponível */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Saldo Disponível por Seller</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">PendingBalance — fonte para saques</p>
              </div>
              <Link
                href="/admin/clientes"
                className="text-[11px] font-medium text-slate-500 hover:text-blue-400 transition-colors"
              >
                Ver todos →
              </Link>
            </div>
            {merchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12.5px] font-medium">Nenhum seller com saldo disponível</p>
                <p className="text-[11px] text-slate-800 mt-1">Os saldos aparecem quando há pendingBalance {'>'} 0.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[380px] overflow-y-auto">
                {merchants.map((m, i) => (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-800/25 transition-colors">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                      {getInitials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200 truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-600">{m.plan} · CDI {m.cdiRate.toFixed(1)}%/mês</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(m.pendingBalance)}</p>
                      {m.balance > 0 && (
                        <p className="text-[10px] text-slate-600 tabular-nums">CDI: R$ {formatBRL(m.balance)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
