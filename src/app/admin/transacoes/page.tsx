export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'

const demoTransacoes = [
  { id: 'TXN-00821', seller: 'Market Fit Store',   valor: 297.00,  metodo: 'Cartão de Crédito', status: 'APPROVED', data: 'hoje, 14:32' },
  { id: 'TXN-00820', seller: 'Digital Pro',         valor: 1997.00, metodo: 'Pix',               status: 'APPROVED', data: 'hoje, 13:18' },
  { id: 'TXN-00819', seller: 'Loja Alpha',          valor: 47.90,   metodo: 'Cartão de Débito',  status: 'PENDING',  data: 'hoje, 12:55' },
  { id: 'TXN-00818', seller: 'Curso Elite',         valor: 597.00,  metodo: 'Cartão de Crédito', status: 'APPROVED', data: 'hoje, 11:44' },
  { id: 'TXN-00817', seller: 'Oferta Max',          valor: 147.00,  metodo: 'Pix',               status: 'APPROVED', data: 'hoje, 10:22' },
  { id: 'TXN-00816', seller: 'Market Fit Store',   valor: 89.90,   metodo: 'Cartão de Crédito', status: 'REFUNDED', data: 'ontem, 18:30' },
  { id: 'TXN-00815', seller: 'Edu Digital',         valor: 397.00,  metodo: 'Pix',               status: 'APPROVED', data: 'ontem, 16:15' },
  { id: 'TXN-00814', seller: 'TechStore Brasil',    valor: 2497.00, metodo: 'Boleto',            status: 'PENDING',  data: 'ontem, 14:02' },
]

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  APPROVED: 'success',
  PENDING:  'warning',
  REFUNDED: 'danger',
}
const statusLabel: Record<string, string> = {
  APPROVED: 'Aprovada',
  PENDING:  'Pendente',
  REFUNDED: 'Estornada',
}

const metodoBadge: Record<string, string> = {
  'Pix':               'text-emerald-400 bg-emerald-500/10',
  'Cartão de Crédito': 'text-blue-400 bg-blue-500/10',
  'Cartão de Débito':  'text-purple-400 bg-purple-500/10',
  'Boleto':            'text-amber-400 bg-amber-500/10',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const total = demoTransacoes.reduce((s, t) => s + (t.status !== 'REFUNDED' ? t.valor : 0), 0)
const aprovadas = demoTransacoes.filter((t) => t.status === 'APPROVED').length
const pendentes = demoTransacoes.filter((t) => t.status === 'PENDING').length

export default function TransacoesPage() {
  return (
    <div>
      <Topbar
        title="Transações"
        breadcrumb="Casa › Financeiro"
        subtitle="Histórico de movimentações processadas pelo gateway."
        lucroHoje={total}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-slate-900/70 border border-slate-800/70 rounded-xl p-1">
            {['Hoje', '7 dias', '30 dias', 'Personalizado'].map((l) => (
              <button key={l} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${l === 'Hoje' ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}>{l}</button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-slate-900/70 border border-slate-800/70 rounded-xl p-1">
            {['Todas', 'Aprovadas', 'Pendentes', 'Estornadas'].map((l) => (
              <button key={l} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${l === 'Todas' ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'}`}>{l}</button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Volume Hoje', value: `R$ ${formatBRL(total)}`, sub: 'transações aprovadas', color: 'text-emerald-400', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', bg: 'bg-emerald-500/10 text-emerald-500' },
            { label: 'Transações', value: String(demoTransacoes.length), sub: `${aprovadas} aprovadas`, color: 'text-white', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', bg: 'bg-blue-500/10 text-blue-500' },
            { label: 'Pendentes', value: String(pendentes), sub: 'aguardando confirmação', color: pendentes > 0 ? 'text-amber-400' : 'text-slate-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-amber-500/10 text-amber-500' },
            { label: 'Taxa de Aprovação', value: `${Math.round((aprovadas / demoTransacoes.length) * 100)}%`, sub: 'das transações', color: 'text-purple-400', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', bg: 'bg-purple-500/10 text-purple-500' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
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

        {/* Tabela */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Histórico de Transações</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Dados demonstrativos — integração em desenvolvimento</p>
            </div>
            <span className="text-[10px] text-slate-700 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full font-medium">Demo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Seller</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Método</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {demoTransacoes.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-[11.5px] font-mono text-slate-500">#{tx.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12.5px] font-medium text-slate-300">{tx.seller}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${metodoBadge[tx.metodo] ?? 'text-slate-500 bg-slate-800/60'}`}>
                        {tx.metodo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-[13px] font-bold tabular-nums ${tx.status === 'REFUNDED' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tx.status === 'REFUNDED' ? '−' : '+'}R$ {formatBRL(tx.valor)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[tx.status] ?? 'neutral'}>{statusLabel[tx.status] ?? tx.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right hidden sm:table-cell">
                      <span className="text-[11px] text-slate-600">{tx.data}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
