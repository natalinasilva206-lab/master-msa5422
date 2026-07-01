export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { KycActions } from './KycActions'

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
]

const subStatusLabel: Record<string, string> = {
  EM_ANALISE: 'Em Análise',
  AGUARDANDO_CALL: 'Aguardando Call',
  AJUSTE_SOLICITADO: 'Ajuste Solicitado',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
}

const subStatusStyle: Record<string, string> = {
  EM_ANALISE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  AGUARDANDO_CALL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  AJUSTE_SOLICITADO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  APROVADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJEITADO: 'bg-red-500/10 text-red-400 border-red-500/20',
}

interface PageProps {
  searchParams: { q?: string; tab?: string }
}

export default async function KycPage({ searchParams }: PageProps) {
  const q = searchParams?.q?.trim() ?? ''
  const activeTab = searchParams?.tab ?? 'analise'

  const [merchants, kycLogs, allHistory] = await Promise.all([
    prisma.merchant.findMany({
      where: {
        status: { in: ['REVIEW', 'ACTIVE', 'BLOCKED'] },
        ...(q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { document: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { users: { orderBy: { createdAt: 'asc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ['KYC_CALL_REQUESTED', 'KYC_ADJUSTMENT_REQUESTED', 'KYC_REJECTED', 'APPROVE_MERCHANT_KYC', 'BLOCK_MERCHANT_KYC'] } },
      orderBy: { createdAt: 'desc' },
      select: { entityId: true, action: true },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ['KYC_CALL_REQUESTED', 'KYC_ADJUSTMENT_REQUESTED', 'KYC_REJECTED', 'APPROVE_MERCHANT_KYC', 'BLOCK_MERCHANT_KYC'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, entityId: true, action: true, createdAt: true, metadata: true, user: { select: { name: true } } },
    }),
  ])

  // Derive kycSubStatus per merchant from latest KYC audit action
  const latestKycAction = new Map<string, string>()
  for (const log of kycLogs) {
    if (log.entityId && !latestKycAction.has(log.entityId)) {
      latestKycAction.set(log.entityId, log.action)
    }
  }

  // Build audit history map per merchant
  const historyByMerchant = new Map<string, typeof allHistory>()
  for (const log of allHistory) {
    if (!log.entityId) continue
    const arr = historyByMerchant.get(log.entityId) ?? []
    arr.push(log)
    historyByMerchant.set(log.entityId, arr)
  }

  function deriveSubStatus(merchantId: string, status: string): string {
    if (status === 'ACTIVE') return 'APROVADO'
    if (status === 'BLOCKED') return 'REJEITADO'
    const lastAction = latestKycAction.get(merchantId)
    if (lastAction === 'KYC_CALL_REQUESTED') return 'AGUARDANDO_CALL'
    if (lastAction === 'KYC_ADJUSTMENT_REQUESTED') return 'AJUSTE_SOLICITADO'
    return 'EM_ANALISE'
  }

  type KycDoc = { type: string; label: string; url: string }
  function parseDocs(raw: string | null): KycDoc[] {
    try {
      const parsed = JSON.parse(raw ?? '[]')
      return parsed.map((item: unknown) => {
        if (typeof item === 'string') return { type: 'OTHER', label: 'Documento', url: item }
        return item as KycDoc
      })
    } catch { return [] }
  }

  const enriched = merchants.map((m) => {
    const kycDocumentUrls = parseDocs((m as any).kycDocumentUrls ?? null)
    return {
      ...m,
      kycSubStatus: deriveSubStatus(m.id, m.status),
      userName: m.users[0]?.name ?? null,
      userEmail: m.users[0]?.email ?? null,
      kycDocumentUrls,
      kycNotes: (m as any).kycNotes ?? '',
      pixKey: (m as any).pixKey ?? null,
      pixKeyType: (m as any).pixKeyType ?? null,
      bankName: (m as any).bankName ?? null,
      auditHistory: (historyByMerchant.get(m.id) ?? []).map((l) => ({
        id: l.id,
        action: l.action,
        createdAt: l.createdAt.toISOString(),
        metadata: l.metadata,
        userName: l.user?.name ?? null,
      })),
      createdAt: m.createdAt.toISOString(),
    }
  })

  // KPI counts
  const counts = {
    emAnalise: enriched.filter((m) => m.kycSubStatus === 'EM_ANALISE').length,
    aguardandoCall: enriched.filter((m) => m.kycSubStatus === 'AGUARDANDO_CALL').length,
    aprovados: enriched.filter((m) => m.kycSubStatus === 'APROVADO').length,
    rejeitados: enriched.filter((m) => m.kycSubStatus === 'REJEITADO').length,
    ajusteSolicitado: enriched.filter((m) => m.kycSubStatus === 'AJUSTE_SOLICITADO').length,
  }

  // Filter by tab
  const tabFilter: Record<string, string[]> = {
    analise: ['EM_ANALISE'],
    call: ['AGUARDANDO_CALL'],
    aprovados: ['APROVADO'],
    rejeitados: ['REJEITADO'],
    ajustes: ['AJUSTE_SOLICITADO'],
    todos: ['EM_ANALISE', 'AGUARDANDO_CALL', 'APROVADO', 'REJEITADO', 'AJUSTE_SOLICITADO'],
  }
  const filtered = enriched.filter((m) => (tabFilter[activeTab] ?? tabFilter['todos']).includes(m.kycSubStatus))

  const kpis = [
    { label: 'Aguardando Análise', value: counts.emAnalise, tab: 'analise', color: 'text-amber-400', bg: 'bg-amber-500/10 text-amber-500', border: counts.emAnalise > 0 ? 'border-amber-500/20' : 'border-slate-800/70', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Aguardando Call', value: counts.aguardandoCall, tab: 'call', color: 'text-blue-400', bg: 'bg-blue-500/10 text-blue-500', border: counts.aguardandoCall > 0 ? 'border-blue-500/20' : 'border-slate-800/70', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { label: 'Aprovados', value: counts.aprovados, tab: 'aprovados', color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Rejeitados', value: counts.rejeitados, tab: 'rejeitados', color: counts.rejeitados > 0 ? 'text-red-400' : 'text-slate-600', bg: 'bg-red-500/10 text-red-500', border: 'border-slate-800/70', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
    { label: 'Ajustes Solicitados', value: counts.ajusteSolicitado, tab: 'ajustes', color: counts.ajusteSolicitado > 0 ? 'text-orange-400' : 'text-slate-600', bg: 'bg-orange-500/10 text-orange-500', border: counts.ajusteSolicitado > 0 ? 'border-orange-500/20' : 'border-slate-800/70', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  ]

  const tabs = [
    { label: 'Em Análise', value: 'analise', count: counts.emAnalise },
    { label: 'Aguardando Call', value: 'call', count: counts.aguardandoCall },
    { label: 'Aprovados', value: 'aprovados', count: counts.aprovados },
    { label: 'Rejeitados', value: 'rejeitados', count: counts.rejeitados },
    { label: 'Todos', value: 'todos', count: enriched.length },
  ]

  return (
    <div>
      <Topbar
        title="Análise de KYC"
        breadcrumb="Casa › Administração"
        subtitle="Analise e aprove os cadastros de verificação"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {kpis.map((c) => (
            <Link key={c.tab} href={`/admin/kyc?tab=${c.tab}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors block`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Search + filter row */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <form method="GET" action="/admin/kyc" className="flex-1 min-w-[200px]">
            <input type="hidden" name="tab" value={activeTab} />
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                name="q"
                type="text"
                defaultValue={q}
                placeholder="Buscar por nome, email, CPF ou empresa..."
                className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg pl-9 pr-3 py-2 text-[13px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-colors"
              />
            </div>
          </form>

          <div className="flex items-center gap-0.5 bg-slate-800/60 border border-slate-700/40 rounded-xl p-1 flex-wrap">
            {tabs.map(({ label, value, count }) => (
              <Link
                key={value}
                href={`/admin/kyc?tab=${value}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === value
                    ? 'bg-blue-600 text-white shadow shadow-blue-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    activeTab === value ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Cadastros KYC
              </p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            {(counts.emAnalise + counts.aguardandoCall + counts.ajusteSolicitado) > 0 && (
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                {counts.emAnalise + counts.aguardandoCall + counts.ajusteSolicitado} pendente{(counts.emAnalise + counts.aguardandoCall + counts.ajusteSolicitado) !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum resultado</p>
              <p className="text-[11px] text-slate-800 mt-1">{q ? 'Tente ajustar a busca.' : 'Todos os sellers foram processados.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Empresa</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Data de Envio</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filtered.map((m, i) => {
                    const merchantData = {
                      id: m.id,
                      name: m.name,
                      email: m.email,
                      document: m.document,
                      type: m.type,
                      status: m.status,
                      plan: m.plan,
                      balance: m.balance,
                      pendingBalance: m.pendingBalance,
                      cdiRate: m.cdiRate,
                      createdAt: m.createdAt,
                      kycSubStatus: m.kycSubStatus,
                      userName: m.userName,
                      userEmail: m.userEmail,
                      auditHistory: m.auditHistory,
                      kycDocumentUrls: m.kycDocumentUrls,
                      kycNotes: m.kycNotes,
                      pixKey: m.pixKey,
                      pixKeyType: m.pixKeyType,
                      bankName: m.bankName,
                    }

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/25 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                              {getInitials(m.userName ?? m.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold text-white truncate">{m.userName ?? m.name}</p>
                              <p className="text-[12px] text-slate-600 truncate">{m.userEmail ?? m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-[13px] font-semibold text-slate-300 truncate max-w-[200px]">{m.name}</p>
                          <p className="text-[10.5px] text-slate-600 font-mono truncate">{m.document}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${subStatusStyle[m.kycSubStatus] ?? subStatusStyle['EM_ANALISE']}`}>
                            {subStatusLabel[m.kycSubStatus] ?? m.kycSubStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className="text-[12px] text-slate-500">
                            {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <KycActions merchant={merchantData} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
