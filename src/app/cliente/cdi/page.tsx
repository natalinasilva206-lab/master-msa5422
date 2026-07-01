export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CdiSimulator } from './CdiSimulator'
import { AddToCdiButton } from './AddToCdiButton'
import { WithdrawFromCdiButton } from './WithdrawFromCdiButton'
import { CdiLockButton } from './CdiLockButton'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

function formatMonthYear(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(d)
}

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2
    d += ` C ${cx} ${pts[i - 1].y}, ${cx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`
  }
  return d
}

function nextCreditDate(lastCreditAt: Date | null): { label: string; daysLeft: number } {
  const base = lastCreditAt ? new Date(lastCreditAt) : new Date()
  const next = new Date(base)
  if (lastCreditAt) {
    next.setMonth(next.getMonth() + 1)
  } else {
    // No credit yet — next 1st of next month
    next.setDate(1)
    next.setMonth(next.getMonth() + 1)
  }
  next.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((next.getTime() - Date.now()) / 86400000)
  const label = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(next)
  return { label, daysLeft: Math.max(0, daysLeft) }
}

const meses = [
  { label: '1 mês',    n: 1  },
  { label: '3 meses',  n: 3  },
  { label: '6 meses',  n: 6  },
  { label: '12 meses', n: 12 },
  { label: '24 meses', n: 24 },
  { label: '36 meses', n: 36 },
]

// Comparativo de rentabilidade (referências de mercado — valores ilustrativos fixos)
const SELIC_ANUAL  = 10.50  // % a.a. (referência)
const POUP_MENSAL  = 0.5    // % a.m. (referência)
const SELIC_MENSAL = (Math.pow(1 + SELIC_ANUAL / 100, 1 / 12) - 1) * 100

const extratoMeta: Record<string, { label: string; icon: string; color: string; sign: '+' | '-' | '' }> = {
  ADD_TO_CDI:         { label: 'Aporte CDI',            icon: 'M12 4v16m8-8H4',                                                        color: 'text-emerald-400', sign: '+' },
  CDI_WITHDRAW:       { label: 'Resgate CDI',           icon: 'M5 10l7-7m0 0l7 7m-7-7v18',                                             color: 'text-orange-400',  sign: '-' },
  CDI_CREDIT:         { label: 'Rendimento creditado',  icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',                                        color: 'text-emerald-300', sign: '+' },
  CDI_LOCK_SET:       { label: 'Título bloqueado',      icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'text-blue-400', sign: '' },
  CDI_EARLY_REQUEST:  { label: 'Resgate antecip. pedido', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',                        color: 'text-amber-400',   sign: '' },
  CDI_EARLY_APPROVED: { label: 'Resgate antecip. aprovado', icon: 'M5 13l4 4L19 7',                                                    color: 'text-emerald-400', sign: '-' },
  CDI_EARLY_DENIED:   { label: 'Resgate antecip. negado',   icon: 'M6 18L18 6M6 6l12 12',                                              color: 'text-red-400',     sign: '' },
}

export default async function ClienteCdiPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const saldo    = merchant?.balance        ?? 0
  const pendente = merchant?.pendingBalance ?? 0
  const cdiRate  = merchant?.cdiRate        ?? 1.0
  const cdiAnual = anualizarTaxa(cdiRate)
  const plano    = merchant?.plan      ?? '—'

  const [lockLogs, earlyRequestLogs, earlyResolvedLogs, allCdiLogs, lastCreditLog, firstDepositLog] = merchant
    ? await Promise.all([
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: 'CDI_LOCK_SET' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: 'CDI_EARLY_REQUEST' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: { in: ['CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] } },
        }),
        // Full CDI statement — all events
        prisma.auditLog.findMany({
          where: {
            entityId: merchant.id,
            action: { in: ['ADD_TO_CDI', 'CDI_WITHDRAW', 'CDI_CREDIT', 'CDI_LOCK_SET', 'CDI_EARLY_REQUEST', 'CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 40,
        }),
        prisma.auditLog.findFirst({
          where: { entityId: merchant.id, action: 'CDI_CREDIT' },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.auditLog.findFirst({
          where: { entityId: merchant.id, action: 'ADD_TO_CDI' },
          orderBy: { createdAt: 'asc' },
        }),
      ])
    : [[], [], [], [], null, null]

  const resolvedReqIds = new Set<string>()
  for (const log of earlyResolvedLogs) {
    try { const m = JSON.parse(log.metadata ?? '{}'); if (m.requestLogId) resolvedReqIds.add(m.requestLogId) } catch {}
  }

  const pendingByLock = new Map<string, { id: string; amount: number }>()
  for (const r of earlyRequestLogs) {
    if (resolvedReqIds.has(r.id)) continue
    try {
      const m = JSON.parse(r.metadata ?? '{}')
      if (m.lockId && !pendingByLock.has(m.lockId)) {
        pendingByLock.set(m.lockId, { id: r.id, amount: parseFloat(m.amount || 0) })
      }
    } catch {}
  }

  type CdiTituloData = { id: string; amount: number; expiresAt: string; rate: number; createdAt: string; pendingRequestId?: string; pendingAmount?: number }
  const titulos: CdiTituloData[] = []
  let lockedTotal = 0

  for (const log of lockLogs) {
    try {
      const m = JSON.parse(log.metadata ?? '{}')
      if (!m.expiresAt || !m.amount) continue
      if (new Date(m.expiresAt + 'T23:59:59') <= new Date()) continue
      const pending = pendingByLock.get(log.id)
      titulos.push({
        id: log.id, amount: parseFloat(m.amount), expiresAt: m.expiresAt,
        rate: parseFloat(m.rate ?? cdiRate), createdAt: log.createdAt.toISOString(),
        pendingRequestId: pending?.id, pendingAmount: pending?.amount,
      })
      lockedTotal += parseFloat(m.amount)
    } catch {}
  }

  const freeCdiBalance = Math.max(0, saldo - lockedTotal)

  // CDI credits only (for mini chart)
  const cdiCreditLogs = allCdiLogs.filter((l) => l.action === 'CDI_CREDIT')

  const totalCdiEarned = cdiCreditLogs.reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

  const totalAportado = allCdiLogs.filter((l) => l.action === 'ADD_TO_CDI').reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

  const retornoTotal = totalAportado > 0 ? (totalCdiEarned / totalAportado) * 100 : 0

  // Group CDI credits by month for mini chart
  const creditsByMonth: Record<string, number> = {}
  for (const log of [...cdiCreditLogs].reverse()) {
    const key = formatMonthYear(new Date(log.createdAt))
    creditsByMonth[key] = (creditsByMonth[key] ?? 0) + (() => {
      try { return parseFloat(JSON.parse(log.metadata ?? '{}').amount || 0) } catch { return 0 }
    })()
  }
  const creditMonthEntries = Object.entries(creditsByMonth).slice(-6)
  const creditMax = Math.max(...creditMonthEntries.map(([, v]) => v), 1)

  const rendimentoMes = saldo * (cdiRate / 100)
  const rendimento12m = saldo * (Math.pow(1 + cdiRate / 100, 12) - 1)
  const maxRend = rendimento12m

  // SVG growth chart (36 months)
  const W = 500, H = 130, PAD = 12
  const chartMonths = 36
  const chartPts = Array.from({ length: chartMonths + 1 }, (_, n) => {
    return saldo > 0 ? saldo * Math.pow(1 + cdiRate / 100, n) : n * 10
  })
  const minV = chartPts[0]
  const maxV = chartPts[chartMonths]
  const svgPts = chartPts.map((v, i) => ({
    x: PAD + (i / chartMonths) * (W - PAD * 2),
    y: H - PAD - ((v - minV) / (maxV - minV || 1)) * (H - PAD * 2),
  }))
  const linePath = smoothPath(svgPts)
  const areaPath = linePath + ` L ${svgPts[chartMonths].x} ${H - PAD} L ${svgPts[0].x} ${H - PAD} Z`
  const milestones = [0, 6, 12, 24, 36]

  // Próximo crédito
  const { label: proximoCreditoLabel, daysLeft: diasParaCredito } = nextCreditDate(lastCreditLog?.createdAt ?? null)

  // Tempo desde primeiro aporte
  const diasInvestido = firstDepositLog
    ? Math.floor((Date.now() - new Date(firstDepositLog.createdAt).getTime()) / 86400000)
    : 0

  return (
    <div>
      <Topbar
        title="CDI e Rendimentos"
        breadcrumb="Financeiro"
        subtitle={`Taxa atual: ${cdiRate.toFixed(2)}%/mês · ${cdiAnual.toFixed(2)}% a.a. · Plano ${plano}`}
        actions={
          <div className="flex items-center gap-2">
            {freeCdiBalance > 0 && <WithdrawFromCdiButton cdiBalance={freeCdiBalance} cdiRate={cdiRate} />}
            <AddToCdiButton pendingBalance={pendente} currentBalance={saldo} cdiRate={cdiRate} />
          </div>
        }
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Próximo crédito banner */}
        {saldo > 0 && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-emerald-300">
                  Próximo rendimento em <span className="text-white">{diasParaCredito} dia{diasParaCredito !== 1 ? 's' : ''}</span>
                  {' '}— {proximoCreditoLabel}
                </p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Rendimento estimado: <span className="text-emerald-400 font-semibold">+R$ {formatBRL(rendimentoMes)}</span>
                </p>
              </div>
            </div>
            {diasInvestido > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                {diasInvestido} dia{diasInvestido !== 1 ? 's' : ''} investindo
              </span>
            )}
          </div>
        )}

        {/* Aporte */}
        <div className={`border rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap ${pendente > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/60 border-slate-800/70'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pendente > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800/60 text-slate-500'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className={`text-[12.5px] font-semibold ${pendente > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                {pendente > 0
                  ? `R$ ${formatBRL(pendente)} disponível para aportar no CDI`
                  : 'Aportar saldo disponível no CDI'}
              </p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {pendente > 0
                  ? `Rende ${cdiRate.toFixed(2)}%/mês imediatamente após o aporte`
                  : 'Você não possui saldo pendente no momento'}
              </p>
            </div>
          </div>
          <AddToCdiButton pendingBalance={pendente} currentBalance={saldo} cdiRate={cdiRate} />
        </div>

        {/* Resgatar saldo livre */}
        {freeCdiBalance > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-800/60 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-slate-300">
                  R$ {formatBRL(freeCdiBalance)} CDI livre — resgatar para disponível
                </p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  {lockedTotal > 0 ? `R$ ${formatBRL(lockedTotal)} bloqueados em títulos` : 'O valor vai para seu saldo disponível'}
                </p>
              </div>
            </div>
            <WithdrawFromCdiButton cdiBalance={freeCdiBalance} cdiRate={cdiRate} />
          </div>
        )}

        {/* Títulos */}
        {saldo > 0 && (
          <CdiLockButton
            cdiBalance={saldo}
            freeCdiBalance={freeCdiBalance}
            cdiRate={cdiRate}
            titulos={titulos}
          />
        )}

        {/* KPIs — Saldo CDI com composição detalhada */}
        <section className="space-y-3">

          {/* Cartão principal — saldo total + composição visual */}
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Saldo CDI Total</p>
                <p className="text-[32px] font-bold text-emerald-400 tabular-nums leading-none">
                  R$ {formatBRL(saldo)}
                </p>
                <p className="text-[11px] text-slate-600 mt-1.5">
                  rendendo {cdiRate.toFixed(2)}%/mês · {cdiAnual.toFixed(2)}% a.a. · plano {plano}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Barra de composição visual */}
            {saldo > 0 && (() => {
              const pendingEarlyTotal = Array.from(pendingByLock.values()).reduce((s, v) => s + v.amount, 0)
              const bloqueadoSemPending = lockedTotal - pendingEarlyTotal
              const livreW   = (freeCdiBalance / saldo) * 100
              const bloqW    = (bloqueadoSemPending / saldo) * 100
              const earlyW   = (pendingEarlyTotal / saldo) * 100
              return (
                <div className="mb-4">
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
                    {freeCdiBalance > 0     && <div className="bg-emerald-500 rounded-full"   style={{ width: `${livreW}%` }} title={`Livre: R$ ${formatBRL(freeCdiBalance)}`} />}
                    {bloqueadoSemPending > 0 && <div className="bg-blue-500 rounded-full"     style={{ width: `${bloqW}%` }} title={`Bloqueado: R$ ${formatBRL(bloqueadoSemPending)}`} />}
                    {pendingEarlyTotal > 0  && <div className="bg-amber-500 rounded-full"     style={{ width: `${earlyW}%` }} title={`Em resgate: R$ ${formatBRL(pendingEarlyTotal)}`} />}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      Livre para resgate
                      <span className="font-bold text-emerald-400 tabular-nums">R$ {formatBRL(freeCdiBalance)}</span>
                    </span>
                    {bloqueadoSemPending > 0 && (
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        Bloqueado em títulos
                        <span className="font-bold text-blue-400 tabular-nums">R$ {formatBRL(bloqueadoSemPending)}</span>
                      </span>
                    )}
                    {pendingEarlyTotal > 0 && (
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        Em resgate antecipado
                        <span className="font-bold text-amber-400 tabular-nums">R$ {formatBRL(pendingEarlyTotal)}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Linha divisória */}
            <div className="border-t border-slate-800/60 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(() => {
                const pendingEarlyTotal = Array.from(pendingByLock.values()).reduce((s, v) => s + v.amount, 0)
                const bloqueadoSemPending = lockedTotal - pendingEarlyTotal
                return [
                  {
                    label: 'Livre para resgate',
                    value: `R$ ${formatBRL(freeCdiBalance)}`,
                    color: 'text-emerald-400',
                    dot: 'bg-emerald-500',
                    alert: false,
                  },
                  {
                    label: 'Bloqueado em títulos',
                    value: bloqueadoSemPending > 0 ? `R$ ${formatBRL(bloqueadoSemPending)}` : '—',
                    color: bloqueadoSemPending > 0 ? 'text-blue-400' : 'text-slate-600',
                    dot: 'bg-blue-500',
                    alert: false,
                  },
                  {
                    label: 'Em resgate antecipado',
                    value: pendingEarlyTotal > 0 ? `R$ ${formatBRL(pendingEarlyTotal)}` : '—',
                    color: pendingEarlyTotal > 0 ? 'text-amber-400' : 'text-slate-600',
                    dot: 'bg-amber-500',
                    alert: pendingEarlyTotal > 0,
                  },
                  {
                    label: 'Rendimento acumulado',
                    value: totalCdiEarned > 0 ? `R$ ${formatBRL(totalCdiEarned)}` : '—',
                    color: totalCdiEarned > 0 ? 'text-purple-400' : 'text-slate-600',
                    dot: 'bg-purple-500',
                    alert: false,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                      {item.alert && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                    </div>
                    <p className={`text-[15px] font-bold tabular-nums ${item.color}`}>{item.value}</p>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Linha de KPIs secundários */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Rendimento/Mês',
                value: saldo > 0 ? `R$ ${formatBRL(rendimentoMes)}` : '—',
                sub: 'projeção do mês atual',
                color: 'text-white',
                border: 'border-slate-800/70',
                iconBg: 'bg-purple-500/10 text-purple-400',
                icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
              },
              {
                label: 'Em 12 Meses',
                value: saldo > 0 ? `R$ ${formatBRL(rendimento12m)}` : '—',
                sub: `${cdiAnual.toFixed(2)}% a.a.`,
                color: 'text-purple-400',
                border: 'border-slate-800/70',
                iconBg: 'bg-slate-800/60 text-slate-400',
                icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
              },
              {
                label: 'Retorno Total',
                value: totalAportado > 0 ? `+${retornoTotal.toFixed(2)}%` : '—',
                sub: totalAportado > 0 ? `sobre R$ ${formatBRL(totalAportado)} aportados` : '—',
                color: retornoTotal > 0 ? 'text-emerald-300' : 'text-slate-500',
                border: 'border-slate-800/70',
                iconBg: 'bg-emerald-500/10 text-emerald-500',
                icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
              },
              {
                label: 'Taxa CDI',
                value: `${cdiRate.toFixed(2)}%/mês`,
                sub: `${cdiAnual.toFixed(2)}% a.a. · plano ${plano}`,
                color: 'text-amber-400',
                border: 'border-amber-500/15',
                iconBg: 'bg-amber-500/10 text-amber-400',
                icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
              },
            ].map((c) => (
              <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest leading-tight">{c.label}</p>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ml-1 ${c.iconBg}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                    </svg>
                  </div>
                </div>
                <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                <p className="text-[11px] text-slate-600 mt-1.5">{c.sub}</p>
              </div>
            ))}
          </div>

        </section>

        {/* Chart + Comparativo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Growth Chart */}
          {saldo > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white">Curva de Crescimento CDI</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">Projeção em 36 meses · juros compostos</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Em 36 meses</p>
                  <p className="text-[14px] font-bold text-emerald-400 tabular-nums">
                    R$ {formatBRL(saldo * Math.pow(1 + cdiRate / 100, 36))}
                  </p>
                </div>
              </div>
              <div className="px-4 pt-3 pb-0">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 130 }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cdiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75].map((f, i) => (
                    <line key={i} x1={PAD} y1={PAD + f * (H - PAD * 2)} x2={W - PAD} y2={PAD + f * (H - PAD * 2)} stroke="#1e293b" strokeWidth={1} />
                  ))}
                  <path d={areaPath} fill="url(#cdiAreaGrad)" />
                  <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinejoin="round" />
                  {milestones.map((m) => (
                    <circle key={m} cx={svgPts[m]?.x ?? 0} cy={svgPts[m]?.y ?? 0} r={m === 0 || m === 36 ? 4 : 3} fill="#10b981" stroke="#080c12" strokeWidth={1.5} />
                  ))}
                </svg>
              </div>
              <div className="px-5 pb-3 flex justify-between">
                {['Agora', '6m', '12m', '24m', '36m'].map((l) => (
                  <span key={l} className="text-[9.5px] text-slate-700 font-medium">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comparativo CDI vs Selic vs Poupança */}
          <div className={`bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden ${saldo === 0 ? 'lg:col-span-2' : ''}`}>
            <div className="px-5 py-4 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Comparativo de Rentabilidade</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Referências de mercado · valores ilustrativos
              </p>
            </div>
            <div className="p-4 space-y-3">
              {[
                {
                  label: `Master Pagamentos CDI`,
                  mensal: cdiRate,
                  anual: cdiAnual,
                  color: 'bg-emerald-500',
                  textColor: 'text-emerald-400',
                  badge: 'Seu rendimento',
                  badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  highlight: true,
                },
                {
                  label: 'Selic (CDI de mercado)',
                  mensal: SELIC_MENSAL,
                  anual: SELIC_ANUAL,
                  color: 'bg-blue-500',
                  textColor: 'text-blue-400',
                  badge: 'Referência',
                  badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  highlight: false,
                },
                {
                  label: 'Poupança',
                  mensal: POUP_MENSAL,
                  anual: (Math.pow(1 + POUP_MENSAL / 100, 12) - 1) * 100,
                  color: 'bg-slate-500',
                  textColor: 'text-slate-400',
                  badge: 'Referência',
                  badgeColor: 'bg-slate-700/60 text-slate-500 border-slate-600/40',
                  highlight: false,
                },
              ].map((item) => {
                const barPct = (item.anual / Math.max(cdiAnual, SELIC_ANUAL, 12)) * 100
                return (
                  <div key={item.label} className={`rounded-xl p-3.5 border ${item.highlight ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-slate-800/30 border-slate-700/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className={`text-[12.5px] font-semibold ${item.textColor}`}>{item.label}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${item.badgeColor}`}>{item.badge}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-[15px] font-bold tabular-nums ${item.textColor}`}>{item.anual.toFixed(2)}% a.a.</p>
                        <p className="text-[10px] text-slate-600">{item.mensal.toFixed(2)}%/mês</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.min(barPct, 100)}%` }} />
                    </div>
                    {item.highlight && saldo > 0 && (
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        Em 12 meses: <span className="text-emerald-400 font-semibold">R$ {formatBRL(saldo * (1 + item.anual / 100))}</span>
                      </p>
                    )}
                  </div>
                )
              })}
              <p className="text-[9.5px] text-slate-700 text-center pt-1">
                Valores de Selic e Poupança são ilustrativos — sujeitos a variação de mercado
              </p>
            </div>
          </div>
        </div>

        {/* Projeção + Simulador */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CdiSimulator cdiRate={cdiRate} initialBalance={saldo} />

          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Projeção de Rendimento</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {saldo > 0 ? `Juros compostos sobre R$ ${formatBRL(saldo)}` : 'Aporte para ver a projeção'}
              </p>
            </div>
            {saldo === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12.5px] font-medium">Sem saldo para projetar</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {meses.map(({ label, n }) => {
                  const rend  = saldo * (Math.pow(1 + cdiRate / 100, n) - 1)
                  const total = saldo + rend
                  const pct   = (rend / (maxRend || 1)) * 100
                  const rendPct = ((rend / saldo) * 100).toFixed(2)
                  return (
                    <div key={label} className="px-5 py-3 hover:bg-slate-800/25 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12.5px] font-semibold text-slate-300">{label}</span>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-white tabular-nums">R$ {formatBRL(total)}</p>
                          <p className="text-[10px] text-emerald-400 tabular-nums">+R$ {formatBRL(rend)} · +{rendPct}%</p>
                        </div>
                      </div>
                      <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Extrato CDI Unificado */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Extrato CDI</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Todas as movimentações da sua conta CDI
              </p>
            </div>
            {creditMonthEntries.length > 1 && (
              <div className="flex items-end gap-1.5 h-8 shrink-0">
                {creditMonthEntries.map(([month, val], i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: 18 }} title={`${month}: R$ ${formatBRL(val)}`}>
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-emerald-700/60 to-emerald-500/40"
                      style={{ height: `${Math.max((val / creditMax) * 100, 10)}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {allCdiLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-[12.5px] font-semibold text-slate-600">Nenhuma movimentação ainda</p>
              <p className="text-[11px] text-slate-700 mt-1 max-w-xs">
                Aporte saldo no CDI para começar. Todas as operações aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/30 max-h-[420px] overflow-y-auto">
              {allCdiLogs.map((log) => {
                const meta = extratoMeta[log.action]
                if (!meta) return null
                let amount = 0
                let extra = ''
                try {
                  const m = JSON.parse(log.metadata ?? '{}')
                  amount = parseFloat(m.amount || 0)
                  if (m.expiresAt) extra = `Vence em ${new Intl.DateTimeFormat('pt-BR').format(new Date(m.expiresAt + 'T12:00:00'))}`
                  if (m.rate && log.action === 'CDI_CREDIT') extra = `${parseFloat(m.rate).toFixed(2)}%/mês sobre R$ ${formatBRL(parseFloat(m.base || 0))}`
                } catch {}

                const isPendingRequest = log.action === 'CDI_EARLY_REQUEST' && !resolvedReqIds.has(log.id)
                const resolvedLog = log.action === 'CDI_EARLY_REQUEST'
                  ? earlyResolvedLogs.find((r) => {
                      try { return JSON.parse(r.metadata ?? '{}').requestLogId === log.id } catch { return false }
                    })
                  : undefined

                return (
                  <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      log.action === 'CDI_CREDIT'     ? 'bg-emerald-500/10' :
                      log.action === 'ADD_TO_CDI'     ? 'bg-emerald-500/10' :
                      log.action === 'CDI_WITHDRAW'   ? 'bg-orange-500/10' :
                      log.action === 'CDI_LOCK_SET'   ? 'bg-blue-500/10' :
                      log.action.includes('EARLY')    ? 'bg-amber-500/10' :
                      'bg-slate-800/60'
                    }`}>
                      <svg className={`w-4 h-4 ${meta.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12.5px] font-semibold text-slate-200">{meta.label}</p>
                        {isPendingRequest && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Aguardando</span>
                        )}
                        {resolvedLog && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            resolvedLog.action === 'CDI_EARLY_APPROVED'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-red-400 bg-red-500/10 border-red-500/20'
                          }`}>
                            {resolvedLog.action === 'CDI_EARLY_APPROVED' ? 'Aprovado' : 'Negado'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {formatDate(log.createdAt)}{extra ? ` · ${extra}` : ''}
                      </p>
                    </div>

                    {amount > 0 && (
                      <p className={`text-[13px] font-bold tabular-nums shrink-0 ${meta.color}`}>
                        {meta.sign}{meta.sign ? ' ' : ''}R$ {formatBRL(amount)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Info */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-emerald-400">Como funciona o CDI Master Pagamentos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seu saldo rende automaticamente à taxa de <strong className="text-slate-400">{cdiRate.toFixed(2)}% ao mês</strong> ({cdiAnual.toFixed(2)}% a.a.) em juros compostos. A taxa é definida pelo plano <strong className="text-slate-400">{plano}</strong>. O rendimento é creditado mensalmente — nenhuma ação necessária. Você pode criar títulos com prazo fixo para rendimentos diferenciados, ou resgatar a qualquer momento (saldo livre).
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
