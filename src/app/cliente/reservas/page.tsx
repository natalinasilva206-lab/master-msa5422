export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

function isOverdue(releaseAt: Date, status: string) {
  return status === 'RESERVADO' && new Date(releaseAt) <= new Date()
}

const statusMeta: Record<string, { label: string; color: string; dot: string }> = {
  RESERVADO:  { label: 'Reservado',           color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   dot: 'bg-amber-400' },
  LIBERADO:   { label: 'Liberado',            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  BLOQUEADO:  { label: 'Bloqueado',           color: 'text-red-400 bg-red-500/10 border-red-500/20',         dot: 'bg-red-400' },
  DISPUTA:    { label: 'Usado em disputa',    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' },
  CANCELADO:  { label: 'Cancelado',           color: 'text-slate-400 bg-slate-700/30 border-slate-600/30',   dot: 'bg-slate-500' },
}

export default async function ClienteReservasPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant

  const entries = merchant
    ? await prisma.reserveRelease.findMany({
        where:   { merchantId: merchant.id },
        orderBy: { releaseAt: 'asc' },
      })
    : []

  const totalReservado = entries.filter(e => e.status === 'RESERVADO').reduce((s, e) => s + e.amount, 0)
  const totalLiberado  = entries.filter(e => e.status === 'LIBERADO').reduce((s, e) => s + e.amount, 0)
  const proximaData    = entries.find(e => e.status === 'RESERVADO' && new Date(e.releaseAt) > new Date())?.releaseAt ?? null

  return (
    <div>
      <Topbar
        showNotifications
        title="Reservas de Risco"
        subtitle="Valores retidos pela plataforma com data prevista de liberação"
        breadcrumb="Financeiro"
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Reservado',
              value: `R$ ${formatBRL(totalReservado)}`,
              sub:   'aguardando liberação',
              color: 'text-amber-400',
              border: 'border-amber-500/20',
            },
            {
              label: 'Total Liberado',
              value: `R$ ${formatBRL(totalLiberado)}`,
              sub:   `${entries.filter(e => e.status === 'LIBERADO').length} reserva(s)`,
              color: 'text-emerald-400',
              border: 'border-emerald-500/20',
            },
            {
              label: 'Próxima Liberação',
              value: proximaData ? formatDate(proximaData) : '—',
              sub:   proximaData ? 'data prevista' : 'sem reservas ativas',
              color: proximaData ? 'text-blue-400' : 'text-slate-600',
              border: 'border-slate-800/50',
            },
            {
              label: 'Total de Reservas',
              value: String(entries.length),
              sub:   `${entries.filter(e => e.status === 'RESERVADO').length} ativa(s)`,
              color: 'text-slate-300',
              border: 'border-slate-800/50',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[12px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* Info box */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-3.5 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[12.5px] text-slate-400 leading-relaxed">
            A reserva de risco é retida automaticamente a cada venda aprovada, conforme a política de risco da plataforma.
            Os valores são liberados automaticamente na data prevista e creditados no seu saldo disponível.
            Em caso de dúvidas, entre em contato com o suporte.
          </p>
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl py-14 flex flex-col items-center gap-3 text-slate-600">
            <svg className="w-9 h-9 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-[13px] font-medium">Nenhuma reserva registrada</p>
            <p className="text-[11.5px]">Reservas aparecem automaticamente após vendas aprovadas.</p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Calendário de Reservas</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{entries.length} entr{entries.length !== 1 ? 'adas' : 'ada'} — ordenadas por data de liberação prevista</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-800/30">
                    {['Data da venda', 'Valor reservado', 'Venda bruta', '% aplicado', 'Prazo', 'Liberação prevista', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {entries.map((e) => {
                    const meta  = statusMeta[e.status] ?? statusMeta['RESERVADO']
                    const over  = isOverdue(e.releaseAt, e.status)
                    return (
                      <tr key={e.id} className={`hover:bg-slate-800/20 transition-colors ${over ? 'bg-red-950/10' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-300">
                          {formatDate(e.saleDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-[13px] font-bold text-amber-300 tabular-nums">R$ {formatBRL(e.amount)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-400 tabular-nums">
                          R$ {formatBRL(e.saleAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-400">
                          {e.reservePercent}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-400">
                          {e.releaseDays}d
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[12px] font-medium ${over ? 'text-red-400' : 'text-slate-200'}`}>
                            {formatDate(e.releaseAt)}
                          </span>
                          {over && (
                            <span className="ml-1.5 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                              processando
                            </span>
                          )}
                          {e.releasedAt && (
                            <p className="text-[10px] text-slate-600 mt-0.5">Liberado: {formatDate(e.releasedAt)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
