export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'
import { MerchantActions } from './MerchantActions'

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const statusMeta: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE:   { label: 'Ativo',       color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  REVIEW:   { label: 'Em revisão',  color: 'text-amber-400   bg-amber-500/10   border-amber-500/20',   dot: 'bg-amber-400' },
  BLOCKED:  { label: 'Bloqueado',   color: 'text-red-400     bg-red-500/10     border-red-500/20',     dot: 'bg-red-500' },
  INACTIVE: { label: 'Inativo',     color: 'text-slate-500   bg-slate-700/30   border-slate-700/40',   dot: 'bg-slate-600' },
}

const riskMeta: Record<string, { label: string; color: string }> = {
  LOW:    { label: 'Baixo',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  MEDIUM: { label: 'Médio',  color: 'text-amber-400   bg-amber-500/10   border-amber-500/20'   },
  HIGH:   { label: 'Alto',   color: 'text-red-400     bg-red-500/10     border-red-500/20'     },
}

const PRIORITY_PAGE_SIZE = 20

interface AntifaudePageProps {
  searchParams: { page?: string }
}

export default async function AntifaudePage({ searchParams }: AntifaudePageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const currentPage = Math.max(1, parseInt(searchParams.page ?? '1'))

  const priorityWhere = {
    OR: [
      { status: 'BLOCKED' as const },
      { status: 'REVIEW' as const },
      { riskLevel: 'HIGH' as const },
      { disputes: { some: { status: 'ABERTO' } } },
    ],
  }

  const [totalMerchants, blockedCount, reviewCount, highRiskCount, priorityMerchants, priorityTotal, kycLogs, openDisputes] = await Promise.all([
    prisma.merchant.count().catch(() => 0),
    prisma.merchant.count({ where: { status: 'BLOCKED' } }).catch(() => 0),
    prisma.merchant.count({ where: { status: 'REVIEW' } }).catch(() => 0),
    prisma.merchant.count({ where: { riskLevel: 'HIGH' } }).catch(() => 0),
    prisma.merchant.findMany({
      where: priorityWhere,
      orderBy: [{ status: 'asc' }, { riskLevel: 'desc' }, { updatedAt: 'desc' }],
      skip: (currentPage - 1) * PRIORITY_PAGE_SIZE,
      take: PRIORITY_PAGE_SIZE,
      select: {
        id: true, name: true, email: true, status: true, riskLevel: true,
        blockedBalance: true, reservedBalance: true, createdAt: true,
        _count: { select: { disputes: { where: { status: 'ABERTO' } } } },
      },
    }).catch(() => []),
    prisma.merchant.count({ where: priorityWhere }).catch(() => 0),
    prisma.auditLog.findMany({
      where: { action: { in: ['KYC_BLOCKED', 'KYC_APPROVED', 'MERCHANT_STATUS_CHANGE'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: { select: { name: true, merchant: { select: { name: true } } } } },
    }).catch(() => []),
    prisma.dispute.count({ where: { status: 'ABERTO' } }).catch(() => 0),
  ])

  const totalPages = Math.ceil(priorityTotal / PRIORITY_PAGE_SIZE)

  const rules: { name: string; status: string; desc: string }[] = [
    { name: 'Verificação KYC obrigatória',   status: 'Ativo',    desc: 'Todos os merchants devem passar por verificação de identidade antes de operar.' },
    { name: 'Limite de saque diário',         status: 'Ativo',    desc: 'Saques acima do limite do plano requerem aprovação manual da equipe.' },
    { name: 'Monitoramento de volume',        status: 'Ativo',    desc: 'Alertas automáticos para variações bruscas no volume de transações.' },
    { name: 'Reserva automática de risco',    status: 'Ativo',    desc: 'Retenção de percentual configurável sobre cada venda, liberado após prazo.' },
    { name: 'Detecção de IP suspeito',        status: 'Em breve', desc: 'Bloqueio automático de logins a partir de IPs sinalizados em listas negras.' },
    { name: 'Análise comportamental ML',      status: 'Em breve', desc: 'Motor de machine learning para detecção de padrões de fraude em tempo real.' },
  ]

  return (
    <div>
      <Topbar
        title="Antifraude"
        breadcrumb="Casa › Gestão"
        subtitle="Regras de segurança, bloqueios e monitoramento de risco"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Empresas',    value: totalMerchants, color: 'text-white',      border: 'border-slate-800/70',    bg: 'bg-slate-500/10 text-slate-400' },
            { label: 'Bloqueadas',        value: blockedCount,   color: 'text-red-400',    border: 'border-red-500/20',      bg: 'bg-red-500/10 text-red-500' },
            { label: 'Em Revisão KYC',    value: reviewCount,    color: 'text-amber-400',  border: 'border-amber-500/20',    bg: 'bg-amber-500/10 text-amber-500' },
            { label: 'Disputas Abertas',  value: openDisputes,   color: 'text-orange-400', border: 'border-orange-500/20',   bg: 'bg-orange-500/10 text-orange-500' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                </div>
                {highRiskCount > 0 && c.label === 'Bloqueadas' && (
                  <span className="text-[9px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                    +{highRiskCount} alto risco
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Merchants com atenção */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Sellers em Atenção</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Bloqueados, em revisão ou com alto risco / disputas abertas</p>
            </div>
            {priorityTotal > 0 && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                </span>
                {priorityTotal} requer{priorityTotal === 1 ? '' : 'em'} atenção
              </span>
            )}
          </div>

          {priorityTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Plataforma saudável</p>
              <p className="text-[11px] text-slate-800 mt-1">Nenhum seller requer atenção no momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Risco</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Bloqueado</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Disputas</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {priorityMerchants.map((m, i) => {
                    const st = statusMeta[m.status] ?? statusMeta['REVIEW']
                    const rk = riskMeta[m.riskLevel] ?? riskMeta['MEDIUM']
                    return (
                      <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                              {getInitials(m.name)}
                            </div>
                            <div>
                              <Link href={`/admin/clientes/${m.id}`} className="text-[13px] font-semibold text-slate-200 hover:text-white transition-colors truncate max-w-[130px] block">
                                {m.name}
                              </Link>
                              <p className="text-[12px] text-slate-600 truncate max-w-[130px]">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${rk.color}`}>{rk.label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className={`text-[13px] font-semibold tabular-nums ${m.blockedBalance > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                            {m.blockedBalance > 0 ? `R$ ${m.blockedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                          <span className={`text-[13px] font-semibold tabular-nums ${m._count.disputes > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                            {m._count.disputes > 0 ? m._count.disputes : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <MerchantActions merchantId={m.id} merchantName={m.name} currentStatus={m.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-[11px] text-slate-700">
                    {priorityTotal} seller{priorityTotal !== 1 ? 's' : ''} em atenção · Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    {currentPage > 1 && (
                      <Link href={`?page=${currentPage - 1}`} className="text-[11px] font-medium text-slate-500 hover:text-slate-300 bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-lg transition-colors">
                        ← Anterior
                      </Link>
                    )}
                    {currentPage < totalPages && (
                      <Link href={`?page=${currentPage + 1}`} className="text-[11px] font-medium text-slate-500 hover:text-slate-300 bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-lg transition-colors">
                        Próxima →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Rules */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Regras de Antifraude</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {rules.map((r) => (
              <div key={r.name} className="px-5 py-3.5 flex items-center gap-4">
                <div className={`shrink-0 w-2 h-2 rounded-full ${r.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-200">{r.name}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{r.desc}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  r.status === 'Ativo'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-700/40 text-slate-500 border-slate-700/40'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* KYC event log */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Histórico de Decisões</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Bloqueios, desbloqueios e revisões realizadas</p>
          </div>
          {kycLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <p className="text-[13px] font-medium">Nenhuma decisão ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {kycLogs.map((log) => {
                const isBlock   = log.action === 'KYC_BLOCKED'
                const isReview  = log.action === 'MERCHANT_STATUS_CHANGE'
                let merchantName = log.user?.merchant?.name ?? ''
                let adminName    = log.user?.name ?? ''
                try {
                  const m = JSON.parse(log.metadata ?? '{}')
                  if (m.merchantName) merchantName = m.merchantName
                  if (m.adminName)    adminName    = m.adminName
                } catch {}
                return (
                  <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      isBlock ? 'bg-red-500/10 text-red-400' : isReview ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isBlock ? '✕' : isReview ? '?' : '✓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-200 truncate">
                        {merchantName || 'Merchant'}
                      </p>
                      <p className="text-[12px] text-slate-600">{adminName ? `por ${adminName} · ` : ''}{formatDate(log.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      isBlock ? 'bg-red-500/15 text-red-400' : isReview ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {isBlock ? 'Bloqueado' : isReview ? 'Em revisão' : 'Desbloqueado'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
