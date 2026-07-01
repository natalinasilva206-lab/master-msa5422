export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

/* ─── helpers ──────────────────────────────────────────────── */
function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1).replace('.', ',')}K`
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtBRLFull(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const RISK_LABEL: Record<string, string> = { LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto' }
const RISK_COLOR: Record<string, string> = {
  LOW:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  MEDIUM: 'text-amber-400   bg-amber-500/10   border-amber-500/20',
  HIGH:   'text-red-400     bg-red-500/10     border-red-500/20',
}

/* ─── status visual ────────────────────────────────────────── */
type SellerStatus = 'SAUDAVEL' | 'ATENCAO' | 'ALTO_RISCO' | 'BLOQUEADO' | 'EM_ANALISE'

const STATUS_META: Record<SellerStatus, { label: string; dot: string; color: string }> = {
  SAUDAVEL:   { label: 'Saudável',    dot: 'bg-emerald-400', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ATENCAO:    { label: 'Atenção',     dot: 'bg-amber-400',   color: 'text-amber-400   bg-amber-500/10   border-amber-500/20'   },
  ALTO_RISCO: { label: 'Alto risco',  dot: 'bg-red-400',     color: 'text-red-400     bg-red-500/10     border-red-500/20'     },
  BLOQUEADO:  { label: 'Bloqueado',   dot: 'bg-rose-500',    color: 'text-rose-400    bg-rose-500/10    border-rose-500/20'    },
  EM_ANALISE: { label: 'Em análise',  dot: 'bg-blue-400',    color: 'text-blue-400    bg-blue-500/10    border-blue-500/20'    },
}

function computeStatus(
  merchantStatus: string,
  riskLevel: string,
  openDisputes: number,
  openMed: number,
  blockedBalance: number,
): SellerStatus {
  if (merchantStatus === 'BLOCKED') return 'BLOQUEADO'
  if (merchantStatus === 'REVIEW')  return 'EM_ANALISE'
  if (riskLevel === 'HIGH' || openDisputes >= 2 || blockedBalance > 0) return 'ALTO_RISCO'
  if (riskLevel === 'MEDIUM' || openDisputes > 0 || openMed > 0)       return 'ATENCAO'
  return 'SAUDAVEL'
}

function computeRecommendation(
  status: SellerStatus,
  riskLevel: string,
  openDisputes: number,
  openMed: number,
  openReembolso: number,
  reservePercent: number,
): string {
  if (status === 'BLOQUEADO')   return 'Revisar motivo do bloqueio'
  if (status === 'EM_ANALISE')  return 'Concluir análise KYC'
  if (status === 'ALTO_RISCO') {
    if (openDisputes >= 2)       return 'Múltiplas disputas — elevar reserva'
    if (riskLevel === 'HIGH')    return 'Nível alto — ajustar % de reserva'
    return 'Saldo bloqueado — verificar disputa'
  }
  if (status === 'ATENCAO') {
    if (openMed > 0)             return 'MED Pix ativo — acompanhar prazo'
    if (openReembolso > 0)       return 'Reembolso pendente — resolver'
    if (openDisputes > 0)        return 'Disputa aberta — monitorar'
  }
  return '—'
}

/* ─── page ─────────────────────────────────────────────────── */
export default async function RiscoPage() {
  const now    = new Date()
  const in7d   = new Date(now); in7d.setDate(now.getDate() + 7)
  const in30d  = new Date(now); in30d.setDate(now.getDate() + 30)
  const ago30d = new Date(now); ago30d.setDate(now.getDate() - 30)

  /* ── plataforma-wide aggregates ── */
  const [
    totalReservado,
    totalBloqueado,
    totalChargeback,
    totalMedPix,
    liberar7d,
    liberar30d,
    merchants,
    openDisputesByMerchant,
    monthlySalesByMerchant,
  ] = await Promise.all([
    /* total reservado (reservedBalance) */
    prisma.merchant.aggregate({ _sum: { reservedBalance: true } }).catch(() => ({ _sum: { reservedBalance: 0 } })),

    /* total bloqueado por disputa (sum of blockedAmount across all open disputes) */
    prisma.dispute.aggregate({
      where: { status: { notIn: ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'] } },
      _sum: { blockedAmount: true },
    }).catch(() => ({ _sum: { blockedAmount: 0 } })),

    /* total em chargeback (valor contestado) */
    prisma.dispute.aggregate({
      where: {
        type:   'CHARGEBACK',
        status: { notIn: ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'] },
      },
      _sum: { contestedAmount: true },
    }).catch(() => ({ _sum: { contestedAmount: 0 } })),

    /* total em MED Pix (valor contestado) */
    prisma.dispute.aggregate({
      where: {
        type:   'MED_PIX',
        status: { notIn: ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'] },
      },
      _sum: { contestedAmount: true },
    }).catch(() => ({ _sum: { contestedAmount: 0 } })),

    /* a liberar nos próximos 7 dias */
    prisma.reserveRelease.aggregate({
      where: { status: 'RESERVADO', releaseAt: { gte: now, lte: in7d } },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: 0 } })),

    /* a liberar nos próximos 30 dias */
    prisma.reserveRelease.aggregate({
      where: { status: 'RESERVADO', releaseAt: { gte: now, lte: in30d } },
      _sum: { amount: true },
    }).catch(() => ({ _sum: { amount: 0 } })),

    /* todos os sellers */
    prisma.merchant.findMany({
      select: {
        id: true, name: true, status: true, plan: true,
        pendingBalance: true, reservedBalance: true, blockedBalance: true,
        riskReservePercent: true, riskLevel: true,
      },
      orderBy: { name: 'asc' },
    }).catch(() => []),

    /* disputas abertas por merchant e tipo */
    prisma.dispute.groupBy({
      by: ['merchantId', 'type'],
      where: { status: { notIn: ['RESOLVIDO_SELLER', 'RESOLVIDO_CONTRA', 'DEVOLVIDO_PARCIAL', 'FINALIZADO'] } },
      _count: { id: true },
    }).catch(() => []),

    /* volume mensal real por merchant — usa SaleLog VENDA APROVADO (30d) */
    prisma.saleLog.groupBy({
      by: ['merchantId'],
      where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago30d } },
      _sum: { amount: true },
    }).catch(() => []),
  ])

  /* ── derived counts ── */
  const reservedTotal  = totalReservado._sum.reservedBalance ?? 0
  const blockedTotal   = totalBloqueado._sum.blockedAmount   ?? 0
  const volumeProtegido = reservedTotal + blockedTotal

  /* sellers em alto risco */
  const altaRiscoCount = merchants.filter(
    (m) => m.riskLevel === 'HIGH' || m.status === 'BLOCKED'
  ).length

  /* mapeia disputas por merchant (total, med, reembolso, chargeback) */
  const disputeMap = new Map<string, { total: number; med: number; reembolso: number; chargeback: number }>()
  for (const d of openDisputesByMerchant) {
    const cur = disputeMap.get(d.merchantId) ?? { total: 0, med: 0, reembolso: 0, chargeback: 0 }
    cur.total += d._count.id
    if (d.type === 'MED_PIX')    cur.med       += d._count.id
    if (d.type === 'REEMBOLSO')  cur.reembolso += d._count.id
    if (d.type === 'CHARGEBACK') cur.chargeback += d._count.id
    disputeMap.set(d.merchantId, cur)
  }

  /* sellers com pelo menos 1 disputa aberta / MED aberto */
  const sellersComDisputa = Array.from(disputeMap.values()).filter((d) => d.total > 0).length
  const sellersComMed     = Array.from(disputeMap.values()).filter((d) => d.med   > 0).length

  /* mapeia volume mensal por merchant — fonte: SaleLog */
  const volMap = new Map<string, number>()
  for (const s of monthlySalesByMerchant) {
    volMap.set(s.merchantId, s._sum.amount ?? 0)
  }

  /* monta rows */
  const rows = merchants.map((m) => {
    const disp = disputeMap.get(m.id) ?? { total: 0, med: 0, reembolso: 0, chargeback: 0 }
    const vol  = volMap.get(m.id) ?? 0
    const status = computeStatus(m.status, m.riskLevel, disp.total, disp.med, m.blockedBalance)
    const recommendation = computeRecommendation(
      status, m.riskLevel, disp.total, disp.med, disp.reembolso, m.riskReservePercent
    )
    return { ...m, vol, openDisputes: disp.total, openMed: disp.med, openReembolso: disp.reembolso, openChargeback: disp.chargeback, status, recommendation }
  })

  /* sort: risk priority */
  const statusOrder: Record<SellerStatus, number> = {
    BLOQUEADO: 0, ALTO_RISCO: 1, EM_ANALISE: 2, ATENCAO: 3, SAUDAVEL: 4,
  }
  rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  /* ─── kpi cards ─── */
  const kpis = [
    {
      label: 'Total reservado',
      value: fmtBRL(reservedTotal),
      sub:   'saldo reservado na plataforma',
      icon:  'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
      color: 'border-amber-500/20 bg-amber-500/5',
      vc:    'text-amber-300',
    },
    {
      label: 'Bloqueado em disputas',
      value: fmtBRL(blockedTotal),
      sub:   'em casos ativos',
      icon:  'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      color: 'border-red-500/20 bg-red-500/5',
      vc:    'text-red-300',
    },
    {
      label: 'Em chargeback',
      value: fmtBRL(totalChargeback._sum.contestedAmount ?? 0),
      sub:   'valor contestado ativo',
      icon:  'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
      color: 'border-rose-500/20 bg-rose-500/5',
      vc:    'text-rose-300',
    },
    {
      label: 'Em MED Pix',
      value: fmtBRL(totalMedPix._sum.contestedAmount ?? 0),
      sub:   'mecanismo especial de devolução',
      icon:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'border-orange-500/20 bg-orange-500/5',
      vc:    'text-orange-300',
    },
    {
      label: 'A liberar em 7 dias',
      value: fmtBRL(liberar7d._sum.amount ?? 0),
      sub:   'reservas com vencimento próximo',
      icon:  'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'border-blue-500/20 bg-blue-500/5',
      vc:    'text-blue-300',
    },
    {
      label: 'A liberar em 30 dias',
      value: fmtBRL(liberar30d._sum.amount ?? 0),
      sub:   'calendário de liberações',
      icon:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'border-indigo-500/20 bg-indigo-500/5',
      vc:    'text-indigo-300',
    },
    {
      label: 'Volume protegido',
      value: fmtBRL(volumeProtegido),
      sub:   'reservado + bloqueado em disputa',
      icon:  'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      color: 'border-teal-500/20 bg-teal-500/5',
      vc:    'text-teal-300',
    },
    {
      label: 'Sellers em alto risco',
      value: altaRiscoCount,
      sub:   'nível HIGH ou status BLOCKED',
      icon:  'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      color: altaRiscoCount > 0 ? 'border-red-500/30 bg-red-500/8' : 'border-slate-700/40 bg-slate-800/30',
      vc:    altaRiscoCount > 0 ? 'text-red-400' : 'text-slate-400',
    },
    {
      label: 'Com disputa aberta',
      value: sellersComDisputa,
      sub:   'sellers com caso ativo',
      icon:  'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      color: sellersComDisputa > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-slate-700/40 bg-slate-800/30',
      vc:    sellersComDisputa > 0 ? 'text-red-400' : 'text-slate-400',
    },
    {
      label: 'Com MED aberto',
      value: sellersComMed,
      sub:   'MED Pix em andamento',
      icon:  'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: sellersComMed > 0 ? 'border-orange-500/20 bg-orange-500/5' : 'border-slate-700/40 bg-slate-800/30',
      vc:    sellersComMed > 0 ? 'text-orange-400' : 'text-slate-400',
    },
  ]

  /* status counts for legend */
  const statusCounts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {} as Record<SellerStatus, number>)

  return (
    <div>
      <Topbar
        title="Reserva Inteligente de Risco"
        subtitle={`${merchants.length} seller${merchants.length !== 1 ? 's' : ''} monitorados`}
      />

      <div className="p-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className={`rounded-xl border p-4 flex flex-col gap-2 ${k.color}`}>
              <div className="flex items-start justify-between gap-1">
                <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{k.label}</p>
                <svg className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={k.icon} />
                </svg>
              </div>
              <p className={`text-[18px] font-bold tabular-nums leading-none ${k.vc}`}>{k.value}</p>
              <p className="text-[9px] text-slate-600 leading-tight">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Legend + quick stats ── */}
        <div className="flex flex-wrap items-center gap-3">
          {(Object.entries(STATUS_META) as [SellerStatus, typeof STATUS_META[SellerStatus]][]).map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              {meta.label}
              <span className="text-slate-600">({statusCounts[key] ?? 0})</span>
            </span>
          ))}
          <span className="ml-auto text-[11px] text-slate-500">
            Atualizado em tempo real · Status é apenas informativo
          </span>
        </div>

        {/* ── Sellers Table ── */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Visão geral de risco por seller</p>
            <Link
              href="/admin/disputas"
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Central de Disputas →
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">Nenhum seller cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/40 bg-slate-800/50">
                    {[
                      'Seller',
                      'Volume 30d',
                      'Disponível',
                      'Reservado',
                      'Bloqueado',
                      '% Reserva',
                      'Nível risco',
                      'Chargebacks',
                      'MED',
                      'Reembolsos',
                      'Status',
                      'Recomendação',
                      '',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/25">
                  {rows.map((r) => {
                    const sm = STATUS_META[r.status]
                    const rl = RISK_COLOR[r.riskLevel] ?? RISK_COLOR.MEDIUM
                    const isHighlight = r.status === 'ALTO_RISCO' || r.status === 'BLOQUEADO'
                    return (
                      <tr
                        key={r.id}
                        className={`group transition-colors ${
                          isHighlight ? 'bg-red-950/10 hover:bg-red-950/20' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Seller */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0 ${
                              r.status === 'BLOQUEADO' ? 'bg-red-800/40' :
                              r.status === 'ALTO_RISCO' ? 'bg-red-900/30' : 'bg-slate-700/50'
                            }`}>
                              {r.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-slate-200 leading-tight">{r.name}</p>
                              <p className="text-[11px] text-slate-600">{r.plan}</p>
                            </div>
                          </div>
                        </td>

                        {/* Volume 30d */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[13px] tabular-nums text-slate-300">
                            {r.vol > 0 ? fmtBRL(r.vol) : <span className="text-slate-600">—</span>}
                          </span>
                        </td>

                        {/* Disponível */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[13px] tabular-nums text-emerald-400 font-medium">
                            R$ {fmtBRLFull(r.pendingBalance)}
                          </span>
                        </td>

                        {/* Reservado */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs tabular-nums font-medium ${r.reservedBalance > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {r.reservedBalance > 0 ? `R$ ${fmtBRLFull(r.reservedBalance)}` : '—'}
                          </span>
                        </td>

                        {/* Bloqueado */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs tabular-nums font-medium ${r.blockedBalance > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                            {r.blockedBalance > 0 ? `R$ ${fmtBRLFull(r.blockedBalance)}` : '—'}
                          </span>
                        </td>

                        {/* % Reserva */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(r.riskReservePercent, 20) / 20 * 100}%` }}
                              />
                            </div>
                            <span className="text-[13px] tabular-nums text-slate-300">{r.riskReservePercent}%</span>
                          </div>
                        </td>

                        {/* Nível risco */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${rl}`}>
                            {RISK_LABEL[r.riskLevel] ?? r.riskLevel}
                          </span>
                        </td>

                        {/* Chargebacks */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {r.openChargeback > 0 ? (
                            <Link href={`/admin/disputas?type=CHARGEBACK`}>
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors">
                                {r.openChargeback}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-slate-600 text-[12px]">—</span>
                          )}
                        </td>

                        {/* MED */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {r.openMed > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400">
                              {r.openMed}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[12px]">—</span>
                          )}
                        </td>

                        {/* Reembolsos */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {r.openReembolso > 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400">
                              {r.openReembolso}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[12px]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${sm.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                            {sm.label}
                          </span>
                        </td>

                        {/* Ação recomendada */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[11px] ${r.recommendation === '—' ? 'text-slate-600' : 'text-slate-300'}`}>
                            {r.recommendation}
                          </span>
                        </td>

                        {/* Gerenciar */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/admin/clientes/${r.id}`}
                              className="text-[12px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                            >
                              Gerenciar →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Alertas rápidos ── */}
        {rows.some((r) => r.status === 'ALTO_RISCO' || r.status === 'BLOQUEADO') && (
          <div className="bg-red-950/20 border border-red-700/30 rounded-2xl p-5 space-y-3">
            <p className="text-[12px] font-semibold text-red-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Sellers que requerem atenção imediata
            </p>
            <div className="space-y-2">
              {rows
                .filter((r) => r.status === 'ALTO_RISCO' || r.status === 'BLOQUEADO')
                .map((r) => {
                  const sm = STATUS_META[r.status]
                  return (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sm.dot}`} />
                      <span className="text-slate-300 font-medium flex-1">{r.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sm.color}`}>{sm.label}</span>
                      {r.openDisputes > 0 && (
                        <span className="text-[10px] text-red-400">{r.openDisputes} disputa{r.openDisputes !== 1 ? 's' : ''}</span>
                      )}
                      {r.blockedBalance > 0 && (
                        <span className="text-[10px] text-red-400">R$ {fmtBRLFull(r.blockedBalance)} bloqueado</span>
                      )}
                      {r.recommendation !== '—' && (
                        <span className="text-[10px] text-slate-500 italic">{r.recommendation}</span>
                      )}
                      <Link
                        href={`/admin/clientes/${r.id}`}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold ml-2"
                      >
                        Ver →
                      </Link>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
