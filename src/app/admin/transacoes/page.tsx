export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const statusMeta: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  APROVADO:   { label: 'Aprovado',   color: 'text-emerald-400', bg: 'text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
  PENDENTE:   { label: 'Pendente',   color: 'text-amber-400',   bg: 'text-amber-400 bg-amber-500/10',     dot: 'bg-amber-400' },
  RECUSADO:   { label: 'Recusado',   color: 'text-red-400',     bg: 'text-red-400 bg-red-500/10',         dot: 'bg-red-500' },
  REEMBOLSADO:{ label: 'Reembolsado',color: 'text-slate-400',   bg: 'text-slate-400 bg-slate-700/40',     dot: 'bg-slate-500' },
}

const metodoPag: Record<string, { label: string; icon: string }> = {
  PIX:     { label: 'Pix',          icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  CREDITO: { label: 'Crédito',      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  BOLETO:  { label: 'Boleto',       icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  DEBITO:  { label: 'Débito',       icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
}

const demoProducts = [
  'Curso de Marketing Digital', 'Mentoria Premium', 'E-book Estratégias de Vendas',
  'Pack de Templates', 'Acesso Vitalício Plataforma', 'Workshop Online',
  'Consultoria 1h', 'Curso de Copywriting', 'Membership Mensal',
  'Infoproduto Avançado', 'Treinamento em Vídeo', 'Planilha de Gestão',
  'Bootcamp 30 dias', 'Assinatura Anual', 'Mini Curso Gratuito Premium',
]

const demoMetodos = ['PIX', 'CREDITO', 'BOLETO', 'DEBITO', 'PIX', 'PIX', 'CREDITO', 'CREDITO', 'PIX']
const demoStatus  = ['APROVADO', 'APROVADO', 'APROVADO', 'PENDENTE', 'APROVADO', 'RECUSADO', 'APROVADO', 'REEMBOLSADO', 'APROVADO']

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export default async function AdminTransacoesPage() {
  const merchants = await prisma.merchant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, plan: true, pendingBalance: true, balance: true },
    orderBy: { createdAt: 'asc' },
  })

  const totalVolume   = merchants.reduce((s, m) => s + m.pendingBalance + m.balance, 0)
  const totalPending  = merchants.reduce((s, m) => s + m.pendingBalance, 0)

  // Gera transações demo por seller ativo
  const demoTxs: {
    id: string
    seller: string
    plan: string
    produto: string
    metodo: string
    status: string
    valor: number
    data: Date
  }[] = []

  merchants.forEach((m, mi) => {
    const count = 3 + Math.floor(seededRand(mi * 7) * 8)
    for (let i = 0; i < count; i++) {
      const seed  = mi * 100 + i
      const valor = Math.round((50 + seededRand(seed) * 1950) * 100) / 100
      const daysAgo = Math.floor(seededRand(seed + 1) * 60)
      const data  = new Date(Date.now() - daysAgo * 86400000 - Math.floor(seededRand(seed + 2) * 86400000))
      demoTxs.push({
        id:      `${m.id}-${i}`,
        seller:  m.name,
        plan:    m.plan,
        produto: demoProducts[Math.floor(seededRand(seed + 3) * demoProducts.length)],
        metodo:  demoMetodos[Math.floor(seededRand(seed + 4) * demoMetodos.length)],
        status:  demoStatus[Math.floor(seededRand(seed + 5) * demoStatus.length)],
        valor,
        data,
      })
    }
  })

  demoTxs.sort((a, b) => b.data.getTime() - a.data.getTime())

  const aprovadas  = demoTxs.filter((t) => t.status === 'APROVADO')
  const volumeDemo = aprovadas.reduce((s, t) => s + t.valor, 0)
  const ticketMed  = aprovadas.length > 0 ? volumeDemo / aprovadas.length : 0

  const fallback = merchants.length === 0

  return (
    <div>
      <Topbar
        title="Transações"
        breadcrumb="Casa › Financeiro"
        subtitle="Vendas processadas pelos sellers na plataforma"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Volume Total',
              value: `R$ ${formatBRL(fallback ? 0 : volumeDemo)}`,
              sub: `${aprovadas.length} transações aprovadas`,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 text-emerald-500',
              icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
            },
            {
              label: 'Ticket Médio',
              value: `R$ ${formatBRL(fallback ? 0 : ticketMed)}`,
              sub: 'por transação aprovada',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 text-blue-500',
              icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
            },
            {
              label: 'Saldo Disponível',
              value: `R$ ${formatBRL(totalPending)}`,
              sub: 'pendingBalance sellers ativos',
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 text-amber-500',
              icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
            },
            {
              label: 'Sellers Ativos',
              value: `${merchants.length}`,
              sub: `R$ ${formatBRL(totalVolume)} em carteira`,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10 text-purple-500',
              icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
            },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
                  <p className={`text-[17px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5">{c.sub}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${c.bg}`}>
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
              <p className="text-[13px] font-semibold text-white">Histórico de Vendas</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">{demoTxs.length} transações · {aprovadas.length} aprovadas</p>
            </div>
            <span className="text-[10px] font-medium text-slate-700 bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 rounded-full">
              demo
            </span>
          </div>

          {fallback ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-[13px] font-medium">Nenhum seller ativo ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Cliente / Produto</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Seller</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden xl:table-cell">Pagamento</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {demoTxs.slice(0, 60).map((tx) => {
                    const st  = statusMeta[tx.status] ?? statusMeta['PENDENTE']
                    const met = metodoPag[tx.metodo]  ?? metodoPag['PIX']
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                            <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${st.bg}`}>{st.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell max-w-[180px]">
                          <p className="text-[12px] font-medium text-slate-200 truncate">{tx.produto}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{tx.plan}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-[11.5px] text-slate-400 truncate max-w-[130px]">{tx.seller}</p>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={met.icon} />
                            </svg>
                            <span className="text-[11px] text-slate-500">{met.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[13px] font-bold tabular-nums ${st.color}`}>
                            R$ {formatBRL(tx.valor)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right hidden md:table-cell">
                          <span className="text-[11px] text-slate-600">{formatDate(tx.data)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-2.5 border-t border-slate-800/50">
                <span className="text-[11px] text-slate-700">Exibindo {Math.min(60, demoTxs.length)} de {demoTxs.length} transações · dados demonstrativos</span>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
