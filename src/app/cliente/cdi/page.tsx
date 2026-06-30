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

function formatDate(d: Date) {
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

const meses = [
  { label: '1 mês',    n: 1  },
  { label: '3 meses',  n: 3  },
  { label: '6 meses',  n: 6  },
  { label: '12 meses', n: 12 },
  { label: '24 meses', n: 24 },
  { label: '36 meses', n: 36 },
]

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

  const [lockLogs, earlyRequestLogs, earlyResolvedLogs, cdiCreditLogs] = merchant
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
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: 'CDI_CREDIT' },
          orderBy: { createdAt: 'desc' },
          take: 24,
        }),
      ])
    : [[], [], [], []]

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
      const exp = m.expiresAt as string
      if (new Date(exp + 'T23:59:59') <= new Date()) continue
      const pending = pendingByLock.get(log.id)
      titulos.push({
        id: log.id,
        amount: parseFloat(m.amount),
        expiresAt: exp,
        rate: parseFloat(m.rate ?? cdiRate),
        createdAt: log.createdAt.toISOString(),
        pendingRequestId: pending?.id,
        pendingAmount: pending?.amount,
      })
      lockedTotal += parseFloat(m.amount)
    } catch {}
  }

  const freeCdiBalance = Math.max(0, saldo - lockedTotal)

  // Rendimento acumulado real (soma dos CDI_CREDIT)
  const totalCdiEarned = cdiCreditLogs.reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

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
    const val = saldo > 0 ? saldo * Math.pow(1 + cdiRate / 100, n) : n * 10
    return val
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

        {/* Aporte — always visible */}
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
                  : 'Aportar saldo pendente no CDI'}
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
                  {lockedTotal > 0
                    ? `R$ ${formatBRL(lockedTotal)} bloqueados em títulos`
                    : 'O valor resgatado vai para seu saldo disponível'}
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

        {/* KPIs — 5 cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: 'Saldo em CDI',
              value: `R$ ${formatBRL(saldo)}`,
              sub: 'rendendo agora',
              color: 'text-emerald-400',
              border: 'border-emerald-500/20',
              iconBg: 'bg-emerald-500/10 text-emerald-400',
              icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
            },
            {
              label: 'Rendimento Acumulado',
              value: `R$ ${formatBRL(totalCdiEarned)}`,
              sub: `${cdiCreditLogs.length} crédito${cdiCreditLogs.length !== 1 ? 's' : ''} recebido${cdiCreditLogs.length !== 1 ? 's' : ''}`,
              color: 'text-blue-400',
              border: 'border-blue-500/15',
              iconBg: 'bg-blue-500/10 text-blue-400',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              label: 'Taxa Mensal',
              value: `${cdiRate.toFixed(2)}%`,
              sub: `plano ${plano} · ${cdiAnual.toFixed(2)}% a.a.`,
              color: 'text-amber-400',
              border: 'border-amber-500/20',
              iconBg: 'bg-amber-500/10 text-amber-400',
              icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
            },
            {
              label: 'Rendimento/Mês',
              value: saldo > 0 ? `R$ ${formatBRL(rendimentoMes)}` : '—',
              sub: 'projeção do mês atual',
              color: 'text-white',
              border: 'border-slate-800/70',
              iconBg: 'bg-purple-500/10 text-purple-400',
              icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            },
            {
              label: 'Em 12 Meses',
              value: saldo > 0 ? `R$ ${formatBRL(rendimento12m)}` : '—',
              sub: 'rendimento projetado',
              color: 'text-purple-400',
              border: 'border-slate-800/70',
              iconBg: 'bg-slate-800/60 text-slate-400',
              icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest leading-tight">{c.label}</p>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ml-1 ${c.iconBg}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
              </div>
              <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Chart + Histórico de rendimentos lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Growth Chart */}
          {saldo > 0 && (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white">Curva de Crescimento CDI</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    Projeção em 36 meses · {cdiRate.toFixed(2)}%/mês juros compostos
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Em 36 meses</p>
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
                    <circle key={m} cx={svgPts[m]?.x ?? 0} cy={svgPts[m]?.y ?? 0}
                      r={m === 0 || m === 36 ? 4 : 3} fill="#10b981" stroke="#080c12" strokeWidth={1.5} />
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

          {/* Histórico de Rendimentos CDI */}
          <div className={`bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden ${saldo === 0 ? 'lg:col-span-2' : ''}`}>
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Histórico de Rendimentos</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  {cdiCreditLogs.length > 0
                    ? `${cdiCreditLogs.length} crédito${cdiCreditLogs.length !== 1 ? 's' : ''} · Total: R$ ${formatBRL(totalCdiEarned)}`
                    : 'Créditos mensais de CDI aparecerão aqui'}
                </p>
              </div>
              {totalCdiEarned > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  +R$ {formatBRL(totalCdiEarned)}
                </span>
              )}
            </div>

            {cdiCreditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <p className="text-[12.5px] font-semibold text-slate-600">Nenhum rendimento ainda</p>
                <p className="text-[11px] text-slate-700 mt-1 max-w-xs">
                  {saldo > 0
                    ? 'Seu primeiro crédito CDI será creditado no próximo ciclo mensal.'
                    : 'Aporte saldo no CDI para começar a receber rendimentos mensalmente.'}
                </p>
              </div>
            ) : (
              <>
                {/* Mini bar chart by month */}
                {creditMonthEntries.length > 1 && (
                  <div className="px-5 pt-3.5 pb-2">
                    <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mb-2">Rendimentos por mês</p>
                    <div className="flex items-end gap-1.5 h-10">
                      {creditMonthEntries.map(([month, val], i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${month}: R$ ${formatBRL(val)}`}>
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-emerald-700/60 to-emerald-500/40"
                            style={{ height: `${Math.max((val / creditMax) * 100, 8)}%` }}
                          />
                          <span className="text-[7.5px] text-slate-700 truncate w-full text-center">{month.slice(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="divide-y divide-slate-800/30 max-h-[280px] overflow-y-auto">
                  {cdiCreditLogs.map((log) => {
                    let amount = 0
                    try { amount = parseFloat(JSON.parse(log.metadata ?? '{}').amount || 0) } catch {}
                    return (
                      <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-slate-200">Crédito CDI</p>
                          <p className="text-[10px] text-slate-600">{formatDate(new Date(log.createdAt))}</p>
                        </div>
                        <p className="text-[12.5px] font-bold text-emerald-400 tabular-nums shrink-0">
                          +R$ {formatBRL(amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Simulator + Projection */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CdiSimulator cdiRate={cdiRate} initialBalance={saldo} />

          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Projeção de Rendimento</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {saldo > 0 ? `Juros compostos sobre R$ ${formatBRL(saldo)}` : 'Aporte para ver a projeção'}
              </p>
            </div>
            {saldo === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12.5px] font-medium">Sem saldo para projetar</p>
                <p className="text-[11px] text-slate-800 mt-1">Quando aportado, a projeção aparece aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {meses.map(({ label, n }) => {
                  const rend  = saldo * (Math.pow(1 + cdiRate / 100, n) - 1)
                  const total = saldo + rend
                  const pct   = ((rend / (maxRend || 1)) * 100)
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
                        <div
                          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Histórico de solicitações de resgate antecipado */}
        {earlyRequestLogs.length > 0 && (
          <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Solicitações de Resgate Antecipado</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Histórico das suas solicitações de títulos bloqueados</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {earlyRequestLogs.map((req) => {
                const isPending = !resolvedReqIds.has(req.id)
                let amount = 0
                try { amount = parseFloat(JSON.parse(req.metadata ?? '{}').amount || 0) } catch {}
                const resolved = earlyResolvedLogs.find((r) => {
                  try { return JSON.parse(r.metadata ?? '{}').requestLogId === req.id } catch { return false }
                })
                const approved = resolved?.action === 'CDI_EARLY_APPROVED'
                return (
                  <div key={req.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isPending ? 'bg-amber-500/10' : approved ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {isPending ? (
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : approved ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200">
                        Resgate antecipado · R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10.5px] text-slate-600">{formatDate(new Date(req.createdAt))}</p>
                    </div>
                    <span className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border ${
                      isPending ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        : approved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-red-400 bg-red-500/10 border-red-500/20'
                    }`}>
                      {isPending ? 'Aguardando' : approved ? 'Aprovado' : 'Negado'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Info */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-emerald-400">Como funciona o CDI Master Pagamentos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seu saldo rende automaticamente à taxa de <strong className="text-slate-400">{cdiRate.toFixed(2)}% ao mês</strong> ({cdiAnual.toFixed(2)}% a.a.) em juros compostos. A taxa é definida pelo plano <strong className="text-slate-400">{plano}</strong>. O rendimento é creditado mensalmente — nenhuma ação necessária.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
