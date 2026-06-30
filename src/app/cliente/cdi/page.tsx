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

/* SVG bezier curve for the growth chart */
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

  // Busca lock ativo e solicitação pendente
  const [lockLogs, earlyRequestLogs, earlyResolvedLogs] = merchant
    ? await Promise.all([
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: { in: ['CDI_LOCK_SET', 'CDI_LIMIT_SET'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }),
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: 'CDI_EARLY_REQUEST' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: { in: ['CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ])
    : [[], [], []]

  const resolvedReqIds = new Set<string>()
  for (const log of earlyResolvedLogs) {
    try { const m = JSON.parse(log.metadata ?? '{}'); if (m.requestLogId) resolvedReqIds.add(m.requestLogId) } catch {}
  }

  let lockExpiresAt: string | null = null
  if (lockLogs[0]) {
    try {
      const m = JSON.parse(lockLogs[0].metadata ?? '{}')
      const exp = m.expiresAt as string | null
      if (exp && new Date(exp + 'T23:59:59') > new Date()) lockExpiresAt = exp
    } catch {}
  }

  const pendingEarlyReq = earlyRequestLogs.find((r) => !resolvedReqIds.has(r.id))
  let pendingRequest: { id: string; amount: number } | null = null
  if (pendingEarlyReq) {
    try { const m = JSON.parse(pendingEarlyReq.metadata ?? '{}'); pendingRequest = { id: pendingEarlyReq.id, amount: parseFloat(m.amount || 0) } } catch {}
  }

  const isLocked = lockExpiresAt !== null

  const rendimentoMes = saldo * (cdiRate / 100)
  const rendimento12m = saldo * (Math.pow(1 + cdiRate / 100, 12) - 1)
  const maxRend = rendimento12m // largest period for bar scaling

  // Build SVG chart points (36 months)
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
        subtitle={`Taxa atual: ${cdiRate.toFixed(2)}%/mês · ${cdiAnual.toFixed(2)}% a.a.`}
        actions={
          <div className="flex items-center gap-2">
            {!isLocked && <WithdrawFromCdiButton cdiBalance={saldo} cdiRate={cdiRate} />}
            <AddToCdiButton
              pendingBalance={pendente}
              currentBalance={saldo}
              cdiRate={cdiRate}
            />
          </div>
        }
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Aporte CDI — always visible */}
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
          <AddToCdiButton
            pendingBalance={pendente}
            currentBalance={saldo}
            cdiRate={cdiRate}
          />
        </div>

        {/* Lock / Resgate CDI */}
        {saldo > 0 && (
          <CdiLockButton
            cdiBalance={saldo}
            cdiRate={cdiRate}
            lockExpiresAt={lockExpiresAt}
            pendingRequest={pendingRequest}
          />
        )}

        {/* Resgatar CDI — só aparece quando NÃO bloqueado */}
        {saldo > 0 && !isLocked && !pendingRequest && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-800/60 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-slate-300">
                  R$ {formatBRL(saldo)} em CDI — resgatar para disponível
                </p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  O valor resgatado vai para seu saldo disponível e pode ser sacado
                </p>
              </div>
            </div>
            <WithdrawFromCdiButton cdiBalance={saldo} cdiRate={cdiRate} />
          </div>
        )}

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Saldo em CDI', value: `R$ ${formatBRL(saldo)}`, sub: 'rendendo agora', color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Taxa Mensal', value: `${cdiRate.toFixed(2)}%`, sub: `plano ${plano}`, color: 'text-amber-400', bg: 'bg-amber-500/10 text-amber-500', border: 'border-amber-500/20', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
            { label: 'Rendimento/Mês', value: `R$ ${formatBRL(rendimentoMes)}`, sub: 'projeção mensal', color: 'text-white', bg: 'bg-purple-500/10 text-purple-500', border: 'border-slate-800/70', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
            { label: 'Rendimento/Ano', value: `R$ ${formatBRL(rendimento12m)}`, sub: 'em 12 meses compostos', color: 'text-blue-400', bg: 'bg-blue-500/10 text-blue-500', border: 'border-slate-800/70', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[19px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
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

        {/* Growth Chart */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Curva de Crescimento CDI</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Projeção em 36 meses · juros compostos a {cdiRate.toFixed(2)}%/mês
              </p>
            </div>
            {saldo > 0 && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Em 36 meses</p>
                <p className="text-[14px] font-bold text-emerald-400 tabular-nums">
                  R$ {formatBRL(saldo * Math.pow(1 + cdiRate / 100, 36))}
                </p>
              </div>
            )}
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
                <circle
                  key={m}
                  cx={svgPts[m]?.x ?? 0}
                  cy={svgPts[m]?.y ?? 0}
                  r={m === 0 || m === 36 ? 4 : 3}
                  fill="#10b981"
                  stroke="#080c12"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
          </div>
          <div className="px-5 pb-3 flex justify-between">
            {['Agora', '6m', '12m', '24m', '36m'].map((l) => (
              <span key={l} className="text-[9.5px] text-slate-700 font-medium">{l}</span>
            ))}
          </div>
        </section>

        {/* Simulator + Projection side by side */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Interactive Simulator */}
          <CdiSimulator cdiRate={cdiRate} initialBalance={saldo} />

          {/* Projection Table */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Projeção de Rendimento</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Juros compostos sobre R$ {formatBRL(saldo)}</p>
            </div>
            {saldo === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-700">
                <p className="text-[12.5px] font-medium">Sem saldo para projetar</p>
                <p className="text-[11px] text-slate-800 mt-1">Quando seu saldo for liberado, a projeção aparecerá aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {meses.map(({ label, n }) => {
                  const rend = saldo * (Math.pow(1 + cdiRate / 100, n) - 1)
                  const total = saldo + rend
                  const pct = ((rend / (maxRend || 1)) * 100)
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
                      {/* Progress bar */}
                      <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all"
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

        {/* Info */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-emerald-400">Como funciona o CDI Master Pagamentos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Seu saldo disponível rende automaticamente à taxa de <strong className="text-slate-400">{cdiRate.toFixed(2)}% ao mês</strong> ({cdiAnual.toFixed(2)}% a.a.) pelo modelo de juros compostos. A taxa é definida de acordo com seu plano <strong className="text-slate-400">{plano}</strong> e pode ser ajustada pela administração. Nenhuma ação é necessária da sua parte — o rendimento é creditado mensalmente.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
