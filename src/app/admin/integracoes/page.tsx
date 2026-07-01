export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

export default async function AdminIntegracoesPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const ago7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const ago30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalMerchants,
    merchantsComKey,
    merchantsSemKey,
    webhooksAtivos,
    vendas30d,
    vendas7d,
    merchantsComApiAtiva,
    totalDeliveries7d,
    falhas7d,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { apiKey: { not: null } } }),
    prisma.merchant.count({ where: { apiKey: null } }),
    prisma.webhookEndpoint.count({ where: { active: true } }),
    prisma.saleLog.count({ where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago30d } } }),
    prisma.saleLog.count({ where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago7d } } }),
    prisma.saleLog.findMany({
      where:    { type: 'VENDA', createdAt: { gte: ago30d } },
      select:   { merchantId: true },
      distinct: ['merchantId'],
    }).then((r) => r.length),
    prisma.webhookDelivery.count({ where: { createdAt: { gte: ago7d } } }),
    prisma.webhookDelivery.count({ where: { success: false, createdAt: { gte: ago7d } } }),
  ])

  // Últimas falhas de webhook (success=false, últimas 48h para monitoramento rápido)
  const ago48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const falhasRecentes = await prisma.webhookDelivery.findMany({
    where:   { success: false, createdAt: { gte: ago48h } },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id:         true,
      merchantId: true,
      event:      true,
      url:        true,
      statusCode: true,
      error:      true,
      attempt:    true,
      createdAt:  true,
    },
  })

  // Nomes dos merchants para exibição na tabela
  const merchantIds = Array.from(new Set(falhasRecentes.map((f) => f.merchantId)))
  const merchantNames = merchantIds.length > 0
    ? await prisma.merchant.findMany({
        where:  { id: { in: merchantIds } },
        select: { id: true, name: true },
      }).then((ms) => Object.fromEntries(ms.map((m) => [m.id, m.name])))
    : {} as Record<string, string>

  const taxaFalha = totalDeliveries7d > 0
    ? Math.round((falhas7d / totalDeliveries7d) * 100)
    : 0

  // Lista de merchants com status de integração
  const merchants = await prisma.merchant.findMany({
    select: {
      id:     true,
      name:   true,
      status: true,
      apiKey: true,
      webhookEndpoints: { where: { active: true }, select: { id: true } },
      _count: { select: { saleLogs: { where: { createdAt: { gte: ago30d } } } } },
    },
    orderBy: { name: 'asc' },
    take: 50,
  })

  const pctAdocao = totalMerchants > 0 ? Math.round((merchantsComKey / totalMerchants) * 100) : 0

  const health = [
    {
      label: 'API Key configurada',
      value: `${merchantsComKey} / ${totalMerchants}`,
      sub: `${pctAdocao}% dos merchants`,
      color: merchantsComKey > 0 ? 'text-emerald-400' : 'text-slate-500',
    },
    {
      label: 'Sem API Key',
      value: merchantsSemKey.toString(),
      sub: 'merchants sem integração',
      color: merchantsSemKey > 0 ? 'text-amber-400' : 'text-slate-500',
    },
    {
      label: 'Vendas via API (30d)',
      value: vendas30d.toLocaleString('pt-BR'),
      sub: `${vendas7d.toLocaleString('pt-BR')} nos últimos 7d`,
      color: vendas30d > 0 ? 'text-blue-400' : 'text-slate-500',
    },
    {
      label: 'Webhooks ativos',
      value: webhooksAtivos.toString(),
      sub: `${merchantsComApiAtiva} merchants com uso nos 30d`,
      color: webhooksAtivos > 0 ? 'text-purple-400' : 'text-slate-500',
    },
  ]

  const webhookHealth = [
    {
      label: 'Entregas (7d)',
      value: totalDeliveries7d.toLocaleString('pt-BR'),
      sub: `${falhas7d} falha${falhas7d !== 1 ? 's' : ''}`,
      color: 'text-blue-400',
    },
    {
      label: 'Taxa de falha (7d)',
      value: `${taxaFalha}%`,
      sub: totalDeliveries7d > 0 ? `de ${totalDeliveries7d} tentativas` : 'sem dados',
      color: taxaFalha === 0 ? 'text-emerald-400' : taxaFalha < 10 ? 'text-amber-400' : 'text-red-400',
    },
    {
      label: 'Falhas (48h)',
      value: falhasRecentes.length.toString(),
      sub: falhasRecentes.length > 0 ? 'requerem atenção' : 'tudo ok',
      color: falhasRecentes.length === 0 ? 'text-emerald-400' : 'text-red-400',
    },
  ]

  const endpoints = [
    { method: 'POST', path: '/api/v1/sales',            desc: 'Registrar venda',             auth: 'body' },
    { method: 'GET',  path: '/api/v1/balance',          desc: 'Consultar saldo',             auth: 'header' },
    { method: 'GET',  path: '/api/v1/transactions',     desc: 'Listar transações',           auth: 'header' },
    { method: 'GET',  path: '/api/v1/transactions/:id', desc: 'Consultar transação por ID',  auth: 'header' },
    { method: 'POST', path: '/api/v1/withdrawals',      desc: 'Solicitar saque',             auth: 'header' },
    { method: 'GET',  path: '/api/v1/withdrawals',      desc: 'Listar saques',              auth: 'header' },
  ]

  return (
    <div>
      <Topbar
        title="Integrações / API"
        breadcrumb="Casa › Gestão"
        subtitle="Adoção da API e status das integrações por merchant"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Health */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {health.map((h) => (
            <div key={h.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{h.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${h.color}`}>{h.value}</p>
              <p className="text-[12px] text-slate-600 mt-1">{h.sub}</p>
            </div>
          ))}
        </section>

        {/* Adoption table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Adoção por Merchant</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Status de API Key, webhooks e uso nos últimos 30 dias</p>
            </div>
            <p className="text-[11px] text-slate-600">{merchants.length} de {totalMerchants} merchants</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="text-left px-5 py-2.5 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Merchant</th>
                  <th className="text-center px-4 py-2.5 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-2.5 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">API Key</th>
                  <th className="text-center px-4 py-2.5 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Webhooks</th>
                  <th className="text-right px-5 py-2.5 text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Vendas 30d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {merchants.map((m) => {
                  const temKey      = !!m.apiKey
                  const temWebhook  = m.webhookEndpoints.length > 0
                  const vendas30dMerchant = m._count.saleLogs
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-2.5">
                        <a href={`/admin/clientes/${m.id}`} className="text-slate-200 hover:text-white transition-colors font-medium">
                          {m.name}
                        </a>
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">{m.id.slice(0, 16)}…</p>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-700/40 text-slate-500 border-slate-700/40'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {temKey ? (
                          <span className="text-[10px] font-semibold text-emerald-400">✓ Configurada</span>
                        ) : (
                          <span className="text-[10px] text-amber-500">Pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {temWebhook ? (
                          <span className="text-[10px] font-semibold text-blue-400">{m.webhookEndpoints.length} ativo{m.webhookEndpoints.length > 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-[10px] text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">
                        {vendas30dMerchant > 0 ? vendas30dMerchant.toLocaleString('pt-BR') : <span className="text-slate-700">0</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Webhook Health */}
        <section>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Saúde dos Webhooks</p>
          <div className="grid grid-cols-3 gap-3">
            {webhookHealth.map((h) => (
              <div key={h.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{h.label}</p>
                <p className={`text-[20px] font-bold tabular-nums ${h.color}`}>{h.value}</p>
                <p className="text-[12px] text-slate-600 mt-1">{h.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Falhas recentes */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Falhas recentes de webhook</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Entregas com <code className="font-mono">success = false</code> nas últimas 48 horas</p>
            </div>
            {falhasRecentes.length > 0 && (
              <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                {falhasRecentes.length} falha{falhasRecentes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {falhasRecentes.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[12px] text-emerald-400 font-semibold">Nenhuma falha nas últimas 48h</p>
              <p className="text-[11px] text-slate-600 mt-1">Todas as entregas de webhook foram bem-sucedidas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Evento</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">URL</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Tentativas</th>
                    <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Quando</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {falhasRecentes.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-2.5">
                        <a href={`/admin/clientes/${f.merchantId}`} className="text-slate-300 hover:text-white transition-colors font-medium text-[11px]">
                          {merchantNames[f.merchantId] ?? f.merchantId.slice(0, 12) + '…'}
                        </a>
                        <p className="text-[9.5px] text-slate-700 font-mono">{f.merchantId.slice(0, 14)}…</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <code className="text-[10.5px] font-mono text-amber-400">{f.event}</code>
                      </td>
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <p className="text-[10.5px] font-mono text-slate-500 truncate">{f.url}</p>
                        {f.error && (
                          <p className="text-[9.5px] text-red-400/80 truncate mt-0.5">{f.error}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {f.statusCode ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono ${
                            f.statusCode >= 500 ? 'text-red-400 bg-red-500/10' :
                            f.statusCode >= 400 ? 'text-amber-400 bg-amber-500/10' :
                            'text-slate-400 bg-slate-700/40'
                          }`}>{f.statusCode}</span>
                        ) : (
                          <span className="text-[10px] text-red-400">timeout</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] text-slate-500 tabular-nums">{f.attempt}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <p className="text-[10.5px] text-slate-600 tabular-nums">
                          {f.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Endpoints reference */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Endpoints da API v1</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Base URL: <code className="font-mono text-blue-300">https://api.masterpagamentos.com.br</code></p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {endpoints.map((ep) => (
              <div key={ep.path} className="px-5 py-2.5 flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono shrink-0 ${
                  ep.method === 'GET' ? 'bg-blue-600/20 text-blue-400' : 'bg-emerald-600/20 text-emerald-400'
                }`}>{ep.method}</span>
                <code className="text-[12px] font-mono text-slate-300 flex-1">{ep.path}</code>
                <span className="text-[12px] text-slate-600 hidden sm:block">{ep.desc}</span>
                {ep.auth === 'body' && (
                  <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">apiKey no body</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Integrações futuras */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'BAAS (Banking as a Service)', desc: 'Contas, Pix, TED e boletos. Em desenvolvimento.' },
            { name: 'Adquirentes',                 desc: 'Cielo, Stone, Rede — crédito, débito e parcelamento. Em desenvolvimento.' },
          ].map((integ) => (
            <div key={integ.name} className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-slate-400">{integ.name}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{integ.desc}</p>
              </div>
              <span className="ml-auto text-[10px] font-semibold text-slate-600 bg-slate-800/40 border border-slate-700/30 px-2 py-0.5 rounded-full shrink-0">Em breve</span>
            </div>
          ))}
        </section>

      </div>
    </div>
  )
}
