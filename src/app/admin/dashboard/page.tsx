import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const stats = [
  {
    title: 'Total Transacionado',
    value: 'R$ 2.847.391',
    subtitle: 'Acumulado do mês',
    trend: { value: '12,4%', positive: true },
    accent: 'blue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Receita Bruta',
    value: 'R$ 84.219',
    subtitle: 'Taxas cobradas',
    trend: { value: '8,1%', positive: true },
    accent: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Margem Estimada',
    value: 'R$ 41.073',
    subtitle: 'Após custos operacionais',
    trend: { value: '3,2%', positive: false },
    accent: 'purple',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Clientes Ativos',
    value: '138',
    subtitle: 'Merchants com status ATIVO',
    trend: { value: '5 novos', positive: true },
    accent: 'amber',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const recentMerchants = [
  { name: 'Loja Virtual Premium', type: 'ECOMMERCE', status: 'ACTIVE', volume: 'R$ 312.400' },
  { name: 'Info Cursos Online', type: 'INFOPRODUTOR', status: 'ACTIVE', volume: 'R$ 89.200' },
  { name: 'Mega Store Digital', type: 'ECOMMERCE', status: 'REVIEW', volume: 'R$ 0' },
  { name: 'Plataforma Saas', type: 'INFOPRODUTOR', status: 'BLOCKED', volume: 'R$ 12.000' },
]

export default function AdminDashboardPage() {
  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral da plataforma" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Recent merchants */}
        <Card title="Clientes Recentes">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {recentMerchants.map((m, i) => (
                  <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-slate-400">{m.type}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.status === 'ACTIVE' ? 'success' : m.status === 'REVIEW' ? 'warning' : 'danger'}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{m.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
