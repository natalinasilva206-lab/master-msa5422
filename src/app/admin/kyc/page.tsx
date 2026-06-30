export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
]

const kycSteps = ['Dados cadastrais', 'Documento', 'Endereço', 'Bancário']

export default async function KycPage() {
  const [reviewMerchants, activeMerchants, blockedMerchants, allMerchants] = await Promise.all([
    prisma.merchant.findMany({ where: { status: 'REVIEW' }, orderBy: { createdAt: 'desc' } }),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count({ where: { status: 'BLOCKED' } }),
    prisma.merchant.count(),
  ])

  return (
    <div>
      <Topbar
        title="Solicitações KYC"
        breadcrumb="Casa › Operações"
        subtitle="Gerencie aprovações e verificações de identidade dos sellers."
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Em Revisão', value: reviewMerchants.length, color: 'text-amber-400', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', bg: 'bg-amber-500/10 text-amber-500', border: 'border-amber-500/20' },
            { label: 'Aprovados', value: activeMerchants, color: 'text-emerald-400', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20' },
            { label: 'Bloqueados', value: blockedMerchants, color: 'text-red-400', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', bg: 'bg-red-500/10 text-red-500', border: 'border-slate-800/70' },
            { label: 'Total', value: allMerchants, color: 'text-white', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', bg: 'bg-blue-500/10 text-blue-500', border: 'border-slate-800/70' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[26px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.bg}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Fila de revisão */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Fila de Aprovação KYC</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Sellers aguardando verificação manual</p>
            </div>
            {reviewMerchants.length > 0 && (
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                {reviewMerchants.length} pendente{reviewMerchants.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {reviewMerchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhuma solicitação pendente</p>
              <p className="text-[11px] text-slate-800 mt-1">Todos os sellers foram processados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {reviewMerchants.map((m, i) => (
                <div key={m.id} className="px-5 py-4 hover:bg-slate-800/25 transition-colors flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[12px] font-bold text-white shrink-0`}>
                    {getInitials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-white">{m.name}</p>
                      <Badge variant="warning">Em revisão</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.email} · {m.document}</p>
                  </div>
                  {/* KYC progress steps */}
                  <div className="hidden lg:flex items-center gap-1">
                    {kycSteps.map((step, si) => (
                      <div key={step} className="flex items-center gap-1">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${si < 2 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800/60 text-slate-600'}`}>
                          {si < 2 ? '✓' : '○'} {step}
                        </div>
                        {si < kycSteps.length - 1 && <span className="text-slate-800">›</span>}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/clientes/${m.id}`}
                      className="px-3 py-1.5 text-[11.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                    >
                      Revisar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Info box */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-blue-400">Fluxo de verificação KYC</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sellers em revisão têm acesso limitado até aprovação manual. O processo inclui validação de dados cadastrais, documento de identidade, comprovante de endereço e dados bancários.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
