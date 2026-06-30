export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { WithdrawPendingRequests, type WithdrawRequest } from './WithdrawRequestRow'

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

  const merchants = await prisma.merchant.findMany({
    where: { status: 'ACTIVE', pendingBalance: { gt: 0 } },
    orderBy: { pendingBalance: 'desc' },
    take: 10,
  })

  const merchantMap = new Map(
    (await prisma.merchant.findMany({ select: { id: true, name: true, pendingBalance: true } })).map((m) => [m.id as string, m]),
  )

  const allLogs = await prisma.auditLog.findMany({
    where: { action: { in: ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED', 'WITHDRAW_DENIED'] } },
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { user: { select: { name: true, email: true } } },
  })

  const pendingRequests: WithdrawRequest[] = []
  const historyLogs: typeof allLogs = []

  for (const log of allLogs) {
    if (log.action === 'WITHDRAW_REQUEST') {
      let meta: Record<string, unknown> = {}
      try { meta = JSON.parse(log.metadata ?? '{}') } catch {}
      if (meta.resolved) {
        historyLogs.push(log)
      } else {
        const merchant = merchantMap.get(log.entityId ?? '')
        pendingRequests.push({
          id:             log.id,
          merchantId:     log.entityId ?? '',
          sellerName:     log.user.name ?? log.user.email ?? '—',
          amount:         parseFloat(String(meta.amount ?? 0)),
          createdAt:      log.createdAt,
          pendingBalance: merchant?.pendingBalance ?? 0,
        })
      }
    } else {
      historyLogs.push(log)
    }
  }

  const approvedLogs = allLogs.filter((l) => l.action === 'WITHDRAW_APPROVED')
  const deniedLogs   = allLogs.filter((l) => l.action === 'WITHDRAW_DENIED')

  const totalDisponivel = merchants.reduce((s, m) => s + m.pendingBalance, 0)
  const totalAprovado   = approvedLogs.reduce((s, l) => {
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
              label: 'Pendentes',
              value: String(pendingRequests.length),
              sub: pendingRequests.length > 0 ? 'aguardando aprovação' : 'nenhum em aberto',
              color: pendingRequests.length > 0 ? 'text-amber-400' : 'text-slate-500',
              bg: pendingRequests.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800/60 text-slate-600',
              icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
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
              value: `R$ ${formatBRL(totalAprovado)}`,
              sub: `${approvedLogs.length} saques processados`,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 text-blue-500',
              icon: 'M5 13l4 4L19 7',
            },
            {
              label: 'Negados',
              value: String(deniedLogs.length),
              sub: 'saldo devolvido ao seller',
              color: deniedLogs.length > 0 ? 'text-red-400' : 'text-slate-500',
              bg: deniedLogs.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-800/60 text-slate-600',
              icon: 'M6 18L18 6M6 6l12 12',
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

        {/* Fila de aprovação */}
        <WithdrawPendingRequests requests={pendingRequests} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Histórico */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Saques</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{historyLogs.length} movimentações</p>
            </div>
            {historyLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhum saque processado ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[380px] overflow-y-auto">
                {historyLogs.map((log) => {
                  const isApproved = log.action === 'WITHDRAW_APPROVED'
                  const isDenied   = log.action === 'WITHDRAW_DENIED'
                  let amount = 0
                  try { amount = parseFloat(JSON.parse(log.metadata ?? '{}').amount || 0) } catch {}
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-400' :
                        isDenied   ? 'bg-red-500/10 text-red-400' :
                                     'bg-slate-700/40 text-slate-500'
                      }`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={
                            isApproved ? 'M5 13l4 4L19 7' :
                            isDenied   ? 'M6 18L18 6M6 6l12 12' :
                                         'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                          } />
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
                        <span className={`text-[10px] font-semibold ${
                          isApproved ? 'text-emerald-400' :
                          isDenied   ? 'text-red-400' :
                                       'text-slate-500'
                        }`}>
                          {isApproved ? 'Aprovado' : isDenied ? 'Negado' : 'Solicitado'}
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
              <Link href="/admin/clientes" className="text-[11px] font-medium text-slate-500 hover:text-blue-400 transition-colors">
                Ver todos →
              </Link>
            </div>
            {merchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12.5px] font-medium">Nenhum seller com saldo disponível</p>
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
