export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { MerchantManageDrawer } from './MerchantManageDrawer'
import { RetryWebhookButton } from './AdminApiActions'

export default async function AdminIntegracoesPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const now    = new Date()
  const ago7d  = new Date(now.getTime() - 7  * 864e5)
  const ago30d = new Date(now.getTime() - 30 * 864e5)
  const ago48h = new Date(now.getTime() - 48 * 36e5)

  // ── Métricas globais ────────────────────────────────────────────────
  const [
    totalMerchants,
    merchantsComKey,
    webhooksAtivos,
    vendas30dTotal,
    vendas7dTotal,
    totalDeliveries7d,
    falhas7d,
    saquesViaApi30d,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { apiKey: { not: null } } }),
    prisma.webhookEndpoint.count({ where: { active: true } }),
    prisma.saleLog.count({ where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago30d } } }),
    prisma.saleLog.count({ where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago7d  } } }),
    prisma.webhookDelivery.count({ where: { createdAt: { gte: ago7d } } }),
    prisma.webhookDelivery.count({ where: { success: false, createdAt: { gte: ago7d } } }),
    prisma.auditLog.count({
      where: { action: 'WITHDRAW_REQUEST', metadata: { contains: '"via":"api"' }, createdAt: { gte: ago30d } },
    }),
  ])

  const vendedores30dIds = await prisma.saleLog.findMany({
    where: { type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago30d } },
    select: { merchantId: true },
    distinct: ['merchantId'],
  }).then((r) => new Set(r.map((x) => x.merchantId)))

  const merchantsComApiAtiva  = vendedores30dIds.size
  const merchantsComKeySemUso = await prisma.merchant.count({
    where: { apiKey: { not: null }, id: { notIn: Array.from(vendedores30dIds) } },
  })

  // ── Dados por merchant (tabela) ─────────────────────────────────────
  const merchants = await prisma.merchant.findMany({
    select: {
      id: true, name: true, email: true, apiKey: true,
      webhookEndpoints: { select: { id: true, active: true } },
    },
    orderBy: { name: 'asc' },
    take: 100,
  })

  const mIds = merchants.map((m) => m.id)

  const vendasPorMerchant = await prisma.saleLog.groupBy({
    by: ['merchantId'],
    where: { merchantId: { in: mIds }, type: 'VENDA', status: 'APROVADO', createdAt: { gte: ago30d } },
    _count: { _all: true },
  }).then((r) => Object.fromEntries(r.map((x) => [x.merchantId, x._count._all])))

  const ultimaVendaList = await prisma.saleLog.findMany({
    where: { merchantId: { in: mIds }, type: 'VENDA', status: 'APROVADO' },
    orderBy: { createdAt: 'desc' },
    distinct: ['merchantId'],
    select: { merchantId: true, createdAt: true },
  }).then((r) => Object.fromEntries(r.map((x) => [x.merchantId, x.createdAt])))

  const saquesApiRows = await prisma.auditLog.findMany({
    where: { entityId: { in: mIds }, action: 'WITHDRAW_REQUEST', metadata: { contains: '"via":"api"' }, createdAt: { gte: ago30d } },
    select: { entityId: true },
  })
  const saquesPorMerchant: Record<string, number> = {}
  for (const r of saquesApiRows) {
    const eid = r.entityId ?? ''
    if (eid) saquesPorMerchant[eid] = (saquesPorMerchant[eid] ?? 0) + 1
  }

  const ultimaFalhaList = await prisma.webhookDelivery.findMany({
    where: { merchantId: { in: mIds }, success: false, createdAt: { gte: ago48h } },
    orderBy: { createdAt: 'desc' },
    distinct: ['merchantId'],
    select: { merchantId: true, createdAt: true, event: true, statusCode: true },
  }).then((r) => Object.fromEntries(r.map((x) => [x.merchantId, x])))

  // ── Falhas recentes globais ─────────────────────────────────────────
  const falhasRecentes = await prisma.webhookDelivery.findMany({
    where: { success: false, createdAt: { gte: ago48h } },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: { id: true, merchantId: true, event: true, url: true, statusCode: true, error: true, attempt: true, createdAt: true },
  })
  const falhaMerchantIds = Array.from(new Set(falhasRecentes.map((f) => f.merchantId)))
  const falhaMerchantNames = falhaMerchantIds.length > 0
    ? await prisma.merchant.findMany({ where: { id: { in: falhaMerchantIds } }, select: { id: true, name: true } })
        .then((ms) => Object.fromEntries(ms.map((m) => [m.id, m.name])))
    : {} as Record<string, string>

  // ── Derivados ───────────────────────────────────────────────────────
  const pctAdocao   = totalMerchants > 0 ? Math.round((merchantsComKey / totalMerchants) * 100) : 0
  const taxaSucesso = totalDeliveries7d > 0
    ? Math.round(((totalDeliveries7d - falhas7d) / totalDeliveries7d) * 100)
    : 100

  const cards = [
    { label: 'Com API Key',        value: `${merchantsComKey} / ${totalMerchants}`, sub: `${pctAdocao}% de adoção`,            color: merchantsComKey > 0 ? 'text-emerald-400' : 'text-slate-500', border: '' },
    { label: 'API ativa (30d)',     value: merchantsComApiAtiva.toString(),           sub: 'fizeram vendas via API',             color: merchantsComApiAtiva > 0 ? 'text-blue-400' : 'text-slate-500', border: '' },
    { label: 'Key sem uso (30d)',   value: merchantsComKeySemUso.toString(),          sub: 'têm key mas não usaram',             color: merchantsComKeySemUso > 0 ? 'text-amber-400' : 'text-emerald-400', border: merchantsComKeySemUso > 0 ? 'border-amber-500/20' : '' },
    { label: 'Vendas API (30d)',    value: vendas30dTotal.toLocaleString('pt-BR'),    sub: `${vendas7dTotal.toLocaleString('pt-BR')} nos últimos 7d`, color: vendas30dTotal > 0 ? 'text-blue-400' : 'text-slate-500', border: '' },
    { label: 'Saques API (30d)',    value: saquesViaApi30d.toLocaleString('pt-BR'),   sub: 'via endpoint /withdrawals',          color: saquesViaApi30d > 0 ? 'text-purple-400' : 'text-slate-500', border: '' },
    { label: 'Webhooks ativos',     value: webhooksAtivos.toString(),                 sub: 'endpoints configurados',             color: webhooksAtivos > 0 ? 'text-purple-400' : 'text-slate-500', border: '' },
    { label: 'Entregas (7d)',       value: totalDeliveries7d.toLocaleString('pt-BR'), sub: `${falhas7d} falha${falhas7d !== 1 ? 's' : ''}`, color: 'text-blue-400', border: '' },
    { label: 'Taxa de sucesso',     value: `${taxaSucesso}%`,                         sub: totalDeliveries7d > 0 ? 'nos últimos 7 dias' : 'sem entregas', color: taxaSucesso >= 95 ? 'text-emerald-400' : taxaSucesso >= 80 ? 'text-amber-400' : 'text-red-400', border: taxaSucesso < 80 ? 'border-red-500/20' : '' },
  ]

  return (
    <div>
      <Topbar
        title="Integrações / API"
        breadcrumb="Casa › Gestão"
        subtitle="Visão operacional de adoção, uso e saúde dos webhooks"
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* ── Cards ── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border rounded-xl p-4 ${c.border || 'border-slate-800/70'}`}>
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-2 leading-tight">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-tight">{c.sub}</p>
            </div>
          ))}
        </section>

        {/* ── Tabela de merchants ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[13px] font-semibold text-white">Adoção por Seller</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Linha em âmbar = API Key criada mas sem uso nos últimos 30 dias.
              </p>
            </div>
            <p className="text-[11px] text-slate-600">{merchants.length} de {totalMerchants}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Seller</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">API</th>
                  <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Últ. atividade</th>
                  <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Vendas 30d</th>
                  <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Saques API</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Webhook</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Últ. falha</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {merchants.map((m) => {
                  const temKey      = !!m.apiKey
                  const vendas30d   = vendasPorMerchant[m.id] ?? 0
                  const saques30d   = saquesPorMerchant[m.id] ?? 0
                  const ultimaVenda = ultimaVendaList[m.id] ?? null
                  const ultimaFalha = ultimaFalhaList[m.id] ?? null
                  const semUso      = temKey && vendas30d === 0
                  const whAtv       = m.webhookEndpoints.filter((w) => w.active)

                  return (
                    <tr key={m.id} className={`transition-colors ${semUso ? 'bg-amber-500/5 hover:bg-amber-500/8' : 'hover:bg-slate-800/20'}`}>

                      {/* Seller */}
                      <td className="px-4 py-3">
                        <a href={`/admin/clientes/${m.id}`} className="text-slate-200 hover:text-white font-medium transition-colors leading-none">
                          {m.name}
                        </a>
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[150px]">{m.email}</p>
                      </td>

                      {/* API status */}
                      <td className="px-3 py-3 text-center">
                        {temKey ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            semUso
                              ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          }`}>
                            {semUso ? '⚠ Inativa' : '✓ Ativa'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-700">—</span>
                        )}
                      </td>

                      {/* Última atividade */}
                      <td className="px-3 py-3 text-right">
                        {ultimaVenda ? (
                          <span className="text-[10.5px] text-slate-400 tabular-nums">
                            {ultimaVenda.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-700">—</span>
                        )}
                      </td>

                      {/* Vendas 30d */}
                      <td className="px-3 py-3 text-right tabular-nums">
                        {vendas30d > 0
                          ? <span className="text-slate-300 font-semibold">{vendas30d.toLocaleString('pt-BR')}</span>
                          : <span className="text-slate-700">0</span>
                        }
                      </td>

                      {/* Saques API */}
                      <td className="px-3 py-3 text-right tabular-nums">
                        {saques30d > 0
                          ? <span className="text-purple-400 font-semibold">{saques30d}</span>
                          : <span className="text-slate-700">0</span>
                        }
                      </td>

                      {/* Webhook */}
                      <td className="px-3 py-3 text-center">
                        {whAtv.length > 0 ? (
                          <span className="text-[10px] font-semibold text-blue-400">
                            {whAtv.length} ativo{whAtv.length > 1 ? 's' : ''}
                          </span>
                        ) : m.webhookEndpoints.length > 0 ? (
                          <span className="text-[10px] text-slate-500">Inativo</span>
                        ) : (
                          <span className="text-[10px] text-slate-700">—</span>
                        )}
                      </td>

                      {/* Última falha */}
                      <td className="px-3 py-3">
                        {ultimaFalha ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9.5px] font-semibold font-mono px-1.5 py-0.5 rounded ${
                              ultimaFalha.statusCode && ultimaFalha.statusCode >= 500
                                ? 'text-red-400 bg-red-500/10'
                                : 'text-amber-400 bg-amber-500/10'
                            }`}>
                              {ultimaFalha.statusCode ?? 'tmout'}
                            </span>
                            <code className="text-[9.5px] font-mono text-slate-500 truncate max-w-[100px]">
                              {ultimaFalha.event}
                            </code>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-700">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-center">
                        <MerchantManageDrawer
                          merchant={{ id: m.id, name: m.name, email: m.email, apiKey: m.apiKey }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Falhas recentes de webhook ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-white">Falhas recentes de webhook</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Entregas com <code className="font-mono text-slate-400">success = false</code> nas últimas 48 horas
              </p>
            </div>
            {falhasRecentes.length > 0 ? (
              <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full shrink-0">
                {falhasRecentes.length} falha{falhasRecentes.length !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                Sem falhas
              </span>
            )}
          </div>

          {falhasRecentes.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[12px] text-emerald-400 font-semibold">Nenhuma falha nas últimas 48h</p>
              <p className="text-[11px] text-slate-600 mt-1">Todas as entregas foram bem-sucedidas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px] min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-slate-900/40">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Seller</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Evento</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">URL / Erro</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">HTTP</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Tentativas</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Quando</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {falhasRecentes.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <a href={`/admin/clientes/${f.merchantId}`} className="text-slate-300 hover:text-white transition-colors font-medium">
                          {falhaMerchantNames[f.merchantId] ?? f.merchantId.slice(0, 12) + '…'}
                        </a>
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="text-[10.5px] font-mono text-amber-400">{f.event}</code>
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="text-[10.5px] font-mono text-slate-500 truncate">{f.url}</p>
                        {f.error && <p className="text-[9.5px] text-red-400/80 truncate mt-0.5">{f.error}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {f.statusCode ? (
                          <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded ${
                            f.statusCode >= 500 ? 'text-red-400 bg-red-500/10' :
                            f.statusCode >= 400 ? 'text-amber-400 bg-amber-500/10' :
                            'text-slate-400 bg-slate-700/40'
                          }`}>{f.statusCode}</span>
                        ) : (
                          <span className="text-[10px] text-red-400 font-mono">timeout</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-slate-500">{f.attempt}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[10.5px] text-slate-600">
                        {f.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <RetryWebhookButton deliveryId={f.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Endpoints de referência ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Endpoints da API v1</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Base URL: <code className="font-mono text-blue-300">https://api.masterpagamentos.com.br</code>
            </p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {([
              { method: 'POST', path: '/api/v1/sales',            desc: 'Registrar venda',            auth: 'body'   },
              { method: 'GET',  path: '/api/v1/balance',          desc: 'Consultar saldo',            auth: 'header' },
              { method: 'GET',  path: '/api/v1/transactions',     desc: 'Listar transações',          auth: 'header' },
              { method: 'GET',  path: '/api/v1/transactions/:id', desc: 'Consultar transação por ID', auth: 'header' },
              { method: 'POST', path: '/api/v1/withdrawals',      desc: 'Solicitar saque',            auth: 'header' },
              { method: 'GET',  path: '/api/v1/withdrawals',      desc: 'Listar saques',              auth: 'header' },
            ] as const).map((ep) => (
              <div key={ep.path} className="px-5 py-2.5 flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono shrink-0 ${
                  ep.method === 'GET' ? 'bg-blue-600/20 text-blue-400' : 'bg-emerald-600/20 text-emerald-400'
                }`}>{ep.method}</span>
                <code className="text-[12px] font-mono text-slate-300 flex-1">{ep.path}</code>
                <span className="text-[11.5px] text-slate-600 hidden sm:block">{ep.desc}</span>
                {ep.auth === 'body' && (
                  <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">apiKey no body</span>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
