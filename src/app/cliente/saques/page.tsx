export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const taxaSaque = 0
const prazoSaque = '1 dia útil'

export default async function ClienteSaquesPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const saldo    = merchant?.balance       ?? 0
  const pendente = merchant?.pendingBalance ?? 0
  const plano    = merchant?.plan          ?? '—'

  return (
    <div>
      <Topbar
        title="Saques"
        breadcrumb="Financeiro"
        subtitle="Solicite a transferência do seu saldo disponível."
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">Disponível para Saque</p>
                <p className="text-[24px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(saldo)}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">Saldo liberado · Plano {plano}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">Saldo Pendente</p>
                <p className="text-[24px] font-bold text-amber-400 tabular-nums leading-none">R$ {formatBRL(pendente)}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">Aguardando liquidação</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">Taxa e Prazo</p>
                <p className="text-[20px] font-bold text-white leading-none">{taxaSaque === 0 ? 'Gratuito' : `${taxaSaque}%`}</p>
                <p className="text-[10px] text-slate-600 mt-1.5">Prazo: {prazoSaque}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Formulário de saque */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Nova Solicitação de Saque</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">O valor será transferido para sua conta bancária cadastrada</p>
            </div>
            <div className="p-5 space-y-4">
              {saldo === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                  <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-[12.5px] font-medium">Saldo insuficiente</p>
                  <p className="text-[11px] text-slate-800 mt-1">Você não possui saldo disponível para saque.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Valor do Saque</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-500">R$</span>
                      <input
                        type="text"
                        defaultValue={formatBRL(saldo)}
                        readOnly
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[14px] font-bold tabular-nums rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-default"
                      />
                    </div>
                    <p className="text-[10.5px] text-slate-600 mt-1">Saldo máximo disponível: R$ {formatBRL(saldo)}</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Conta de Destino</label>
                    <div className="w-full px-3 py-2.5 bg-slate-800/40 border border-slate-700/40 rounded-xl text-[12px] text-slate-500">
                      Nenhuma conta bancária cadastrada
                    </div>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3">
                    <p className="text-[10.5px] text-blue-400 font-semibold mb-0.5">Resumo do saque</p>
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Valor solicitado</span>
                        <span className="text-slate-300 font-semibold tabular-nums">R$ {formatBRL(saldo)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Taxa</span>
                        <span className="text-emerald-400 font-semibold">Grátis</span>
                      </div>
                      <div className="flex justify-between text-[11px] border-t border-slate-800/60 pt-1 mt-1">
                        <span className="text-slate-400 font-semibold">Você receberá</span>
                        <span className="text-white font-bold tabular-nums">R$ {formatBRL(saldo)}</span>
                      </div>
                    </div>
                  </div>

                  <button disabled className="w-full py-3 rounded-xl bg-blue-600/40 text-blue-400 text-[13px] font-semibold cursor-not-allowed border border-blue-500/20">
                    Solicitar Saque (em breve)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Histórico de saques */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico de Saques</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Transferências realizadas</p>
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[12.5px] font-medium">Nenhum saque realizado</p>
              <p className="text-[11px] text-slate-800 mt-1">Seu histórico de saques aparecerá aqui.</p>
            </div>
          </div>

        </section>

        {/* Info */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Política de saques</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Saques são processados em <strong className="text-slate-400">{prazoSaque}</strong> após a solicitação. Não há taxa de transferência para o plano {plano}. O módulo de solicitação está em desenvolvimento — em breve você poderá cadastrar sua conta bancária e solicitar saques diretamente por aqui.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
