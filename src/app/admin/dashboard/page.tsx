export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  REVIEW: 'Em revisão',
  BLOCKED: 'Bloqueado',
  INACTIVE: 'Inativo',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

export default async function AdminDashboardPage() {
  const [totalMerchants, activeMerchants, reviewMerchants, totalPlans, recentMerchants] =
    await Promise.all([
      prisma.merchant.count(),
      prisma.merchant.count({ where: { status: 'ACTIVE' } }),
      prisma.merchant.count({ where: { status: 'REVIEW' } }),
      prisma.feePlan.count(),
      prisma.merchant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  const stats = [
    {
      title: 'Total de Clientes',
      value: String(totalMerchants),
      subtitle: 'Merchants cadastrados',
      accent: 'blue' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: 'Clientes Ativos',
      value: String(activeMerchants),
      subtitle: 'Com status ATIVO',
      accent: 'green' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Em Revisão',
      value: String(reviewMerchants),
      subtitle: 'Aguardando aprovação',
      accent: 'amber' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Planos de Taxa',
      value: String(totalPlans),
      subtitle: 'Planos cadastrados',
      accent: 'purple' as const,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
    },
  ]

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral da plataforma" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <Card title="Clientes Recentes">
          {recentMerchants.length === 0 ? (
            <p className="text-slate-500 text-sm px-4 py-8 text-center">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Cadastrado em</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentMerchants.map((m) => (
                    <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-slate-400">{typeLabel[m.type] ?? m.type}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.status === 'ACTIVE' ? 'success' : m.status === 'REVIEW' ? 'warning' : 'danger'}>
                          {statusLabel[m.status] ?? m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/clientes/${m.id}`}
                          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3">
                <Link href="/admin/clientes" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Ver todos os clientes →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
