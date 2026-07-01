export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { AntecipacaoForm } from './AntecipacaoForm'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const taxaPlano: Record<string, number> = { Start: 2.5, Growth: 2.0, Prime: 1.5, Black: 1.0 }
const TAXA_DEFAULT = 2.5

export default async function AntecipacaoClientePage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: { merchant: { select: { id: true, plan: true, futureBalance: true, status: true, anticipationFeePercent: true } } },
      })
    : null

  const merchant = user?.merchant
  const futureBalance = merchant?.futureBalance ?? 0
  const plano         = merchant?.plan ?? 'Start'
  const taxa          = merchant?.anticipationFeePercent ?? taxaPlano[plano] ?? TAXA_DEFAULT

  const [antecipacoes, pendingRequest] = merchant
    ? await Promise.all([
        prisma.anticipation.findMany({
          where: { merchantId: merchant.id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.anticipation.findFirst({
          where: { merchantId: merchant.id, status: 'PENDENTE' },
        }),
      ])
    : [[], null]

  const totalAprovado = antecipacoes
    .filter((a) => a.status === 'APROVADA')
    .reduce((s, a) => s + a.requestedAmount, 0)

  const pendingData = pendingRequest
    ? {
        id: pendingRequest.id,
        requestedAmount: pendingRequest.requestedAmount,
        feePercent: pendingRequest.feePercent,
        feeAmount: pendingRequest.feeAmount,
        netAmount: pendingRequest.netAmount,
        createdAt: pendingRequest.createdAt.toISOString(),
      }
    : null

  return (
    <div>
      <Topbar showNotifications
        title="Antecipação de Recebíveis"
        subtitle={`Exclusivo para recebíveis de cartão · Taxa ${taxa}% · Aprovação necessária`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Recebíveis de Cartão',
              value: `R$ ${formatBRL(futureBalance)}`,
              sub: 'a liberar (elegível para antecipação)',
              color: 'text-amber-400',
              border: 'border-amber-500/20',
            },
            {
              label: 'Líquido Estimado',
              value: futureBalance > 0 ? `R$ ${formatBRL(futureBalance * (1 - taxa / 100))}` : '—',
              sub: `após taxa de ${taxa}% (plano ${plano})`,
              color: 'text-emerald-400',
              border: 'border-emerald-500/20',
            },
            {
              label: 'Total Antecipado',
              value: `R$ ${formatBRL(totalAprovado)}`,
              sub: `${antecipacoes.filter((a) => a.status === 'APROVADA').length} antecipações aprovadas`,
              color: 'text-slate-200',
              border: 'border-slate-800/70',
            },
            {
              label: 'Taxa do Plano',
              value: `${taxa}%`,
              sub: 'sobre o valor bruto antecipado',
              color: 'text-blue-400',
              border: 'border-slate-800/70',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Form */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[13px] font-semibold text-white">Solicitar Antecipação</p>
                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 uppercase tracking-wide">Cartão</span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Antecipe os recebíveis de cartão de crédito com desconto de {taxa}%
              </p>
            </div>
            <AntecipacaoForm
              futureBalance={futureBalance}
              taxa={taxa}
              plano={plano}
              pendingRequest={pendingData}
            />
          </div>

          {/* History */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Antecipações</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{antecipacoes.length} solicitação{antecipacoes.length !== 1 ? 'ões' : ''}</p>
            </div>
            {antecipacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-[12.5px] font-medium">Nenhuma antecipação ainda</p>
                <p className="text-[11px] text-slate-800 mt-1">Seu histórico aparecerá aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40 max-h-[400px] overflow-y-auto">
                {antecipacoes.map((a) => {
                  const statusColor: Record<string, string> = {
                    PENDENTE:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    APROVADA:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    REJEITADA: 'text-red-400 bg-red-500/10 border-red-500/20',
                    CANCELADA: 'text-slate-500 bg-slate-700/30 border-slate-600/20',
                  }
                  return (
                    <div key={a.id} className="px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${statusColor[a.status] ?? 'text-slate-400 bg-slate-700/30 border-slate-600/20'}`}>
                              {a.status}
                            </span>
                            <p className="text-[10.5px] text-slate-600">
                              {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(a.createdAt))}
                            </p>
                          </div>
                          {a.adminNotes && (
                            <p className="text-[10px] text-slate-600 italic mt-0.5">Obs: {a.adminNotes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {a.status === 'APROVADA' ? (
                            <>
                              <p className="text-[13px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(a.netAmount)}</p>
                              <p className="text-[10px] text-slate-600 tabular-nums">bruto R$ {formatBRL(a.requestedAmount)}</p>
                            </>
                          ) : (
                            <p className="text-[12px] text-slate-400 tabular-nums">R$ {formatBRL(a.requestedAmount)}</p>
                          )}
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
            <p className="text-[12px] font-semibold text-blue-400">Como funciona a antecipação</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Disponível <strong className="text-slate-400">exclusivamente para recebíveis de cartão de crédito</strong> — o saldo que ainda está no prazo de liquidação. Não se aplica a Pix, boleto ou outros meios.
              Ao solicitar, o time financeiro analisa e aprova. Após aprovação, o valor líquido (bruto − taxa de {taxa}%) é creditado imediatamente no seu saldo disponível.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
