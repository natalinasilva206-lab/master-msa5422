export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const [merchantCount, userCount, logCount] = await Promise.all([
    prisma.merchant.count(),
    prisma.user.count(),
    prisma.auditLog.count(),
  ])

  const platformInfo = [
    { label: 'Plataforma',      value: 'Master Pagamentos' },
    { label: 'Versão',          value: 'v1.4.0' },
    { label: 'Ambiente',        value: 'Produção' },
    { label: 'Banco de Dados',  value: 'PostgreSQL (Neon)' },
    { label: 'Framework',       value: 'Next.js 14 App Router' },
    { label: 'ORM',             value: 'Prisma' },
  ]

  const stats = [
    { label: 'Merchants Cadastrados', value: merchantCount },
    { label: 'Usuários Totais',       value: userCount },
    { label: 'Eventos no Audit Log',  value: logCount },
  ]

  const planDefaults = [
    { plan: 'Start',  cdi: '0.80', taxa: '2.5%', saque: '1 dia útil',  color: 'bg-slate-400' },
    { plan: 'Growth', cdi: '0.90', taxa: '2.0%', saque: '1 dia útil',  color: 'bg-blue-500' },
    { plan: 'Prime',  cdi: '1.00', taxa: '1.7%', saque: 'Mesmo dia',   color: 'bg-purple-500' },
    { plan: 'Black',  cdi: '1.20', taxa: '1.4%', saque: 'Instantâneo', color: 'bg-white' },
  ]

  return (
    <div>
      <Topbar
        title="Configurações"
        breadcrumb="Casa › Gestão"
        subtitle="Parâmetros e informações da plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 text-center">
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="text-[26px] font-bold text-slate-200 tabular-nums">{s.value}</p>
            </div>
          ))}
        </section>

        {/* Platform info */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Informações da Plataforma</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {platformInfo.map((row) => (
              <div key={row.label} className="px-5 py-3 flex items-center justify-between">
                <span className="text-[11.5px] text-slate-500">{row.label}</span>
                <span className="text-[12px] font-semibold text-slate-200">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Plan defaults */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Parâmetros Padrão por Plano</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Para alterar as taxas CDI individuais, use a página CDI e Rendimentos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Plano', 'CDI/mês padrão', 'Taxa transação', 'Prazo saque'].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-left text-[9.5px] font-bold text-slate-600 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {planDefaults.map((p) => (
                  <tr key={p.plan} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.color}`} />
                        <span className="font-semibold text-slate-200">{p.plan}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-300 font-mono">{p.cdi}%</td>
                    <td className="px-5 py-3 text-slate-400">{p.taxa}</td>
                    <td className="px-5 py-3 text-slate-400">{p.saque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-[12px] font-semibold text-amber-400">Configurações avançadas</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Alterações de parâmetros de produção (taxas, limites, integrações) requerem acesso ao painel de infraestrutura. Entre em contato com a equipe técnica.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
