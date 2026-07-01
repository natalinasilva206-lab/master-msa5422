export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { AntecipacaoForm } from './AntecipacaoForm'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const TAXA = 2.5

export default async function AntecipacaoClientePage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const pendente  = merchant?.pendingBalance ?? 0
  const saldo     = merchant?.balance        ?? 0
  const plano     = merchant?.plan           ?? 'Start'

  const taxaPlano: Record<string, number> = { Start: 2.5, Growth: 2.0, Prime: 1.5, Black: 1.0 }
  const taxa = taxaPlano[plano] ?? TAXA

  const antecipacaoLogs = merchant
    ? await prisma.auditLog.findMany({
        where: { entityId: merchant.id, action: 'ANTECIPACAO_REQUEST' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    : []

  const totalAntecipado = antecipacaoLogs.reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

  return (
    <div>
      <Topbar
        title="Antecipação de Recebíveis"
        breadcrumb="Financeiro"
        subtitle={`Exclusivo para recebíveis de cartão · Taxa ${taxa}% · Crédito imediato no saldo disponível`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Saldo Pendente',       value: `R$ ${formatBRL(pendente)}`,        color: 'text-amber-400',   border: 'border-amber-500/20' },
            { label: 'Disponível (após taxa)',value: `R$ ${formatBRL(pendente * (1 - taxa / 100))}`, color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'Total Antecipado',     value: `R$ ${formatBRL(totalAntecipado)}`, color: 'text-slate-200',   border: 'border-slate-800/70' },
            { label: 'Taxa do Plano',        value: `${taxa}%`,                         color: 'text-blue-400',    border: 'border-slate-800/70' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Formulário */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-semibold text-white">Solicitar Antecipação</p>
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase tracking-wide">Cartão</span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Receba agora os recebíveis de cartão com desconto de {taxa}%
              </p>
            </div>
            <AntecipacaoForm pendente={pendente} saldo={saldo} taxa={taxa} />
          </div>

          {/* Histórico */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Antecipações</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{antecipacaoLogs.length} solicitaçõe{antecipacaoLogs.length !== 1 ? 's' : ''}</p>
            </div>
            {antecipacaoLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhuma antecipação ainda</p>
                <p className="text-[11px] text-slate-800 mt-1">Seu histórico aparecerá aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[360px] overflow-y-auto">
                {antecipacaoLogs.map((log) => {
                  let amount = 0, liquidoVal = 0, taxaVal = 0
                  try {
                    const m = JSON.parse(log.metadata ?? '{}')
                    amount    = parseFloat(m.amount  || 0)
                    liquidoVal = parseFloat(m.liquido || 0)
                    taxaVal   = parseFloat(m.taxa    || 0)
                  } catch {}
                  return (
                    <div key={log.id} className="px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-200">Antecipação aprovada</p>
                          <p className="text-[12px] text-slate-600">{formatDate(log.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(liquidoVal)}</p>
                          <p className="text-[12px] text-slate-600 tabular-nums">bruto R$ {formatBRL(amount)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </section>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Como funciona a antecipação de recebíveis</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Disponível <strong className="text-slate-400">exclusivamente para recebíveis de cartão</strong>. Permite receber antes do prazo natural de liquidação das parcelas. É cobrada uma taxa de <strong className="text-slate-400">{taxa}%</strong> sobre o valor bruto (plano <strong className="text-slate-400">{plano}</strong>). O valor líquido é creditado imediatamente no seu saldo disponível. Recebíveis de outros meios (boleto, Pix) não são elegíveis para antecipação.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
