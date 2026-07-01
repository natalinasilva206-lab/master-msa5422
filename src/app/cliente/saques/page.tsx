export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { WithdrawForm } from './WithdrawForm'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const prazoFallback: Record<string, string> = {
  Start:  '1 dia útil',
  Growth: '1 dia útil',
  Prime:  'Mesmo dia',
  Black:  'Instantâneo',
}

export default async function ClienteSaquesPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const saldo    = merchant?.balance       ?? 0
  const pendente = merchant?.pendingBalance ?? 0
  const plano    = merchant?.plan          ?? 'Start'

  const feePlan = plano
    ? await prisma.feePlan.findFirst({ where: { name: plano }, select: { withdrawalDeadline: true } }).catch(() => null)
    : null
  const prazo = (feePlan as any)?.withdrawalDeadline ?? prazoFallback[plano] ?? '1 dia útil'

  const withdrawLogs = merchant
    ? await prisma.auditLog.findMany({
        where: { entityId: merchant.id, action: { in: ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED', 'WITHDRAW_DENIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    : []

  const totalSacado = withdrawLogs
    .filter((l) => l.action === 'WITHDRAW_APPROVED')
    .reduce((s, l) => {
      try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
    }, 0)

  return (
    <div>
      <Topbar
        title="Saques"
        breadcrumb="Financeiro"
        subtitle="Solicite a transferência do seu saldo disponível."
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Disponível para Saque', value: `R$ ${formatBRL(pendente)}`, color: 'text-emerald-400', border: 'border-emerald-500/20', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'Saldo em CDI',          value: `R$ ${formatBRL(saldo)}`,   color: 'text-amber-400',   border: 'border-amber-500/20',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Total Sacado',          value: `R$ ${formatBRL(totalSacado)}`, color: 'text-slate-200', border: 'border-slate-800/70', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
            { label: 'Prazo de Liquidação',   value: prazo,                       color: 'text-blue-400',    border: 'border-slate-800/70',   icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0 ml-2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Formulário */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Nova Solicitação de Saque</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Prazo de liquidação: <strong className="text-slate-400">{prazo}</strong> · Sem taxa</p>
            </div>
            <WithdrawForm saldo={pendente} cdiBalance={saldo} plano={plano} />
          </div>

          {/* Histórico */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Saques</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{withdrawLogs.length} solicitaçõe{withdrawLogs.length !== 1 ? 's' : ''}</p>
            </div>
            {withdrawLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhum saque ainda</p>
                <p className="text-[11px] text-slate-800 mt-1">Seu histórico aparecerá aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[360px] overflow-y-auto">
                {withdrawLogs.map((log) => {
                  const isApproved = log.action === 'WITHDRAW_APPROVED'
                  const isDenied   = log.action === 'WITHDRAW_DENIED'
                  let amount = 0
                  let isResolved = false
                  try {
                    const m = JSON.parse(log.metadata ?? '{}')
                    amount = parseFloat(m.amount || 0)
                    isResolved = !!m.resolved
                  } catch {}
                  const label   = isApproved ? 'Saque aprovado' : isDenied ? 'Saque negado' : isResolved ? 'Saque negado' : 'Aguardando aprovação'
                  const status  = isApproved ? 'Aprovado' : isDenied ? 'Negado — saldo devolvido' : isResolved ? 'Negado' : 'Pendente'
                  const iconD   = isApproved ? 'M5 13l4 4L19 7' : isDenied ? 'M6 18L18 6M6 6l12 12' : 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                  const iconBg  = isApproved ? 'bg-emerald-500/10 text-emerald-400' : isDenied ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                  const stColor = isApproved ? 'text-emerald-400' : isDenied ? 'text-red-400' : 'text-amber-400'
                  return (
                    <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={iconD} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-200">{label}</p>
                        <p className="text-[12px] text-slate-600">{formatDate(log.createdAt)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-white tabular-nums">R$ {formatBRL(amount)}</p>
                        <p className={`text-[12px] font-semibold ${stColor}`}>{status}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </section>

        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Política de saques</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Saques são processados em <strong className="text-slate-400">{prazo}</strong> após a solicitação. Sem taxa de transferência para o plano <strong className="text-slate-400">{plano}</strong>. O valor é debitado do saldo imediatamente e liquidado na conta bancária cadastrada.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
