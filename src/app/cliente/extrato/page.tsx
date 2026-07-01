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

function getAmount(metadata: string | null): number {
  try {
    const m = JSON.parse(metadata ?? '{}')
    return parseFloat(m.amount || m.value || 0)
  } catch { return 0 }
}

const SAQUE_ACTIONS = ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED', 'WITHDRAW_DENIED']
const CDI_ACTIONS   = ['ADD_TO_CDI', 'CDI_CREDIT', 'CDI_WITHDRAW', 'CDI_LOCK_SET', 'CDI_EARLY_REQUEST', 'CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED', 'ANTECIPACAO_REQUEST']

const metaSaque: Record<string, { label: string; color: string; bg: string; sign: string; status: string; statusColor: string }> = {
  WITHDRAW_REQUEST:  { label: 'Saque Solicitado', color: 'text-amber-400',   bg: 'bg-amber-500/10 text-amber-400',   sign: '-', status: 'Pendente',  statusColor: 'text-amber-400 bg-amber-500/10' },
  WITHDRAW_APPROVED: { label: 'Saque Aprovado',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '-', status: 'Aprovado',  statusColor: 'text-emerald-400 bg-emerald-500/10' },
  WITHDRAW_DENIED:   { label: 'Saque Negado',     color: 'text-red-400',     bg: 'bg-red-500/10 text-red-400',       sign: '+', status: 'Negado',    statusColor: 'text-red-400 bg-red-500/10' },
}

const metaCdi: Record<string, { label: string; color: string; bg: string; sign: string }> = {
  ADD_TO_CDI:         { label: 'Aporte CDI',             color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '-' },
  CDI_CREDIT:         { label: 'Rendimento CDI',          color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '+' },
  CDI_WITHDRAW:       { label: 'Resgate CDI',             color: 'text-amber-400',   bg: 'bg-amber-500/10 text-amber-400',   sign: '+' },
  CDI_LOCK_SET:       { label: 'Título CDI Criado',       color: 'text-purple-400',  bg: 'bg-purple-500/10 text-purple-400', sign: '' },
  CDI_EARLY_REQUEST:  { label: 'Resgate Ant. Solicitado', color: 'text-amber-400',   bg: 'bg-amber-500/10 text-amber-400',   sign: '' },
  CDI_EARLY_APPROVED: { label: 'Resgate Ant. Aprovado',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-400', sign: '+' },
  CDI_EARLY_DENIED:   { label: 'Resgate Ant. Negado',     color: 'text-red-400',     bg: 'bg-red-500/10 text-red-400',       sign: '' },
  ANTECIPACAO_REQUEST:{ label: 'Antecipação',             color: 'text-blue-400',    bg: 'bg-blue-500/10 text-blue-400',     sign: '+' },
}

export default async function ExtratoPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const pendente  = merchant?.pendingBalance ?? 0
  const cdiSaldo  = merchant?.balance        ?? 0

  const allLogs = merchant
    ? await prisma.auditLog.findMany({
        where: {
          entityId: merchant.id,
          entity:   'Merchant',
          action:   { in: [...SAQUE_ACTIONS, ...CDI_ACTIONS] },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    : []

  const saqueLogs = allLogs.filter((l) => SAQUE_ACTIONS.includes(l.action))
  const cdiLogs   = allLogs.filter((l) => CDI_ACTIONS.includes(l.action))

  const totalSacado    = saqueLogs
    .filter((l) => l.action === 'WITHDRAW_APPROVED')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const totalAportadoCdi = cdiLogs
    .filter((l) => l.action === 'ADD_TO_CDI')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const totalAntecipado = cdiLogs
    .filter((l) => l.action === 'ANTECIPACAO_REQUEST')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  const totalCdiRendido = cdiLogs
    .filter((l) => l.action === 'CDI_CREDIT')
    .reduce((s, l) => s + getAmount(l.metadata), 0)

  return (
    <div>
      <Topbar
        title="Extrato"
        breadcrumb="Financeiro"
        subtitle="Saques, CDI e antecipações da sua conta"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Saldo Disponível',  value: `R$ ${formatBRL(pendente)}`,          color: 'text-emerald-400', border: 'border-emerald-500/20', sub: 'livre para saque' },
            { label: 'Saldo em CDI',      value: `R$ ${formatBRL(cdiSaldo)}`,          color: 'text-amber-400',   border: 'border-amber-500/20',   sub: 'rendendo agora' },
            { label: 'Rendimento CDI',    value: `R$ ${formatBRL(totalCdiRendido)}`,   color: 'text-blue-400',    border: 'border-blue-500/15',    sub: 'total acumulado' },
            { label: 'Total Sacado',      value: `R$ ${formatBRL(totalSacado)}`,       color: 'text-slate-300',   border: 'border-slate-800/70',   sub: 'saques aprovados' },
            { label: 'Total Antecipado',  value: `R$ ${formatBRL(totalAntecipado)}`,   color: 'text-purple-400',  border: 'border-slate-800/70',   sub: 'antecipações cartão' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[17px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
              <p className="text-[9.5px] text-slate-700 mt-1">{c.sub}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Saques */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Saques</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{saqueLogs.length} movimentaçõe{saqueLogs.length !== 1 ? 's' : ''}</p>
            </div>
            {saqueLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhum saque ainda</p>
                <p className="text-[11px] text-slate-800 mt-1">Seus saques aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[420px] overflow-y-auto">
                {saqueLogs.map((log) => {
                  const meta   = metaSaque[log.action]!
                  const amount = getAmount(log.metadata)
                  let pixKey = '', pixType = '', bankName = ''
                  try {
                    const m = JSON.parse(log.metadata ?? '{}')
                    pixKey  = m.pixKey  ?? ''
                    pixType = m.pixType ?? ''
                    bankName = m.bankName ?? ''
                  } catch {}
                  return (
                    <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${meta.bg}`}>
                        {meta.sign || '•'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-slate-200">{meta.label}</p>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${meta.statusColor}`}>
                            {meta.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-600 mt-0.5">{formatDate(log.createdAt)}</p>
                        {pixKey && (
                          <p className="text-[11px] text-slate-700 mt-0.5 truncate">
                            Pix {pixType} · {pixKey}{bankName ? ` · ${bankName}` : ''}
                          </p>
                        )}
                      </div>
                      {amount > 0 && (
                        <p className={`text-[13px] font-bold tabular-nums shrink-0 ${meta.color}`}>
                          {meta.sign === '-' ? '−' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* CDI */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-white">CDI & Antecipações</p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5">{cdiLogs.length} movimentaçõe{cdiLogs.length !== 1 ? 's' : ''}</p>
                </div>
                {totalAportadoCdi > 0 && (
                  <p className="text-[10px] text-slate-600 tabular-nums">
                    Aportado: <span className="text-emerald-400 font-semibold">R$ {formatBRL(totalAportadoCdi)}</span>
                  </p>
                )}
              </div>
            </div>
            {cdiLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhuma operação CDI ainda</p>
                <p className="text-[11px] text-slate-800 mt-1">Aportes e rendimentos aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[420px] overflow-y-auto">
                {cdiLogs.map((log) => {
                  const meta   = metaCdi[log.action] ?? { label: log.action, color: 'text-slate-400', bg: 'bg-slate-700/40 text-slate-400', sign: '' }
                  const amount = getAmount(log.metadata)
                  return (
                    <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${meta.bg}`}>
                        {meta.sign || '•'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-200">{meta.label}</p>
                        <p className="text-[12px] text-slate-600 mt-0.5">{formatDate(log.createdAt)}</p>
                      </div>
                      {amount > 0 && (
                        <p className={`text-[13px] font-bold tabular-nums shrink-0 ${meta.color}`}>
                          {meta.sign === '-' ? '−' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
