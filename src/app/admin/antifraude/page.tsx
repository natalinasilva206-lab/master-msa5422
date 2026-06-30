export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export default async function AntifaudePage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const [merchants, blockedMerchants, kycLogs] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'BLOCKED' } }),
    prisma.auditLog.findMany({
      where: { action: { in: ['KYC_BLOCKED', 'KYC_APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: { select: { name: true, merchant: { select: { name: true } } } } },
    }),
  ])

  const blocked   = kycLogs.filter((l) => l.action === 'KYC_BLOCKED').length
  const approved  = kycLogs.filter((l) => l.action === 'KYC_APPROVED').length

  const rules = [
    { name: 'Verificação KYC obrigatória', status: 'Ativo',     desc: 'Todos os merchants devem passar por verificação de identidade antes de operar.' },
    { name: 'Limite de saque diário',      status: 'Ativo',     desc: 'Saques acima do limite do plano requerem aprovação manual da equipe.' },
    { name: 'Monitoramento de volume',     status: 'Ativo',     desc: 'Alertas automáticos para variações bruscas no volume de transações.' },
    { name: 'Detecção de IP suspeito',     status: 'Em breve',  desc: 'Bloqueio automático de logins a partir de IPs sinalizados em listas negras.' },
    { name: 'Análise comportamental ML',   status: 'Em breve',  desc: 'Motor de machine learning para detecção de padrões de fraude em tempo real.' },
  ]

  return (
    <div>
      <Topbar
        title="Antifraude"
        breadcrumb="Casa › Gestão"
        subtitle="Regras de segurança e histórico de bloqueios"
      />

      <div className="p-4 xl:p-6 space-y-4">

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Empresas',   value: merchants,      color: 'text-white',    border: 'border-slate-800/70' },
            { label: 'Bloqueadas',       value: blockedMerchants, color: 'text-red-400',  border: 'border-red-500/20' },
            { label: 'KYC Aprovados',    value: approved,       color: 'text-emerald-400', border: 'border-emerald-500/20' },
            { label: 'KYC Bloqueados',   value: blocked,        color: 'text-red-400',   border: 'border-red-500/20' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[24px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Rules */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Regras de Antifraude</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {rules.map((r) => (
              <div key={r.name} className="px-5 py-3.5 flex items-center gap-4">
                <div className={`shrink-0 w-2 h-2 rounded-full ${r.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-slate-200">{r.name}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{r.desc}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  r.status === 'Ativo'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-700/40 text-slate-500 border-slate-700/40'
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* KYC event log */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Histórico de Decisões KYC</p>
          </div>
          {kycLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <p className="text-[13px] font-medium">Nenhuma decisão KYC ainda</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {kycLogs.map((log) => {
                const isBlock = log.action === 'KYC_BLOCKED'
                return (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                      isBlock ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {isBlock ? '✕' : '✓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-semibold text-slate-200 truncate">
                        {log.user?.merchant?.name ?? 'Merchant'}
                      </p>
                      <p className="text-[10.5px] text-slate-600">{formatDate(log.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isBlock ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'
                    }`}>
                      {isBlock ? 'Bloqueado' : 'Aprovado'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
