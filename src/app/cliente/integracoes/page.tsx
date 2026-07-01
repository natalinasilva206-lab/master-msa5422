export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CopyButton } from './CopyButton'
import { GenerateKeyButton } from './GenerateKeyButton'

export default async function IntegracoesPage() {
  const session  = await getServerSession(authOptions)
  const userId   = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          merchant: {
            include: {
              webhookEndpoints: {
                where:   { active: true },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      })
    : null

  const merchant       = user?.merchant
  const merchantId     = merchant?.id ?? '—'
  const apiKey         = merchant?.apiKey ?? null
  const webhooks       = merchant?.webhookEndpoints ?? []
  const firstWebhook   = webhooks[0]
  const webhookSecret  = firstWebhook?.secret ?? null

  // Base URL real das rotas de API
  const baseUrl = 'https://api.masterpagamentos.com.br/api'

  const endpoints = [
    { method: 'POST', path: '/api/v1/sales',              desc: 'Registrar nova venda',                       auth: 'body' },
    { method: 'GET',  path: '/api/v1/balance',            desc: 'Consultar saldos (disponível, reservado, bloqueado)', auth: 'header' },
    { method: 'GET',  path: '/api/v1/transactions',       desc: 'Listar transações com paginação e filtros',   auth: 'header' },
    { method: 'GET',  path: '/api/v1/transactions/:id',   desc: 'Consultar transação por ID',                  auth: 'header' },
    { method: 'POST', path: '/api/v1/withdrawals',        desc: 'Solicitar saque via Pix',                    auth: 'header' },
    { method: 'GET',  path: '/api/v1/withdrawals',        desc: 'Listar histórico de saques',                 auth: 'header' },
  ]

  const methodColor: Record<string, string> = {
    GET:  'bg-blue-500/15 text-blue-400',
    POST: 'bg-emerald-500/15 text-emerald-400',
  }

  return (
    <div>
      <Topbar showNotifications
        title="Integrações / API"
        breadcrumb="Minha Conta"
        subtitle="Chaves de acesso e referência da API REST"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Credenciais */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-white">Credenciais de Acesso</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Utilize estas chaves para autenticar requisições à API</p>
            </div>
            <GenerateKeyButton hasKey={!!apiKey} />
          </div>
          <div className="divide-y divide-slate-800/40">

            {/* Merchant ID */}
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Merchant ID</p>
                <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{merchantId}</p>
                <p className="text-[10px] text-slate-700 mt-0.5">Identificador único da sua empresa — use em todas as requisições</p>
              </div>
              <CopyButton value={merchantId} />
            </div>

            {/* API Key */}
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">API Key (Live)</p>
                {apiKey ? (
                  <>
                    <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{apiKey}</p>
                    <p className="text-[10px] text-slate-700 mt-0.5">Chave para produção — nunca exponha em código front-end ou repositórios</p>
                  </>
                ) : (
                  <p className="text-[12px] text-amber-400 mt-1">Nenhuma API Key gerada. Clique em "Gerar API Key" para criar.</p>
                )}
              </div>
              {apiKey && <CopyButton value={apiKey} />}
            </div>

            {/* Webhook Secret */}
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Webhook Secret {webhooks.length > 1 && <span className="text-slate-600 normal-case font-normal">({webhooks.length} endpoints)</span>}
                </p>
                {webhookSecret ? (
                  <>
                    <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{webhookSecret}</p>
                    <p className="text-[10px] text-slate-700 mt-0.5">
                      Valide a assinatura HMAC-SHA256 do header <code className="font-mono text-slate-500">X-MasterPay-Signature</code> com este secret
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-slate-600 mt-1">
                    Configure um endpoint em{' '}
                    <a href="/cliente/minha-conta" className="text-blue-500 hover:underline">Minha Conta → Webhooks</a>
                  </p>
                )}
              </div>
              {webhookSecret && <CopyButton value={webhookSecret} />}
            </div>

          </div>
        </section>

        {/* Base URL */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Base URL</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-[12px] font-mono text-blue-300 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/40 truncate">
              {baseUrl}
            </code>
            <CopyButton value={baseUrl} />
          </div>
          <p className="text-[10.5px] text-slate-600 mt-2">
            Todos os endpoints usam o prefixo <code className="font-mono text-slate-400">/api/v1/</code>. O header <code className="font-mono text-slate-400">Authorization: Bearer</code> é obrigatório em todos exceto <code className="font-mono text-slate-400">POST /sales</code>.
          </p>
        </section>

        {/* Autenticação */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Autenticação</p>
          </div>
          <div className="px-5 py-4 space-y-4">

            {/* Header auth (maioria dos endpoints) */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Header Bearer — <span className="text-slate-400 normal-case font-normal">GET /balance, /transactions, /withdrawals</span>
              </p>
              <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 overflow-x-auto border border-slate-800/40 whitespace-pre-wrap">
{`curl "https://api.masterpagamentos.com.br/api/v1/balance?merchantId=${merchantId}" \\
  -H "Authorization: Bearer ${apiKey ?? '<SUA_API_KEY>'}" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>

            {/* Body auth (POST /sales) */}
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Body JSON — <span className="text-slate-400 normal-case font-normal">POST /sales</span>
              </p>
              <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 overflow-x-auto border border-slate-800/40 whitespace-pre-wrap">
{`curl -X POST "https://api.masterpagamentos.com.br/api/v1/sales" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchantId": "${merchantId}",
    "saleAmount": 150.00,
    "apiKey": "${apiKey ?? '<SUA_API_KEY>'}",
    "description": "Plano Mensal — Acesso Premium",
    "externalId": "ORD-2024-001"
  }'`}
              </pre>
            </div>

          </div>
        </section>

        {/* Payload de registro de venda */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">POST /api/v1/sales — campos aceitos</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { field: 'merchantId',  type: 'string',  req: true,  desc: 'Seu Merchant ID' },
              { field: 'saleAmount',  type: 'number',  req: true,  desc: 'Valor da venda em BRL (número positivo)' },
              { field: 'apiKey',      type: 'string',  req: true,  desc: 'Sua API Key (Live)' },
              { field: 'description', type: 'string',  req: false, desc: 'Descrição livre — exibida no extrato' },
              { field: 'externalId',  type: 'string',  req: false, desc: 'ID do pedido no seu sistema — para conciliação' },
            ].map((f) => (
              <div key={f.field} className="px-5 py-2.5 flex items-center gap-3 flex-wrap">
                <code className="text-[11.5px] font-mono text-slate-200 w-32 shrink-0">{f.field}</code>
                <code className="text-[10.5px] text-blue-400 font-mono">{f.type}</code>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${f.req ? 'bg-red-500/15 text-red-400' : 'bg-slate-700/40 text-slate-500'}`}>
                  {f.req ? 'obrigatório' : 'opcional'}
                </span>
                <span className="text-[12px] text-slate-500 flex-1">{f.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Endpoints */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Endpoints disponíveis</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {endpoints.map((ep) => (
              <div key={ep.path} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded font-mono ${methodColor[ep.method] ?? 'bg-slate-700/40 text-slate-400'}`}>
                  {ep.method}
                </span>
                <code className="text-[12px] font-mono text-slate-300 flex-1 min-w-0">{ep.path}</code>
                <span className="text-[11px] text-slate-600 hidden sm:block shrink-0">{ep.desc}</span>
                {ep.auth === 'body' && (
                  <span className="text-[10px] text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">apiKey no body</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Listagem de transações */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">GET /api/v1/transactions — filtros</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { param: 'merchantId', req: true,  desc: 'Seu Merchant ID' },
              { param: 'limit',      req: false, desc: 'Itens por página (default 20, máx 100)' },
              { param: 'offset',     req: false, desc: 'Deslocamento para paginação' },
              { param: 'type',       req: false, desc: 'Filtrar por tipo: VENDA | ESTORNO | REEMBOLSO' },
              { param: 'status',     req: false, desc: 'Filtrar por status: APROVADO | CANCELADO | PENDENTE' },
            ].map((p) => (
              <div key={p.param} className="px-5 py-2.5 flex items-center gap-3 flex-wrap">
                <code className="text-[11.5px] font-mono text-slate-200 w-28 shrink-0">{p.param}</code>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${p.req ? 'bg-red-500/15 text-red-400' : 'bg-slate-700/40 text-slate-500'}`}>
                  {p.req ? 'obrigatório' : 'opcional'}
                </span>
                <span className="text-[12px] text-slate-500 flex-1">{p.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Webhooks */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Eventos de Webhook</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Notificações assíncronas entregues no seu endpoint configurado</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { event: 'sale.created',        desc: 'Nova venda registrada via API',                    color: 'text-emerald-400 bg-emerald-500/10' },
              { event: 'reserve.released',    desc: 'Reserva de risco liberada para saldo disponível', color: 'text-purple-400 bg-purple-500/10' },
              { event: 'withdrawal.approved', desc: 'Saque aprovado e liberado',                       color: 'text-blue-400 bg-blue-500/10' },
              { event: 'withdrawal.denied',   desc: 'Saque negado pela equipe',                        color: 'text-red-400 bg-red-500/10' },
              { event: 'dispute.opened',      desc: 'Nova disputa ou chargeback aberto',               color: 'text-orange-400 bg-orange-500/10' },
              { event: 'dispute.updated',     desc: 'Status de disputa atualizado',                    color: 'text-amber-400 bg-amber-500/10' },
              { event: 'merchant.activated',  desc: 'Conta aprovada e ativada após KYC',              color: 'text-emerald-400 bg-emerald-500/10' },
              { event: 'merchant.blocked',    desc: 'Conta bloqueada por risco ou disputa',            color: 'text-red-400 bg-red-500/10' },
            ].map((e) => (
              <div key={e.event} className="px-5 py-2.5 flex items-center gap-3">
                <code className={`shrink-0 text-[11px] font-semibold font-mono px-2 py-0.5 rounded ${e.color}`}>{e.event}</code>
                <span className="text-[12px] text-slate-500">{e.desc}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3.5 border-t border-slate-800/60 bg-slate-800/20">
            <p className="text-[11px] text-slate-600">
              Valide cada entrega verificando o header{' '}
              <code className="font-mono text-slate-400">X-MasterPay-Signature</code>{' '}
              com HMAC-SHA256 usando seu Webhook Secret.
              Gerencie endpoints em{' '}
              <a href="/cliente/minha-conta" className="text-blue-400 hover:underline">Minha Conta → Webhooks</a>.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
