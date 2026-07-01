export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { ToggleStatusButton } from './ToggleStatusButton'
import { CreateAccessForm } from './CreateAccessForm'
import { RiskPanel } from './risk/RiskPanel'
import RiskConfigForm from './risk/RiskConfigForm'
import SimularVendaForm from './risk/SimularVendaForm'
import ReserveCalendar, { ReserveEntry } from './risk/ReserveCalendar'
import RiskSuggestions from './risk/RiskSuggestions'
import MasterScoreRiskBanner from './risk/MasterScoreRiskBanner'
import SellerTabs from './SellerTabs'
import { MerchantNotes } from './MerchantNotes'
import { ResetPasswordButton } from './ResetPasswordButton'
import { computeRiskSuggestions, computeRiskMetrics } from '@/lib/computeRiskSuggestions'
import { scoreToReservaSugerida } from '@/lib/masterScore'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  REVIEW: 'Em análise',
}

const statusVariant: Record<string, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  BLOCKED: 'danger',
  REVIEW: 'warning',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
  MARKETPLACE: 'Marketplace',
  SERVICOS: 'Prestador de Serviços',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-slate-700/40 last:border-0">
      <span className="text-slate-400 text-sm w-48 shrink-0">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export default async function ClienteDetalhesPage({ params }: PageProps) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: params.id },
    include: { users: { select: { id: true, email: true, name: true }, take: 1 } },
  })

  // Early return before any other queries
  if (!merchant) {
    return (
      <div>
        <Topbar title="Cliente não encontrado" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
          <p className="text-white font-semibold text-lg">Cliente não encontrado</p>
          <Link href="/admin/clientes" className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors">Voltar</Link>
        </div>
      </div>
    )
  }

  // Fetch release schedule logs
  const futureLogs = await prisma.auditLog.findMany({
    where: { entityId: merchant.id, action: 'RISK_FUTURE_SET' },
    orderBy: { createdAt: 'desc' },
  })

  const releaseLogs = futureLogs
    .map((l) => {
      try {
        const m = JSON.parse(l.metadata ?? '{}')
        return { id: l.id, amount: parseFloat(m.amount || 0), releaseDate: m.releaseDate ?? '', reason: m.reason ?? '' }
      } catch { return null }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null && !!l.releaseDate)

  // Fetch reserve calendar entries
  const reserveEntries = await prisma.reserveRelease.findMany({
    where: { merchantId: merchant.id },
    orderBy: { releaseAt: 'asc' },
  })

  const calendarEntries: ReserveEntry[] = reserveEntries.map((r) => ({
    id:             r.id,
    saleLogId:      r.saleLogId,
    amount:         r.amount,
    saleAmount:     r.saleAmount,
    reservePercent: r.reservePercent,
    releaseDays:    r.releaseDays,
    saleDate:       r.saleDate.toISOString(),
    releaseAt:      r.releaseAt.toISOString(),
    status:         r.status,
    releasedAt:     r.releasedAt?.toISOString() ?? null,
    notes:          r.notes ?? null,
  }))

  // Compute risk suggestions + metrics + master score
  const [riskSuggestions, riskMetrics, masterScore] = await Promise.all([
    computeRiskSuggestions(merchant).catch(() => []),
    computeRiskMetrics(merchant).catch(() => null),
    prisma.masterScore.findUnique({ where: { merchantId: merchant.id } }).catch(() => null),
  ])

  const reservaSugerida = masterScore
    ? scoreToReservaSugerida(masterScore.scoreTotal, merchant.riskReservePercent)
    : null

  // Fetch risk audit history + recent transactions + open disputes (parallel)
  const [riskLogs, recentSales, openDisputes] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityId: merchant.id,
        action: { in: ['RISK_RESERVE_SET', 'RISK_BLOCK_SET', 'RISK_FUTURE_SET', 'RISK_RELEASE', 'RISK_AUTO_RESERVE', 'BALANCE_ADJUST', 'RISK_CONFIG_UPDATE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.saleLog.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.dispute.findMany({
      where: { merchantId: merchant.id, status: 'ABERTO' },
      orderBy: { openedAt: 'desc' },
    }),
  ])

  const riskActionLabel: Record<string, string> = {
    RISK_RESERVE_SET:   'Reserva separada (manual)',
    RISK_BLOCK_SET:     'Saldo bloqueado',
    RISK_FUTURE_SET:    'Liberação agendada',
    RISK_RELEASE:       'Saldo liberado',
    RISK_AUTO_RESERVE:  'Reserva automática (venda)',
    BALANCE_ADJUST:     'Venda aprovada',
    RISK_CONFIG_UPDATE: 'Config de risco alterada',
  }

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Detalhes do cliente" />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">Clientes</Link>
          <span>/</span>
          <span className="text-white">{merchant.name}</span>
        </nav>

        <SellerTabs merchantId={merchant.id} />

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/clientes"
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
          <Link
            href={`/admin/clientes/${merchant.id}/editar`}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Link>
          <ToggleStatusButton id={merchant.id} status={merchant.status} />
        </div>

        {/* ══ Anotação interna ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-[13px] font-semibold text-white">Anotação Interna</p>
            <span className="text-[10px] text-slate-600 ml-1">Visível apenas para administradores</span>
          </div>
          <div className="p-5">
            <MerchantNotes merchantId={merchant.id} initialNotes={(merchant as any).merchantNotes ?? ''} />
          </div>
        </div>

        {/* ══ Saldos completos ══ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-white font-semibold text-[13.5px]">Saldos do Seller</h3>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">Visão Financeira Completa</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Disponível',        value: merchant.pendingBalance,  color: 'text-emerald-400', border: 'border-emerald-500/20', sub: 'livre para saque' },
              { label: 'Em CDI',            value: merchant.balance,         color: 'text-amber-400',   border: 'border-amber-500/20',   sub: 'rendendo juros' },
              { label: 'Saldo Reservado',   value: merchant.reservedBalance, color: 'text-amber-400',   border: 'border-amber-500/15',   sub: 'reserva de risco' },
              { label: 'Saldo Bloqueado',   value: merchant.blockedBalance,  color: 'text-red-400',     border: 'border-red-500/15',     sub: 'chargeback/MED' },
              { label: 'Liberação Futura',  value: merchant.futureBalance,   color: 'text-blue-400',    border: 'border-blue-500/15',    sub: 'agendado' },
            ].map((c) => (
              <div key={c.label} className={`bg-slate-800/50 border ${c.border} rounded-xl p-4`}>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{c.label}</p>
                <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>R$ {formatBRL(c.value)}</p>
                <p className="text-[12px] text-slate-600 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Reserva Inteligente de Risco ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Reserva Inteligente de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Gerencie reservas, bloqueios e liberações agendadas do seller</p>
            </div>
          </div>
          <div className="p-5">
            <RiskPanel
              merchantId={merchant.id}
              pendingBalance={merchant.pendingBalance}
              reservedBalance={merchant.reservedBalance}
              blockedBalance={merchant.blockedBalance}
              futureBalance={merchant.futureBalance}
              releaseLogs={releaseLogs}
            />
          </div>
        </div>

        {/* ══ Calendário de Liberação ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Calendário de Liberação da Reserva</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Todas as reservas deste seller — status, prazo e liberação manual ou automática
              </p>
            </div>
          </div>
          <div className="p-5">
            <ReserveCalendar merchantId={merchant.id} entries={calendarEntries} />
          </div>
        </div>

        {/* ══ Configuração de Risco ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Configuração de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Percentual de reserva automática e limites por venda aprovada</p>
            </div>
          </div>
          <div className="p-5">
            <RiskConfigForm
              merchantId={merchant.id}
              initial={{
                riskReservePercent: merchant.riskReservePercent,
                riskReleaseDays:    merchant.riskReleaseDays,
                riskLevel:          merchant.riskLevel,
                riskReserveMin:     merchant.riskReserveMin,
                riskReserveMax:     merchant.riskReserveMax,
                riskNotes:          merchant.riskNotes,
              }}
            />
          </div>
        </div>

        {/* ══ Métricas de Risco (últimos 90 dias) ══ */}
        {riskMetrics && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/40">
              <p className="text-[13px] font-semibold text-white">Métricas de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Calculadas a partir das transações registradas — base para as sugestões abaixo</p>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: 'Taxa de Chargeback',
                  value: riskMetrics.totalSales90d > 0 ? `${riskMetrics.chargebackRate.toFixed(2)}%` : '—',
                  sub:   `${riskMetrics.chargebackCount90d} estorno(s) / ${riskMetrics.totalSales90d} vendas (90d)`,
                  color: riskMetrics.chargebackRate >= 2 ? 'text-red-400' : riskMetrics.chargebackRate >= 1 ? 'text-amber-400' : 'text-emerald-400',
                },
                {
                  label: 'Taxa MED Pix',
                  value: riskMetrics.totalSales90d > 0 ? `${riskMetrics.medRate.toFixed(2)}%` : '—',
                  sub:   `${riskMetrics.medCount90d} MED(s) nos últimos 90d`,
                  color: riskMetrics.medRate >= 1 ? 'text-red-400' : riskMetrics.medRate > 0 ? 'text-amber-400' : 'text-emerald-400',
                },
                {
                  label: 'Ticket Médio (30d)',
                  value: riskMetrics.avgTicket30d > 0 ? `R$ ${formatBRL(riskMetrics.avgTicket30d)}` : '—',
                  sub:   `Volume: R$ ${formatBRL(riskMetrics.volumeLast30d)}`,
                  color: riskMetrics.avgTicket30d > 5000 ? 'text-amber-400' : 'text-slate-300',
                },
                {
                  label: 'Crescimento de Volume',
                  value: riskMetrics.volumePrev30d > 0 ? `${riskMetrics.volumeGrowthPct >= 0 ? '+' : ''}${Math.round(riskMetrics.volumeGrowthPct)}%` : '—',
                  sub:   `Últ. 30d vs 30-60d atrás`,
                  color: riskMetrics.volumeGrowthPct >= 100 ? 'text-amber-400' : riskMetrics.volumeGrowthPct > 0 ? 'text-emerald-400' : 'text-slate-400',
                },
                {
                  label: 'Reembolsos (30d)',
                  value: riskMetrics.reimbCount30d > 0 ? `${riskMetrics.reimbCount30d} caso(s)` : '0',
                  sub:   `R$ ${formatBRL(riskMetrics.reimbVolume30d)}`,
                  color: riskMetrics.reimbCount30d >= 3 ? 'text-amber-400' : 'text-slate-400',
                },
                {
                  label: 'Dias sem disputa',
                  value: riskMetrics.daysSinceLastDispute !== null ? `${riskMetrics.daysSinceLastDispute}d` : 'Nunca',
                  sub:   riskMetrics.daysSinceLastDispute === null ? 'Sem histórico de disputas' : riskMetrics.daysSinceLastDispute >= 90 ? 'Ótimo histórico' : riskMetrics.daysSinceLastDispute >= 60 ? 'Bom histórico' : 'Monitorar',
                  color: riskMetrics.daysSinceLastDispute === null || riskMetrics.daysSinceLastDispute >= 90 ? 'text-emerald-400' : riskMetrics.daysSinceLastDispute >= 60 ? 'text-blue-400' : 'text-amber-400',
                },
                {
                  label: 'Chargebacks abertos',
                  value: String(riskMetrics.openChargebacks),
                  sub:   'Casos sem resolução final',
                  color: riskMetrics.openChargebacks >= 2 ? 'text-red-400' : riskMetrics.openChargebacks > 0 ? 'text-amber-400' : 'text-emerald-400',
                },
                {
                  label: 'MED Pix em aberto',
                  value: String(riskMetrics.openMed),
                  sub:   'Casos sem resolução final',
                  color: riskMetrics.openMed >= 2 ? 'text-red-400' : riskMetrics.openMed > 0 ? 'text-amber-400' : 'text-emerald-400',
                },
              ].map((c) => (
                <div key={c.label} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
                  <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                  <p className="text-[12px] text-slate-600 mt-1 leading-tight">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Master Score — Sugestão de Reserva ══ */}
        {masterScore && reservaSugerida && (
          <MasterScoreRiskBanner
            merchantId={merchant.id}
            scoreTotal={masterScore.scoreTotal}
            nivelScore={masterScore.nivelScore}
            statusRisco={masterScore.statusRisco}
            reservaSugerida={reservaSugerida}
            reservaAtual={merchant.riskReservePercent}
            prazoAtual={merchant.riskReleaseDays}
            riskLevelAtual={merchant.riskLevel}
            masterScoreHref={`/admin/master-score/${merchant.id}`}
          />
        )}

        {/* ══ Sugestões Automáticas de Risco ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-white">Sugestões Automáticas de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Analisadas automaticamente — o ADM decide se aplica ou ignora</p>
            </div>
            {riskSuggestions.length > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {riskSuggestions.length} sugestão{riskSuggestions.length !== 1 ? 'ões' : ''}
              </span>
            )}
          </div>
          <div className="p-5">
            <RiskSuggestions
              merchantId={merchant.id}
              suggestions={riskSuggestions}
              currentPercent={merchant.riskReservePercent}
              currentDays={merchant.riskReleaseDays}
              currentLevel={merchant.riskLevel}
              currentMin={merchant.riskReserveMin}
              currentMax={merchant.riskReserveMax}
              currentNotes={merchant.riskNotes}
            />
          </div>
        </div>

        {/* ══ Simular Venda Aprovada ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Simular Venda Aprovada</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Testa o fluxo de reserva automática com um valor de venda — sem integração real</p>
            </div>
          </div>
          <div className="p-5">
            <SimularVendaForm merchantId={merchant.id} reservePercent={merchant.riskReservePercent} />
          </div>
        </div>

        {/* ══ Histórico de Ações de Risco ══ */}
        {riskLogs.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-700/40">
              <p className="text-[13px] font-semibold text-white">Histórico de Ações de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{riskLogs.length} ação{riskLogs.length !== 1 ? 'ões' : ''} registrada{riskLogs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-slate-700/30">
              {riskLogs.map((log) => {
                let meta: Record<string, string> = {}
                try { meta = JSON.parse(log.metadata ?? '{}') } catch {}
                const isRelease = log.action === 'RISK_RELEASE'
                return (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isRelease ? 'bg-emerald-500/10 text-emerald-400' : log.action === 'RISK_BLOCK_SET' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={isRelease ? 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z' : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-medium text-slate-200">{riskActionLabel[log.action] ?? log.action}</p>
                        {meta.reason && (
                          <span className="text-[10px] text-slate-600 truncate">· {meta.reason}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600">
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(log.createdAt))}
                        {meta.from && meta.to && <span className="ml-1.5 text-slate-700">{meta.from} → {meta.to}</span>}
                      </p>
                    </div>
                    {meta.amount && (
                      <p className={`text-[12.5px] font-bold tabular-nums shrink-0 ${isRelease ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isRelease ? '+' : '-'}R$ {formatBRL(parseFloat(meta.amount))}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main info card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-white font-semibold">Informações cadastrais</h2>
            <Badge variant={statusVariant[merchant.status] ?? 'neutral'}>
              {statusLabel[merchant.status] ?? merchant.status}
            </Badge>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="Nome" value={merchant.name} />
            <InfoRow label="E-mail" value={merchant.email} />
            <InfoRow label="Documento" value={<span className="font-mono">{merchant.document}</span>} />
            <InfoRow label="Tipo" value={typeLabel[merchant.type] ?? merchant.type} />
            <InfoRow label="Status" value={
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[merchant.status] ?? 'neutral'}>{statusLabel[merchant.status] ?? merchant.status}</Badge>
                {merchant.status === 'REVIEW' && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Aguardando KYC</span>
                )}
                {merchant.status === 'ACTIVE' && (
                  <a href={`/admin/kyc?q=${encodeURIComponent(merchant.email)}`} className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full hover:bg-emerald-500/20 transition-colors">KYC Aprovado</a>
                )}
              </div>
            } />
            <InfoRow label="Plano" value={<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">{merchant.plan}</span>} />
            <InfoRow label="Taxa CDI" value={<span className="text-emerald-400 font-mono">{merchant.cdiRate.toFixed(2)}%/mês</span>} />
            {merchant.tradeName && <InfoRow label="Nome Fantasia" value={merchant.tradeName} />}
            {merchant.commercialPhone && <InfoRow label="Telefone Comercial" value={merchant.commercialPhone} />}
            {merchant.website && <InfoRow label="Site" value={<a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{merchant.website}</a>} />}
            {merchant.segment && <InfoRow label="Segmento" value={merchant.segment} />}
            {merchant.legalRepresentative && <InfoRow label="Representante Legal" value={merchant.legalRepresentative} />}
            {merchant.address && <InfoRow label="Endereço" value={merchant.address} />}
            <InfoRow label="Criado em" value={new Date(merchant.createdAt).toLocaleString('pt-BR')} />
            <InfoRow label="ID" value={<span className="font-mono text-slate-500 text-xs">{merchant.id}</span>} />
            <InfoRow
              label="API Key"
              value={
                <span className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-xs truncate max-w-[280px]">
                    {merchant.apiKey ? `${merchant.apiKey.slice(0, 12)}••••••••••••••••••••` : '—'}
                  </span>
                  {merchant.apiKey && (
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">Ver na aba Integrações</span>
                  )}
                </span>
              }
            />
          </div>
        </div>

        {/* Login access */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Acesso ao painel do seller</h2>
              <p className="text-xs text-slate-500 mt-0.5">Login para a área do seller em /cliente/dashboard</p>
            </div>
            {merchant.users.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Acesso ativo
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-500 bg-slate-700/40 border border-slate-600/30 px-2.5 py-1 rounded-full">Sem acesso</span>
            )}
          </div>
          <div className="px-6 py-5">
            {merchant.users.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-slate-400 space-y-1">
                  <p><span className="text-slate-500">Login:</span> <span className="text-slate-200 font-mono">{merchant.users[0].email}</span></p>
                  <p><span className="text-slate-500">Nome:</span> <span className="text-slate-200">{merchant.users[0].name}</span></p>
                </div>
                <ResetPasswordButton merchantId={merchant.id} hasUser={true} />
              </div>
            ) : (
              <CreateAccessForm merchantId={merchant.id} email={merchant.email} />
            )}
          </div>
        </div>

        {/* ══ Dados de Saque / PIX ══ */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Dados de Saque</h2>
              <p className="text-xs text-slate-500 mt-0.5">Chave PIX e banco cadastrados para recebimento dos saques</p>
            </div>
            {merchant.pixKey ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Configurado
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">Não configurado</span>
            )}
          </div>
          <div className="px-6 py-2">
            {merchant.pixKey ? (
              <>
                <InfoRow label="Tipo de Chave PIX" value={
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300">
                    {merchant.pixKeyType ?? '—'}
                  </span>
                } />
                <InfoRow label="Chave PIX" value={<span className="font-mono text-slate-200">{merchant.pixKey}</span>} />
                {merchant.bankName && <InfoRow label="Banco" value={merchant.bankName} />}
              </>
            ) : (
              <div className="py-6 text-center text-slate-500 text-sm">
                Seller ainda não cadastrou dados de saque. Os dados são inseridos via processo de KYC.
              </div>
            )}
          </div>
        </div>

        {/* ══ Disputas em Aberto ══ */}
        {openDisputes.length > 0 && (
          <div className="bg-slate-800/30 border border-red-500/20 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-red-500/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white">Disputas em Aberto</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">{openDisputes.length} disputa{openDisputes.length !== 1 ? 's' : ''} aguardando resolução</p>
              </div>
              <a href="/admin/disputas" className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors">Ver todas →</a>
            </div>
            <div className="divide-y divide-slate-700/30">
              {openDisputes.map((d) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{d.type}</span>
                      {d.deadline && (
                        <span className="text-[10px] text-slate-500">
                          Prazo: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(d.deadline))}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{d.notes ?? 'Sem observações'}</p>
                  </div>
                  <p className="text-[13px] font-bold tabular-nums text-red-400 shrink-0">R$ {formatBRL(d.contestedAmount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ Últimas Transações ══ */}
        {recentSales.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Últimas Transações</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">As {recentSales.length} transações mais recentes registradas para este seller</p>
              </div>
              <a href={`/admin/transacoes?merchant=${merchant.id}`} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">Ver todas →</a>
            </div>
            <div className="divide-y divide-slate-700/30">
              {recentSales.map((sale) => {
                const typeColors: Record<string, string> = {
                  VENDA: 'text-emerald-400 bg-emerald-500/10',
                  ESTORNO: 'text-red-400 bg-red-500/10',
                  MED_PIX: 'text-orange-400 bg-orange-500/10',
                  REEMBOLSO: 'text-amber-400 bg-amber-500/10',
                  PIX_DEVOLVIDO: 'text-slate-400 bg-slate-700/40',
                }
                const statusColors: Record<string, string> = {
                  APROVADO: 'text-emerald-400',
                  CANCELADO: 'text-red-400',
                  PENDENTE: 'text-amber-400',
                }
                return (
                  <div key={sale.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeColors[sale.type] ?? 'text-slate-400 bg-slate-700/40'}`}>{sale.type}</span>
                        <span className={`text-[10px] font-semibold ${statusColors[sale.status] ?? 'text-slate-400'}`}>{sale.status}</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-0.5">
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(sale.createdAt))}
                        {sale.description && <span className="ml-1.5 truncate">· {sale.description}</span>}
                      </p>
                    </div>
                    <p className={`text-[13px] font-bold tabular-nums shrink-0 ${sale.type === 'VENDA' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {sale.type === 'VENDA' ? '+' : '-'}R$ {formatBRL(sale.amount)}
                    </p>
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
