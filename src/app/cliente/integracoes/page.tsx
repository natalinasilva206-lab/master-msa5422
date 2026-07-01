export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CopyButton } from './CopyButton'

export default async function IntegracoesPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          merchant: {
            include: {
              webhookEndpoints: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1 },
            },
          },
        },
      })
    : null

  const merchant = user?.merchant
  const merchantId = merchant?.id ?? '—'
  const apiKey = (merchant as any)?.apiKey ?? '—'
  const firstWebhook = merchant?.webhookEndpoints?.[0]
  const webhookSecret = firstWebhook?.secret ?? null

  const endpoints = [
    { method: 'POST', path: '/api/v1/sales',               desc: 'Registrar nova venda' },
    { method: 'GET',  path: '/api/v1/transactions/:id',    desc: 'Consultar transação por ID' },
    { method: 'GET',  path: '/api/v1/balance',             desc: 'Consultar saldos (disponível, reservado, bloqueado)' },
    { method: 'POST', path: '/api/v1/withdrawals',         desc: 'Solicitar saque via PIX' },
    { method: 'GET',  path: '/api/v1/withdrawals',         desc: 'Listar histórico de saques' },
  ]

  const methodColor: Record<string, string> = {
    GET:  'bg-blue-500/15 text-blue-400',
    POST: 'bg-emerald-500/15 text-emerald-400',
    PUT:  'bg-amber-500/15 text-amber-400',
    DELETE: 'bg-red-500/15 text-red-400',
  }

  return (
    <div>
      <Topbar showNotifications
        title="Integrações / API"
        breadcrumb="Minha Conta"
        subtitle="Chaves de acesso e referência da API REST"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Credentials */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Credenciais de Acesso</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Utilize estas chaves para autenticar requisições à API</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { label: 'Merchant ID',     value: merchantId,    hint: 'Identificador único da sua empresa' },
              { label: 'API Key (Live)',   value: apiKey,        hint: 'Chave para produção — mantenha em segredo' },
              { label: 'Webhook Secret',  value: webhookSecret ?? '—', hint: webhookSecret ? 'Secret do seu primeiro endpoint ativo — valide a assinatura HMAC-SHA256' : null },
            ].map((row) => (
              <div key={row.label} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{row.label}</p>
                  <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{row.value}</p>
                  {row.hint
                    ? <p className="text-[10px] text-slate-700 mt-0.5">{row.hint}</p>
                    : row.label === 'Webhook Secret' && (
                      <p className="text-[10px] text-slate-700 mt-0.5">
                        Configure um endpoint em{' '}
                        <a href="/cliente/minha-conta" className="text-blue-500 hover:underline">Minha Conta → Webhooks</a>
                        {' '}para obter o secret
                      </p>
                    )
                  }
                </div>
                <CopyButton value={row.value} />
              </div>
            ))}
          </div>
        </section>

        {/* Base URL */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Base URL</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-[12px] font-mono text-blue-300 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/40 truncate">
              https://api.masterpagamentos.com.br
            </code>
            <CopyButton value="https://api.masterpagamentos.com.br" />
          </div>
        </section>

        {/* Authentication example */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Autenticação</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Passe sua API Key no header de cada requisição</p>
          </div>
          <div className="px-5 py-4">
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 overflow-x-auto border border-slate-800/40">
{`curl -X GET https://api.masterpagamentos.com.br/api/v1/balance?merchantId=${merchantId} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>
        </section>

        {/* Payload example */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Exemplo de Payload — Registrar Venda</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Corpo JSON para <code className="font-mono text-emerald-400">POST /api/v1/sales</code></p>
          </div>
          <div className="px-5 py-4">
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 overflow-x-auto border border-slate-800/40">
{`{
  "merchantId": "${merchantId}",
  "amount": 150.00,
  "currency": "BRL",
  "paymentMethod": "credit_card",
  "description": "Plano Mensal — Acesso Premium",
  "customer": {
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "document": "123.456.789-00"
  },
  "metadata": {
    "orderId": "ORD-2024-001",
    "productId": "prod_abc123"
  }
}`}
            </pre>
            <p className="text-[10.5px] text-slate-600 mt-2.5">
              Campos obrigatórios: <code className="font-mono text-slate-400">merchantId</code>, <code className="font-mono text-slate-400">amount</code>, <code className="font-mono text-slate-400">paymentMethod</code>. O campo <code className="font-mono text-slate-400">metadata</code> é livre para rastreamento interno.
            </p>
          </div>
        </section>

        {/* Endpoints */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Endpoints disponíveis</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {endpoints.map((ep) => (
              <div key={ep.path} className="px-5 py-3 flex items-center gap-3">
                <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded font-mono ${methodColor[ep.method] ?? 'bg-slate-700/40 text-slate-400'}`}>
                  {ep.method}
                </span>
                <code className="text-[12px] font-mono text-slate-300 flex-1">{ep.path}</code>
                <span className="text-[12px] text-slate-600 hidden sm:block">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Webhook events */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Eventos de Webhook</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Configure quais eventos seu endpoint receberá em tempo real</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { event: 'sale.created',         desc: 'Nova venda registrada via API',                  color: 'text-emerald-400 bg-emerald-500/10' },
              { event: 'withdrawal.approved',  desc: 'Saque aprovado e liberado para o seller',        color: 'text-blue-400 bg-blue-500/10' },
              { event: 'withdrawal.denied',    desc: 'Saque negado pela equipe',                       color: 'text-red-400 bg-red-500/10' },
              { event: 'dispute.opened',       desc: 'Nova disputa ou chargeback aberto',              color: 'text-orange-400 bg-orange-500/10' },
              { event: 'dispute.updated',      desc: 'Status de disputa atualizado',                   color: 'text-amber-400 bg-amber-500/10' },
              { event: 'merchant.activated',   desc: 'Conta aprovada e ativada após KYC',             color: 'text-emerald-400 bg-emerald-500/10' },
              { event: 'merchant.blocked',     desc: 'Conta bloqueada por risco ou disputa',           color: 'text-red-400 bg-red-500/10' },
              { event: 'reserve.released',     desc: 'Reserva de risco liberada para saldo disponível', color: 'text-purple-400 bg-purple-500/10' },
            ].map((e) => (
              <div key={e.event} className="px-5 py-2.5 flex items-center gap-3">
                <code className={`shrink-0 text-[11px] font-semibold font-mono px-2 py-0.5 rounded ${e.color}`}>{e.event}</code>
                <span className="text-[12px] text-slate-500">{e.desc}</span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3.5 border-t border-slate-800/60 bg-slate-800/20">
            <p className="text-[11px] text-slate-600">
              Use o <span className="text-slate-400 font-mono">Webhook Secret</span> para validar a assinatura <span className="text-slate-400">X-MasterPay-Signature</span> com HMAC-SHA256. Gerencie seus endpoints em <a href="/cliente/minha-conta" className="text-blue-400 hover:underline">Minha Conta → Webhooks</a>.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
