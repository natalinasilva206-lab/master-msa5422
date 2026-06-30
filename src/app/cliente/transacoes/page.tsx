export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(d))
}

const actionMeta: Record<string, { label: string; sign: string; color: string; badge: string; method: string }> = {
  ADD_TO_CDI:        { label: 'Aporte CDI',         sign: '+', color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400', method: 'CDI' },
  WITHDRAW_REQUEST:  { label: 'Saque Solicitado',    sign: '-', color: 'text-amber-400',   badge: 'bg-amber-500/10 text-amber-400',    method: 'Saque' },
  WITHDRAW_APPROVED: { label: 'Saque Aprovado',      sign: '-', color: 'text-blue-400',    badge: 'bg-blue-500/10 text-blue-400',     method: 'Saque' },
  CDI_CREDIT:        { label: 'Rendimento CDI',      sign: '+', color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400', method: 'CDI' },
  BALANCE_ADJUST:    { label: 'Ajuste de Saldo',     sign: '±', color: 'text-slate-300',   badge: 'bg-slate-700/40 text-slate-400',    method: 'Admin' },
  KYC_APPROVED:      { label: 'KYC Aprovado',        sign: '',  color: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400', method: 'Sistema' },
  KYC_BLOCKED:       { label: 'KYC Bloqueado',       sign: '',  color: 'text-red-400',     badge: 'bg-red-500/10 text-red-400',       method: 'Sistema' },
  MERCHANT_CREATED:  { label: 'Conta Criada',        sign: '',  color: 'text-blue-400',    badge: 'bg-blue-500/10 text-blue-400',     method: 'Sistema' },
  CDI_RATE_UPDATED:  { label: 'Taxa CDI Atualizada', sign: '',  color: 'text-purple-400',  badge: 'bg-purple-500/10 text-purple-400', method: 'Admin' },
}

function getAmount(action: string, metadata: string | null): number | null {
  try {
    const m = JSON.parse(metadata ?? '{}')
    if (m.amount) return parseFloat(m.amount)
    if (m.value)  return parseFloat(m.value)
  } catch {}
  return null
}

export default async function ClienteTransacoesPage() {
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
        take: 50,
      })
    : []

  const creditLogs = logs.filter((l) => ['ADD_TO_CDI', 'CDI_CREDIT'].includes(l.action))
  const debitLogs  = logs.filter((l) => ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED'].includes(l.action))

  const totalCredito = creditLogs.reduce((s, l) => s + (getAmount(l.action, l.metadata) ?? 0), 0)
  const totalDebito  = debitLogs.reduce((s, l) => s + (getAmount(l.action, l.metadata) ?? 0), 0)

  return (
    <div>
      <Topbar
        title="Transações"
        breadcrumb="Financeiro"
        subtitle="Histórico de movimentações da sua conta"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Saldo Disponível',  value: `R$ ${formatBRL(pendente)}`,     color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Saldo em CDI',      value: `R$ ${formatBRL(saldo)}`,       color: 'text-amber-400',   border: 'border-amber-500/20' },
            { label: 'Total Aportes CDI', value: `R$ ${formatBRL(totalCredito)}`, color: 'text-blue-400',    border: 'border-slate-800/70' },
            { label: 'Total Saques',      value: `R$ ${formatBRL(totalDebito)}`,  color: 'text-slate-200',   border: 'border-slate-800/70' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Tabela */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Histórico Completo</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{logs.length} registros encontrados</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma movimentação ainda</p>
              <p className="text-[11px] text-slate-800 mt-1">
                Use a plataforma para ver suas transações aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Operação</th>
                    <th className="text-left px-4 py-2.5 text-[9.5px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                    <th className="text-right px-4 py-2.5 text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                    <th className="text-right px-5 py-2.5 text-[9.5px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.map((log) => {
                    const meta   = actionMeta[log.action] ?? { label: log.action, sign: '', color: 'text-slate-400', badge: 'bg-slate-800/60 text-slate-500', method: '—' }
                    const amount = getAmount(log.action, log.metadata)
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${meta.badge}`}>
                              {meta.sign || '•'}
                            </div>
                            <span className="text-[12.5px] text-slate-200 font-medium">{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${meta.badge}`}>
                            {meta.method}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {amount !== null ? (
                            <span className={`text-[13px] font-bold tabular-nums ${meta.color}`}>
                              {meta.sign === '-' ? '−' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-700">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <span className="text-[11px] text-slate-600">{formatDate(log.createdAt)}</span>
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
