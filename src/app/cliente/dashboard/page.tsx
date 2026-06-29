import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const stats = [
  {
    title: 'Saldo Disponível',
    value: 'R$ 12.840,00',
    subtitle: 'Disponível para saque',
    accent: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: 'Volume Transacionado',
    value: 'R$ 89.200,00',
    subtitle: 'Mês atual',
    trend: { value: '14,2%', positive: true },
    accent: 'blue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: 'Rendimento Previsto',
    value: 'R$ 3.200,00',
    subtitle: 'Estimativa do mês',
    accent: 'purple',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: 'Plano Atual',
    value: 'Premium',
    subtitle: 'Taxa: 1,99% + R$ 0,29',
    accent: 'amber',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
]

const recentTransactions = [
  { id: '#TXN-001', description: 'Venda curso Python', amount: 'R$ 297,00', status: 'APPROVED', date: '29/06/2024' },
  { id: '#TXN-002', description: 'Venda ebook marketing', amount: 'R$ 47,00', status: 'APPROVED', date: '29/06/2024' },
  { id: '#TXN-003', description: 'Venda mentoria', amount: 'R$ 1.997,00', status: 'PENDING', date: '28/06/2024' },
  { id: '#TXN-004', description: 'Venda software SaaS', amount: 'R$ 89,90', status: 'APPROVED', date: '28/06/2024' },
  { id: '#TXN-005', description: 'Venda pacote anual', amount: 'R$ 597,00', status: 'REFUNDED', date: '27/06/2024' },
]

export default function ClienteDashboardPage() {
  return (
    <div>
      <Topbar title="Meu Dashboard" subtitle="Resumo da sua conta" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <Card title="Últimas Transações">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">ID</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Descrição</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{tx.id}</td>
                    <td className="px-4 py-3 text-white">{tx.description}</td>
                    <td className="px-4 py-3 text-slate-300 font-medium">{tx.amount}</td>
                    <td className="px-4 py-3">
                      <Badge variant={tx.status === 'APPROVED' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'danger'}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{tx.date}</td>
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
