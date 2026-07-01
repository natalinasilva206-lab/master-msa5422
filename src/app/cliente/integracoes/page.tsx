export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CopyButton } from './CopyButton'
import { GenerateKeyButton } from './GenerateKeyButton'

export default async function IntegracoesPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

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

  const merchant      = user?.merchant
  const merchantId    = merchant?.id ?? '—'
  const apiKey        = merchant?.apiKey ?? null
  const webhooks      = merchant?.webhookEndpoints ?? []
  const firstWebhook  = webhooks[0]
  const webhookSecret = firstWebhook?.secret ?? null

  // Última venda registrada (indica que a integração está ativa)
  const ultimaVenda = merchant
    ? await prisma.saleLog.findFirst({
        where:   { merchantId: merchant.id, type: 'VENDA', status: 'APROVADO' },
        orderBy: { createdAt: 'desc' },
        select:  { createdAt: true, externalId: true },
      })
    : null

  const baseUrl = 'https://api.masterpagamentos.com.br/api'
  const keyPlaceholder = apiKey ?? '<SUA_API_KEY>'
  const idPlaceholder  = merchantId === '—' ? '<SEU_MERCHANT_ID>' : merchantId

  return (
    <div>
      <Topbar showNotifications
        title="Integrações / API"
        breadcrumb="Minha Conta"
        subtitle="Credenciais e documentação completa da API REST v1"
      />

      <div className="p-4 xl:p-6 space-y-5">

        {/* ── CREDENCIAIS ─────────────────────────────────────────── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[13px] font-semibold text-white">Credenciais de Acesso</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Chaves para autenticar requisições à API</p>
            </div>
            <GenerateKeyButton hasKey={!!apiKey} />
          </div>
          <div className="divide-y divide-slate-800/40">

            {/* Merchant ID */}
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Merchant ID</p>
                <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{merchantId}</p>
                <p className="text-[10px] text-slate-700 mt-0.5">Identificador único da sua empresa — obrigatório em todas as requisições</p>
              </div>
              <CopyButton value={merchantId} />
            </div>

            {/* API Key */}
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">API Key (Live)</p>
                  {apiKey && (
                    <span className="text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Ativa</span>
                  )}
                </div>
                {apiKey ? (
                  <>
                    <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{apiKey}</p>
                    <p className="text-[10px] text-amber-500/80 mt-1">
                      ⚠ Nunca exponha esta chave em código front-end, apps mobile ou repositórios públicos.
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-amber-400 mt-1">Nenhuma chave gerada. Clique em "Gerar API Key" para criar.</p>
                )}
              </div>
              {apiKey && <CopyButton value={apiKey} />}
            </div>

            {/* Webhook Secret */}
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Webhook Secret
                  {webhooks.length > 1 && <span className="text-slate-600 normal-case font-normal ml-1">({webhooks.length} endpoints)</span>}
                </p>
                {webhookSecret ? (
                  <>
                    <p className="text-[12px] text-slate-300 font-mono mt-1 truncate">{webhookSecret}</p>
                    <p className="text-[10px] text-slate-700 mt-0.5">
                      Valide o header <code className="font-mono text-slate-500">X-MasterPay-Signature</code> com HMAC-SHA256
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-slate-600 mt-1">
                    Configure em{' '}
                    <a href="/cliente/minha-conta" className="text-blue-500 hover:underline">Minha Conta → Webhooks</a>
                  </p>
                )}
              </div>
              {webhookSecret && <CopyButton value={webhookSecret} />}
            </div>

          </div>

          {/* Status da integração */}
          <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-800/20 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ultimaVenda ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-[11px] text-slate-500">
                {ultimaVenda
                  ? <>Última venda via API: <span className="text-slate-300">{ultimaVenda.createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>{ultimaVenda.externalId ? <> · ID externo <code className="font-mono text-slate-400">{ultimaVenda.externalId}</code></> : ''}</>
                  : 'Nenhuma venda registrada ainda'
                }
              </span>
            </div>
            {apiKey && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[11px] text-slate-500">API Key configurada</span>
              </div>
            )}
          </div>
        </section>

        {/* ── BASE URL ────────────────────────────────────────────── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Base URL</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-[12px] font-mono text-blue-300 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/40 truncate">
              {baseUrl}
            </code>
            <CopyButton value={baseUrl} />
          </div>
          <p className="text-[10.5px] text-slate-600 mt-2">
            Todos os endpoints usam o prefixo <code className="font-mono text-slate-400">/v1/</code>.
            Autenticação via <code className="font-mono text-slate-400">Authorization: Bearer &lt;apiKey&gt;</code> exceto em{' '}
            <code className="font-mono text-slate-400">POST /v1/sales</code>, que recebe a chave no body.
          </p>
        </section>

        {/* ── ENDPOINTS ───────────────────────────────────────────── */}

        {/* POST /sales */}
        <EndpointCard
          method="POST" path="/v1/sales" auth="body"
          description="Registra uma nova venda e credita o valor no saldo do merchant, descontando a reserva de risco configurada."
        >
          <FieldTable title="Campos do body (JSON)" fields={[
            { name: 'merchantId',  type: 'string', req: true,  desc: 'Seu Merchant ID' },
            { name: 'saleAmount',  type: 'number', req: true,  desc: 'Valor da venda em BRL — número positivo (ex: 150.00)' },
            { name: 'apiKey',      type: 'string', req: true,  desc: 'Sua API Key (Live)' },
            { name: 'description', type: 'string', req: false, desc: 'Descrição livre — exibida no extrato' },
            { name: 'externalId',  type: 'string', req: false, desc: 'ID do pedido no seu sistema — para conciliação' },
          ]} />

          <CodeBlock label="Exemplo de request">{
`curl -X POST "${baseUrl}/v1/sales" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchantId": "${idPlaceholder}",
    "saleAmount": 150.00,
    "apiKey": "${keyPlaceholder}",
    "description": "Plano Mensal — Acesso Premium",
    "externalId": "ORD-2024-001"
  }'`
          }</CodeBlock>

          <CodeBlock label="Response 200 — sucesso">{
`{
  "ok": true,
  "saleLogId": "clx1abc...",
  "valorVenda": 150.00,
  "valorReserva": 22.50,
  "valorDisponivel": 127.50,
  "reservePercent": 15,
  "releaseDays": 30,
  "releaseAt": "2024-08-01",
  "reserveReleaseId": "clx2def..."
}`
          }</CodeBlock>

          <ErrorTable errors={[
            { code: 400, desc: 'merchantId ou saleAmount ausente / inválido' },
            { code: 401, desc: 'apiKey ausente ou incorreta' },
            { code: 403, desc: 'Merchant inativo ou bloqueado' },
            { code: 404, desc: 'Merchant não encontrado' },
            { code: 500, desc: 'Erro interno — tente novamente' },
          ]} />
        </EndpointCard>

        {/* GET /balance */}
        <EndpointCard
          method="GET" path="/v1/balance" auth="header"
          description="Retorna os cinco tipos de saldo do merchant: disponível para saque, em reserva de risco, bloqueado por disputa, futuro (a liberar) e investido em CDI."
        >
          <FieldTable title="Query params" fields={[
            { name: 'merchantId', type: 'string', req: true, desc: 'Seu Merchant ID' },
          ]} />

          <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/balance?merchantId=${idPlaceholder}" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
          }</CodeBlock>

          <CodeBlock label="Response 200 — sucesso">{
`{
  "merchantId": "${idPlaceholder}",
  "balance": {
    "available": 1280.50,
    "reserved":   450.00,
    "blocked":      0.00,
    "future":     225.00,
    "cdi":        320.80
  }
}`
          }</CodeBlock>

          <div className="mt-3 space-y-1">
            {[
              { campo: 'available', desc: 'Saldo livre para saque imediato (pendingBalance)' },
              { campo: 'reserved',  desc: 'Retido pela reserva de risco — liberado após o prazo' },
              { campo: 'blocked',   desc: 'Bloqueado por disputa ou chargeback em aberto' },
              { campo: 'future',    desc: 'Vendas aprovadas ainda dentro do prazo de reserva' },
              { campo: 'cdi',       desc: 'Investido em CDI (conta rendimento)' },
            ].map((f) => (
              <div key={f.campo} className="flex gap-2 text-[11px]">
                <code className="text-blue-400 font-mono w-20 shrink-0">{f.campo}</code>
                <span className="text-slate-500">{f.desc}</span>
              </div>
            ))}
          </div>

          <ErrorTable errors={[
            { code: 400, desc: 'merchantId ausente' },
            { code: 401, desc: 'API Key ausente ou incorreta' },
            { code: 403, desc: 'Merchant inativo ou bloqueado' },
            { code: 404, desc: 'Merchant não encontrado' },
          ]} />
        </EndpointCard>

        {/* GET /transactions */}
        <EndpointCard
          method="GET" path="/v1/transactions" auth="header"
          description="Lista transações do merchant com paginação e filtros por tipo e status."
        >
          <FieldTable title="Query params" fields={[
            { name: 'merchantId', type: 'string', req: true,  desc: 'Seu Merchant ID' },
            { name: 'limit',      type: 'number', req: false, desc: 'Itens por página (padrão: 20, máx: 100)' },
            { name: 'offset',     type: 'number', req: false, desc: 'Deslocamento para paginação (padrão: 0)' },
            { name: 'type',       type: 'string', req: false, desc: 'Filtrar por tipo: VENDA | ESTORNO | REEMBOLSO' },
            { name: 'status',     type: 'string', req: false, desc: 'Filtrar por status: APROVADO | CANCELADO | PENDENTE' },
          ]} />

          <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/transactions?merchantId=${idPlaceholder}&limit=5&type=VENDA" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
          }</CodeBlock>

          <CodeBlock label="Response 200 — sucesso">{
`{
  "data": [
    {
      "id": "clx1abc...",
      "amount": 150.00,
      "type": "VENDA",
      "status": "APROVADO",
      "description": "Plano Mensal",
      "externalId": "ORD-2024-001",
      "createdAt": "2024-07-01T14:32:00.000Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 5,
    "offset": 0,
    "hasMore": true
  }
}`
          }</CodeBlock>

          <ErrorTable errors={[
            { code: 400, desc: 'merchantId ausente' },
            { code: 401, desc: 'API Key ausente ou incorreta' },
            { code: 403, desc: 'Merchant inativo ou bloqueado' },
          ]} />
        </EndpointCard>

        {/* GET /transactions/:id */}
        <EndpointCard
          method="GET" path="/v1/transactions/:id" auth="header"
          description="Retorna os detalhes de uma transação específica pelo seu ID interno."
        >
          <FieldTable title="Path param" fields={[
            { name: ':id', type: 'string', req: true, desc: 'ID interno da transação (campo id retornado pela listagem)' },
          ]} />
          <FieldTable title="Query params" fields={[
            { name: 'merchantId', type: 'string', req: true, desc: 'Seu Merchant ID — obrigatório para validar ownership' },
          ]} />

          <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/transactions/clx1abc...?merchantId=${idPlaceholder}" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
          }</CodeBlock>

          <CodeBlock label="Response 200 — sucesso">{
`{
  "id": "clx1abc...",
  "amount": 150.00,
  "type": "VENDA",
  "status": "APROVADO",
  "description": "Plano Mensal",
  "externalId": "ORD-2024-001",
  "createdAt": "2024-07-01T14:32:00.000Z"
}`
          }</CodeBlock>

          <ErrorTable errors={[
            { code: 400, desc: 'merchantId ausente' },
            { code: 401, desc: 'API Key ausente ou incorreta' },
            { code: 404, desc: 'Transação não encontrada ou pertence a outro merchant' },
          ]} />
        </EndpointCard>

        {/* POST /withdrawals */}
        <EndpointCard
          method="POST" path="/v1/withdrawals" auth="header"
          description="Solicita um saque via Pix. O valor é debitado imediatamente do saldo disponível e a solicitação fica pendente de aprovação pela equipe."
        >
          <FieldTable title="Campos do body (JSON)" fields={[
            { name: 'merchantId',  type: 'string', req: true, desc: 'Seu Merchant ID' },
            { name: 'amount',      type: 'number', req: true, desc: 'Valor a sacar em BRL — deve ser ≤ saldo disponível' },
            { name: 'pixKey',      type: 'string', req: true, desc: 'Chave Pix de destino' },
            { name: 'pixKeyType',  type: 'string', req: true, desc: 'Tipo da chave: CPF | CNPJ | EMAIL | TELEFONE | ALEATORIA' },
          ]} />

          <CodeBlock label="Exemplo de request">{
`curl -X POST "${baseUrl}/v1/withdrawals" \\
  -H "Authorization: Bearer ${keyPlaceholder}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchantId": "${idPlaceholder}",
    "amount": 500.00,
    "pixKey": "empresa@email.com",
    "pixKeyType": "EMAIL"
  }'`
          }</CodeBlock>

          <CodeBlock label="Response 201 — solicitação criada">{
`{
  "ok": true,
  "withdrawalId": "clx9xyz...",
  "amount": 500.00,
  "pixKey": "empresa@email.com",
  "pixKeyType": "EMAIL",
  "status": "PENDENTE"
}`
          }</CodeBlock>

          <ErrorTable errors={[
            { code: 400, desc: 'merchantId, amount, pixKey ou pixKeyType ausente / inválido' },
            { code: 401, desc: 'API Key ausente ou incorreta' },
            { code: 403, desc: 'Merchant inativo ou bloqueado' },
            { code: 422, desc: 'Saldo insuficiente — resposta inclui o disponível atual' },
          ]} />
        </EndpointCard>

        {/* GET /withdrawals */}
        <EndpointCard
          method="GET" path="/v1/withdrawals" auth="header"
          description="Lista o histórico de solicitações de saque com status de cada uma."
        >
          <FieldTable title="Query params" fields={[
            { name: 'merchantId', type: 'string', req: true,  desc: 'Seu Merchant ID' },
            { name: 'limit',      type: 'number', req: false, desc: 'Itens por página (padrão: 20, máx: 100)' },
            { name: 'offset',     type: 'number', req: false, desc: 'Deslocamento para paginação' },
          ]} />

          <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/withdrawals?merchantId=${idPlaceholder}&limit=10" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
          }</CodeBlock>

          <CodeBlock label="Response 200 — sucesso">{
`{
  "data": [
    {
      "id": "clx9xyz...",
      "action": "WITHDRAW_REQUEST",
      "amount": 500.00,
      "pixKey": "empresa@email.com",
      "pixKeyType": "EMAIL",
      "status": "PENDENTE",
      "createdAt": "2024-07-01T10:00:00.000Z"
    }
  ],
  "limit": 10,
  "offset": 0,
  "count": 1
}`
          }</CodeBlock>

          <div className="mt-3 space-y-1">
            {[
              { val: 'PENDENTE',  desc: 'Aguardando aprovação da equipe' },
              { val: 'APROVADO',  desc: 'Aprovado e transferido via Pix' },
              { val: 'NEGADO',    desc: 'Recusado pela equipe (ver motivo no painel)' },
            ].map((s) => (
              <div key={s.val} className="flex gap-2 text-[11px]">
                <code className={`font-mono w-20 shrink-0 ${
                  s.val === 'APROVADO' ? 'text-emerald-400' :
                  s.val === 'NEGADO'   ? 'text-red-400'     : 'text-amber-400'
                }`}>{s.val}</code>
                <span className="text-slate-500">{s.desc}</span>
              </div>
            ))}
          </div>

          <ErrorTable errors={[
            { code: 400, desc: 'merchantId ausente' },
            { code: 401, desc: 'API Key ausente ou incorreta' },
          ]} />
        </EndpointCard>

        {/* ── ERROS PADRÃO ────────────────────────────────────────── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Erros — formato padrão</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Todos os erros retornam JSON com um campo <code className="font-mono text-slate-400">error</code></p>
          </div>
          <div className="px-5 py-4">
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 border border-slate-800/40">
{`// HTTP 4xx ou 5xx
{ "error": "Descrição do erro em português" }

// Exemplos:
// 401  { "error": "Não autorizado." }
// 422  { "error": "Saldo insuficiente. Disponível: R$ 127,50." }
// 500  { "error": "Erro interno." }`}
            </pre>
          </div>
        </section>

        {/* ── WEBHOOKS ────────────────────────────────────────────── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Webhooks — eventos e exemplos de payload</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Notificações entregues via <code className="font-mono text-slate-400">POST</code> no seu endpoint. Gerencie em{' '}
              <a href="/cliente/minha-conta" className="text-blue-400 hover:underline">Minha Conta → Webhooks</a>.
            </p>
          </div>

          {/* Envelope + validação */}
          <div className="px-5 py-4 border-b border-slate-800/40 space-y-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Envelope padrão (todos os eventos)</p>
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 border border-slate-800/40 overflow-x-auto">
{`// Headers recebidos:
X-MasterPay-Event:     payment.approved
X-MasterPay-Signature: a3f9c1... (HMAC-SHA256)

// Body JSON:
{
  "event":     "payment.approved",
  "timestamp": "2024-07-01T14:32:00.000Z",
  "data":      { /* veja cada evento abaixo */ }
}`}
            </pre>
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 border border-slate-800/40 overflow-x-auto">
{`// Validação da assinatura (Node.js):
const crypto = require('crypto')

function isValid(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)          // string bruta — antes do JSON.parse
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}`}
            </pre>
          </div>

          {/* Eventos com payload */}
          <div className="divide-y divide-slate-800/40">

            <WebhookEventDoc
              event="payment.approved"
              color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              when="Venda registrada com sucesso via POST /v1/sales."
              payload={`{
  "saleLogId":   "clx1abc...",
  "amount":      150.00,
  "description": "Plano Mensal",
  "externalId":  "ORD-2024-001"
}`}
              fields={[
                { name: 'saleLogId',   desc: 'ID interno da transação' },
                { name: 'amount',      desc: 'Valor bruto da venda em BRL' },
                { name: 'description', desc: 'Descrição informada na requisição (pode ser null)' },
                { name: 'externalId',  desc: 'ID externo do pedido (pode ser null)' },
              ]}
            />

            <WebhookEventDoc
              event="payment.refused"
              color="text-red-400 bg-red-500/10 border-red-500/20"
              when="Tentativa de venda recusada pelo processador de pagamento."
              payload={`{
  "amount":  150.00,
  "reason":  "insufficient_funds",
  "externalId": "ORD-2024-002"
}`}
              fields={[
                { name: 'amount',     desc: 'Valor tentado em BRL' },
                { name: 'reason',     desc: 'Código de recusa do processador' },
                { name: 'externalId', desc: 'ID externo informado na requisição (pode ser null)' },
              ]}
            />

            <WebhookEventDoc
              event="refund.created"
              color="text-amber-400 bg-amber-500/10 border-amber-500/20"
              when="Reembolso ou estorno aprovado pelo time operacional."
              payload={`{
  "saleLogId": "clx1abc...",
  "amount":    150.00,
  "type":      "REEMBOLSO",
  "reason":    "Solicitação do cliente"
}`}
              fields={[
                { name: 'saleLogId', desc: 'ID da transação original reembolsada' },
                { name: 'amount',    desc: 'Valor reembolsado em BRL' },
                { name: 'type',      desc: 'REEMBOLSO ou ESTORNO' },
                { name: 'reason',    desc: 'Motivo informado pelo time (pode ser null)' },
              ]}
            />

            <WebhookEventDoc
              event="chargeback.opened"
              color="text-orange-400 bg-orange-500/10 border-orange-500/20"
              when="Chargeback aberto pelo time operacional (disputa bancária)."
              payload={`{
  "disputeId":        "cly9abc...",
  "type":             "CHARGEBACK",
  "contestedAmount":  150.00
}`}
              fields={[
                { name: 'disputeId',       desc: 'ID interno da disputa' },
                { name: 'type',            desc: 'Sempre CHARGEBACK' },
                { name: 'contestedAmount', desc: 'Valor contestado em BRL' },
              ]}
            />

            <WebhookEventDoc
              event="med.opened"
              color="text-orange-400 bg-orange-500/10 border-orange-500/20"
              when="MED Pix aberto pelo time operacional (mecanismo especial de devolução)."
              payload={`{
  "disputeId":        "cly9def...",
  "type":             "MED_PIX",
  "contestedAmount":  75.00
}`}
              fields={[
                { name: 'disputeId',       desc: 'ID interno da disputa' },
                { name: 'type',            desc: 'Sempre MED_PIX' },
                { name: 'contestedAmount', desc: 'Valor contestado em BRL' },
              ]}
            />

            <WebhookEventDoc
              event="dispute.updated"
              color="text-amber-400 bg-amber-500/10 border-amber-500/20"
              when="Status de uma disputa existente é atualizado (resolvida, perdida, etc.)."
              payload={`{
  "disputeId": "cly9abc...",
  "newStatus": "RESOLVIDO"
}`}
              fields={[
                { name: 'disputeId', desc: 'ID interno da disputa atualizada' },
                { name: 'newStatus', desc: 'Novo status: ABERTO | RESOLVIDO | PERDIDO | CANCELADO' },
              ]}
            />

            <WebhookEventDoc
              event="balance.updated"
              color="text-blue-400 bg-blue-500/10 border-blue-500/20"
              when="Saldo do merchant é alterado (crédito de venda, liberação de reserva, débito de saque, etc.)."
              payload={`{
  "available": 1280.50,
  "reserved":   450.00,
  "blocked":      0.00,
  "reason":    "sale_credited"
}`}
              fields={[
                { name: 'available', desc: 'Novo saldo disponível após a alteração' },
                { name: 'reserved',  desc: 'Saldo em reserva de risco' },
                { name: 'blocked',   desc: 'Saldo bloqueado por disputa' },
                { name: 'reason',    desc: 'Motivo: sale_credited | reserve_released | withdrawal_deducted | chargeback_blocked' },
              ]}
            />

            <WebhookEventDoc
              event="withdrawal.created"
              color="text-blue-400 bg-blue-500/10 border-blue-500/20"
              when="Saque solicitado via POST /v1/withdrawals. Ainda pendente de aprovação."
              payload={`{
  "withdrawalId": "clx9xyz...",
  "amount":       500.00,
  "pixKey":       "empresa@email.com",
  "pixKeyType":   "EMAIL"
}`}
              fields={[
                { name: 'withdrawalId', desc: 'ID interno da solicitação de saque' },
                { name: 'amount',       desc: 'Valor solicitado em BRL' },
                { name: 'pixKey',       desc: 'Chave Pix de destino' },
                { name: 'pixKeyType',   desc: 'CPF | CNPJ | EMAIL | TELEFONE | ALEATORIA' },
              ]}
            />

            <WebhookEventDoc
              event="withdrawal.paid"
              color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              when="Saque aprovado e transferido via Pix pelo time operacional."
              payload={`{
  "merchantId":    "${idPlaceholder}",
  "amount":        500.00,
  "requestLogId":  "clx9xyz..."
}`}
              fields={[
                { name: 'merchantId',   desc: 'ID do merchant beneficiário' },
                { name: 'amount',       desc: 'Valor pago em BRL' },
                { name: 'requestLogId', desc: 'ID do registro de solicitação original' },
              ]}
            />

            <WebhookEventDoc
              event="withdrawal.rejected"
              color="text-red-400 bg-red-500/10 border-red-500/20"
              when="Saque rejeitado pelo time operacional. O valor é devolvido ao saldo disponível."
              payload={`{
  "merchantId":    "${idPlaceholder}",
  "amount":        500.00,
  "requestLogId":  "clx9xyz..."
}`}
              fields={[
                { name: 'merchantId',   desc: 'ID do merchant' },
                { name: 'amount',       desc: 'Valor devolvido ao saldo em BRL' },
                { name: 'requestLogId', desc: 'ID do registro de solicitação original' },
              ]}
            />

            <WebhookEventDoc
              event="reserve.released"
              color="text-purple-400 bg-purple-500/10 border-purple-500/20"
              when="Reserva de risco de uma venda é liberada para o saldo disponível ao atingir o prazo."
              payload={`{
  "merchantId":    "${idPlaceholder}",
  "amount":         22.50,
  "saleLogId":     "clx1abc...",
  "releasedAt":    "2024-08-01T03:00:00.000Z"
}`}
              fields={[
                { name: 'merchantId', desc: 'ID do merchant' },
                { name: 'amount',     desc: 'Valor liberado em BRL' },
                { name: 'saleLogId',  desc: 'ID da venda original que gerou a reserva' },
                { name: 'releasedAt', desc: 'Data e hora ISO da liberação' },
              ]}
            />

            <WebhookEventDoc
              event="cdi.credited"
              color="text-purple-400 bg-purple-500/10 border-purple-500/20"
              when="Rendimento CDI creditado mensalmente no saldo investido."
              payload={`{
  "sellerId":      "${idPlaceholder}",
  "amount":         12.80,
  "baseBalance":   320.00,
  "cdiRate":        0.04,
  "creditedAt":    "2024-07-01T03:00:00.000Z",
  "newCdiBalance": 332.80
}`}
              fields={[
                { name: 'sellerId',      desc: 'ID do merchant beneficiário' },
                { name: 'amount',        desc: 'Rendimento creditado em BRL' },
                { name: 'baseBalance',   desc: 'Saldo base sobre o qual o CDI foi calculado' },
                { name: 'cdiRate',       desc: 'Taxa CDI aplicada no ciclo' },
                { name: 'creditedAt',    desc: 'Data e hora ISO do crédito' },
                { name: 'newCdiBalance', desc: 'Novo saldo CDI após o crédito' },
              ]}
            />

            <WebhookEventDoc
              event="merchant.activated"
              color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              when="Conta aprovada e ativada após revisão de KYC."
              payload={`{
  "merchantId": "${idPlaceholder}",
  "newStatus":  "ACTIVE"
}`}
              fields={[
                { name: 'merchantId', desc: 'ID do merchant ativado' },
                { name: 'newStatus',  desc: 'Sempre ACTIVE' },
              ]}
            />

            <WebhookEventDoc
              event="merchant.blocked"
              color="text-red-400 bg-red-500/10 border-red-500/20"
              when="Conta bloqueada por risco, disputa ou decisão operacional."
              payload={`{
  "merchantId": "${idPlaceholder}",
  "newStatus":  "BLOCKED"
}`}
              fields={[
                { name: 'merchantId', desc: 'ID do merchant bloqueado' },
                { name: 'newStatus',  desc: 'Sempre BLOCKED' },
              ]}
            />

          </div>
        </section>

      </div>
    </div>
  )
}

/* ── Componentes internos (Server-safe, sem estado) ────────────── */

function EndpointCard({
  method, path, auth, description, children,
}: {
  method: 'GET' | 'POST'
  path: string
  auth: 'header' | 'body'
  description: string
  children: React.ReactNode
}) {
  const methodColor = method === 'GET'
    ? 'bg-blue-500/15 text-blue-400 border-blue-500/20'
    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'

  return (
    <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`text-[11px] font-semibold font-mono px-2.5 py-1 rounded border ${methodColor}`}>{method}</span>
          <code className="text-[13px] font-mono text-slate-200">/api{path}</code>
          {auth === 'body' && (
            <span className="text-[10px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded ml-1">apiKey no body</span>
          )}
          {auth === 'header' && (
            <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded ml-1">Bearer token</span>
          )}
        </div>
        <p className="text-[11.5px] text-slate-500 mt-2">{description}</p>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </section>
  )
}

function FieldTable({ title, fields }: {
  title: string
  fields: { name: string; type: string; req: boolean; desc: string }[]
}) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider mb-2">{title}</p>
      <div className="rounded-lg border border-slate-800/60 overflow-hidden divide-y divide-slate-800/40">
        {fields.map((f) => (
          <div key={f.name} className="flex items-center gap-3 px-3 py-2 flex-wrap">
            <code className="text-[11.5px] font-mono text-slate-200 w-28 shrink-0">{f.name}</code>
            <code className="text-[10px] font-mono text-blue-400 w-14 shrink-0">{f.type}</code>
            <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
              f.req ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-700/30 text-slate-500 border border-slate-700/30'
            }`}>{f.req ? 'obrigatório' : 'opcional'}</span>
            <span className="text-[11px] text-slate-500 flex-1">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CodeBlock({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider mb-2">{label}</p>
      <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 overflow-x-auto border border-slate-800/40 whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  )
}

function ErrorTable({ errors }: { errors: { code: number; desc: string }[] }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Erros possíveis</p>
      <div className="space-y-1">
        {errors.map((e) => (
          <div key={e.code} className="flex items-center gap-3 text-[11px]">
            <code className={`font-mono font-semibold w-10 shrink-0 ${
              e.code >= 500 ? 'text-red-400' : e.code >= 400 ? 'text-amber-400' : 'text-emerald-400'
            }`}>{e.code}</code>
            <span className="text-slate-500">{e.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WebhookEventDoc({
  event, color, when, payload, fields,
}: {
  event: string
  color: string
  when: string
  payload: string
  fields: { name: string; desc: string }[]
}) {
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <code className={`shrink-0 text-[11px] font-semibold font-mono px-2.5 py-1 rounded border ${color}`}>{event}</code>
        <p className="text-[11.5px] text-slate-500 flex-1">{when}</p>
      </div>
      <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-3.5 overflow-x-auto border border-slate-800/40 leading-relaxed">
        {`// data:\n${payload}`}
      </pre>
      <div className="space-y-1">
        {fields.map((f) => (
          <div key={f.name} className="flex gap-2 text-[11px]">
            <code className="font-mono text-blue-400 w-28 shrink-0">{f.name}</code>
            <span className="text-slate-600">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
