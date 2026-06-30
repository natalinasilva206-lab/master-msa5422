export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const actionMeta: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  ADD_TO_CDI:        { label: 'Aporte CDI',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '+' },
  WITHDRAW_REQUEST:  { label: 'Saque Solicitado',  color: 'text-amber-400',   bg: 'bg-amber-500/10 text-amber-400',   sign: '-' },
  WITHDRAW_APPROVED: { label: 'Saque Aprovado',    color: 'text-blue-400',    bg: 'bg-blue-500/10 text-blue-400',     sign: '-' },
  CDI_CREDIT:        { label: 'Rendimento CDI',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '+' },
  BALANCE_ADJUST:    { label: 'Ajuste de Saldo',   color: 'text-slate-300',   bg: 'bg-slate-700/40 text-slate-400',   sign: '±' },
  KYC_APPROVED:      { label: 'KYC Aprovado',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '' },
  KYC_BLOCKED:       { label: 'KYC Bloqueado',     color: 'text-red-400',     bg: 'bg-red-500/10 text-red-400',       sign: '' },
}

function getAmount(action: string, metadata: string | null): number | null {
  try {
    const m = JSON.parse(metadata ?? '{}')
    if (m.amount) return parseFloat(m.amount)
    if (m.value)  return parseFloat(m.value)
  } catch {}
  return null
}

export default async function ExtratoPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const saldo    = merchant?.balance        ?? 0
  const pendente = merchant?.pendingBalance ?? 0

  const logs = merchant
    ? await prisma.auditLog.findMany({
        where: { entityId: merchant.id, entity: 'Merchant' },
        orderBy: { createdAt: 'desc' },
        take: 60,
      })
    : []

  return (
    <div>
      <Topbar
        title="Extrato"
        breadcrumb="Financeiro"
        subtitle="Histórico de movimentações da sua conta"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Saldo Disponível',  value: `R$ ${formatBRL(pendente)}`, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10 text-emerald-500' },
            { label: 'Saldo em CDI',      value: `R$ ${formatBRL(saldo)}`,   color: 'text-amber-400',   border: 'border-amber-500/20',   bg: 'bg-amber-500/10 text-amber-500' },
            { label: 'Total de eventos',  value: `${logs.length}`,            color: 'text-slate-200',   border: 'border-slate-800/70',   bg: 'bg-slate-700/30 text-slate-400' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Log */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Movimentações</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Últimas {logs.length} entradas</p>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma movimentação</p>
              <p className="text-[11px] text-slate-800 mt-1">As movimentações aparecerão aqui conforme você usar a plataforma.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {logs.map((log) => {
                const meta  = actionMeta[log.action] ?? { label: log.action, color: 'text-slate-400', bg: 'bg-slate-700/40 text-slate-400', sign: '' }
                const amount = getAmount(log.action, log.metadata)
                return (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${meta.bg}`}>
                      {meta.sign || '•'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-slate-200 truncate">{meta.label}</p>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">{formatDate(log.createdAt)}</p>
                    </div>
                    {amount !== null && (
                      <p className={`text-[13px] font-bold tabular-nums shrink-0 ${meta.color}`}>
                        {meta.sign === '-' ? '-' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <p className="text-center text-[10.5px] text-slate-700">
          Exibindo os últimos 60 registros · Atualizações em tempo real ao operar na plataforma
        </p>
      </div>
    </div>
  )
}
