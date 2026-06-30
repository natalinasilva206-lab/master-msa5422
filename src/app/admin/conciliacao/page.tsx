export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export default async function ConciliacaoPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const logs = await prisma.auditLog.findMany({
    where: { entity: 'Merchant' },
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: { user: { select: { name: true, email: true, merchant: { select: { name: true } } } } },
  })

  const totalActions     = logs.length
  const addToCdiLogs     = logs.filter((l) => l.action === 'ADD_TO_CDI')
  const antecipacaoLogs  = logs.filter((l) => l.action === 'ANTECIPACAO_REQUEST')
  const withdrawLogs     = logs.filter((l) => l.action === 'WITHDRAW_REQUEST')
  const totalAportado    = addToCdiLogs.reduce((s, l) => {
    try { const m = JSON.parse(l.metadata ?? '{}'); return s + (parseFloat(m.amount) || 0) } catch { return s }
  }, 0)
  const totalAntecipado  = antecipacaoLogs.reduce((s, l) => {
    try { const m = JSON.parse(l.metadata ?? '{}'); return s + (parseFloat(m.amount) || 0) } catch { return s }
  }, 0)

  const actionMeta: Record<string, { label: string; dot: string }> = {
    ADD_TO_CDI:           { label: 'Aporte CDI',          dot: 'bg-emerald-500' },
    ANTECIPACAO_REQUEST:  { label: 'Antecipação',          dot: 'bg-blue-500' },
    WITHDRAW_REQUEST:     { label: 'Saque Solicitado',     dot: 'bg-amber-500' },
    WITHDRAW_APPROVED:    { label: 'Saque Aprovado',       dot: 'bg-blue-500' },
    KYC_APPROVED:         { label: 'KYC Aprovado',         dot: 'bg-emerald-500' },
    KYC_BLOCKED:          { label: 'KYC Bloqueado',        dot: 'bg-red-500' },
    MERCHANT_CREATED:     { label: 'Empresa Criada',       dot: 'bg-slate-400' },
    CDI_RATE_UPDATED:     { label: 'Taxa CDI Atualizada',  dot: 'bg-purple-500' },
    BALANCE_ADJUST:       { label: 'Ajuste de Saldo',      dot: 'bg-slate-500' },
    CDI_WITHDRAW:         { label: 'Resgate CDI',          dot: 'bg-orange-500' },
  }

  return (
    <div>
      <Topbar
        title="Conciliação"
        breadcrumb="Casa › Relatórios"
        subtitle="Registro auditável de todas as operações financeiras"
      />

      <div className="p-4 xl:p-6 space-y-4">

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total de Registros', value: `${totalActions}`,                    color: 'text-white',        border: 'border-slate-800/70' },
            { label: 'Aportes CDI',        value: `R$ ${formatBRL(totalAportado)}`,     color: 'text-emerald-400',  border: 'border-emerald-500/20' },
            { label: 'Antecipações',       value: `R$ ${formatBRL(totalAntecipado)}`,   color: 'text-blue-400',     border: 'border-blue-500/20' },
            { label: 'Saques Solicitados', value: `${withdrawLogs.length}`,             color: 'text-amber-400',    border: 'border-amber-500/20' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Audit Log — Últimas {logs.length} entradas</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Registro imutável de todas as operações sobre merchants</p>
          </div>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-slate-700">
              <p className="text-[13px] font-medium">Nenhum registro ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {['Ação', 'Merchant', 'Usuário', 'Detalhes', 'Data'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[9.5px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.map((log) => {
                    const meta = actionMeta[log.action] ?? { label: log.action, dot: 'bg-slate-600' }
                    let details = ''
                    try {
                      const m = JSON.parse(log.metadata ?? '{}')
                      if (m.amount) details = `R$ ${formatBRL(parseFloat(m.amount))}`
                      else if (m.rate) details = `${m.rate}%/mês`
                    } catch {}
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                            <span className="text-slate-300 font-medium">{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 truncate max-w-[140px]">
                          {log.user?.merchant?.name ?? (log.entityId ?? log.id).slice(0, 8) + '…'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[140px]">
                          {log.user?.name ?? log.user?.email ?? log.userId.slice(0, 8) + '…'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{details || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
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
