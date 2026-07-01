export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CopyButton } from './CopyButton'
import { GenerateKeyButton } from './GenerateKeyButton'
import { Accordion } from './Accordion'

export default async function IntegracoesPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          merchant: {
            include: {
              webhookEndpoints: { where: { active: true }, orderBy: { createdAt: 'asc' } },
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

  const ultimaVenda = merchant
    ? await prisma.saleLog.findFirst({
        where:   { merchantId: merchant.id, type: 'VENDA', status: 'APROVADO' },
        orderBy: { createdAt: 'desc' },
        select:  { createdAt: true, externalId: true },
      })
    : null

  const baseUrl        = 'https://api.masterpagamentos.com.br/api'
  const keyPlaceholder = apiKey ?? '<SUA_API_KEY>'
  const idPlaceholder  = merchantId === '—' ? '<SEU_MERCHANT_ID>' : merchantId

  return (
    <div>
      <Topbar showNotifications
        title="Integrações / API"
        breadcrumb="Minha Conta"
        subtitle="Credenciais de acesso e referência da API REST v1"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* ── CREDENCIAIS ── */}
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
                <p className="text-[10px] text-slate-700 mt-0.5">Identificador único — obrigatório em todas as requisições</p>
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
                  <p className="text-[12px] text-amber-400 mt-1">Nenhuma chave gerada. Clique em "Gerar API Key".</p>
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
                    Configure em <a href="/cliente/minha-conta" className="text-blue-500 hover:underline">Minha Conta → Webhooks</a>
                  </p>
                )}
              </div>
              {webhookSecret && <CopyButton value={webhookSecret} />}
            </div>
          </div>

          {/* Status barra inferior */}
          <div className="px-5 py-2.5 border-t border-slate-800/60 bg-slate-800/20 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ultimaVenda ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-[11px] text-slate-500">
                {ultimaVenda
                  ? <>Última venda: <span className="text-slate-300">{ultimaVenda.createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></>
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

        {/* ── BASE URL ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Base URL</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-[12px] font-mono text-blue-300 bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700/40 truncate">
              {baseUrl}
            </code>
            <CopyButton value={baseUrl} />
          </div>
          <p className="text-[10.5px] text-slate-600 mt-2">
            Prefixo <code className="font-mono text-slate-400">/v1/</code> em todos os endpoints.
            Autenticação via <code className="font-mono text-slate-400">Authorization: Bearer &lt;apiKey&gt;</code>, exceto{' '}
            <code className="font-mono text-slate-400">POST /v1/sales</code> que recebe a chave no body.
          </p>
        </section>

        {/* ── ENDPOINTS ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Endpoints</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Clique em um endpoint para expandir a documentação completa</p>
          </div>

          <div className="divide-y divide-slate-800/40">

            {/* POST /sales */}
            <Accordion
              title={
                <>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shrink-0">POST</span>
                  <code className="text-[12.5px] font-mono text-slate-200">/api/v1/sales</code>
                  <span className="text-[10px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0">apiKey no body</span>
                </>
              }
              badge={<span className="text-[11px] text-slate-600 hidden sm:block">Registrar venda</span>}
            >
              <p className="text-[11.5px] text-slate-500">Registra uma nova venda e credita o valor no saldo do merchant, descontando a reserva de risco configurada.</p>

              <FieldTable title="Campos do body (JSON)" fields={[
                { name: 'merchantId',  type: 'string', req: true,  desc: 'Seu Merchant ID' },
                { name: 'saleAmount',  type: 'number', req: true,  desc: 'Valor da venda em BRL (ex: 150.00)' },
                { name: 'apiKey',      type: 'string', req: true,  desc: 'Sua API Key (Live)' },
                { name: 'description', type: 'string', req: false, desc: 'Descrição livre — exibida no extrato' },
                { name: 'externalId',  type: 'string', req: false, desc: 'ID do pedido no seu sistema' },
              ]} />

              <CodeBlock label="Exemplo de request">{
`curl -X POST "${baseUrl}/v1/sales" \\
  -H "Content-Type: application/json" \\
  -d '{
    "merchantId": "${idPlaceholder}",
    "saleAmount": 150.00,
    "apiKey": "${keyPlaceholder}",
    "description": "Plano Mensal",
    "externalId": "ORD-2024-001"
  }'`
              }</CodeBlock>

              <CodeBlock label="Response 200">{
`{
  "ok": true,
  "saleLogId": "clx1abc...",
  "valorVenda": 150.00,
  "valorReserva": 22.50,
  "valorDisponivel": 127.50,
  "reservePercent": 15,
  "releaseDays": 30,
  "releaseAt": "2024-08-01"
}`
              }</CodeBlock>

              <ErrorTable errors={[
                { code: 400, desc: 'merchantId ou saleAmount ausente / inválido' },
                { code: 401, desc: 'apiKey ausente ou incorreta' },
                { code: 403, desc: 'Merchant inativo ou bloqueado' },
                { code: 404, desc: 'Merchant não encontrado' },
              ]} />
            </Accordion>

            {/* GET /balance */}
            <Accordion
              title={
                <>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded border bg-blue-500/15 text-blue-400 border-blue-500/20 shrink-0">GET</span>
                  <code className="text-[12.5px] font-mono text-slate-200">/api/v1/balance</code>
                  <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded shrink-0">Bearer token</span>
                </>
              }
              badge={<span className="text-[11px] text-slate-600 hidden sm:block">Consultar saldo</span>}
            >
              <p className="text-[11.5px] text-slate-500">Retorna os cinco tipos de saldo: disponível, em reserva, bloqueado, futuro e CDI.</p>

              <FieldTable title="Query params" fields={[
                { name: 'merchantId', type: 'string', req: true, desc: 'Seu Merchant ID' },
              ]} />

              <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/balance?merchantId=${idPlaceholder}" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
              }</CodeBlock>

              <CodeBlock label="Response 200">{
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

              <div className="space-y-1">
                {[
                  { campo: 'available', desc: 'Saldo livre para saque (pendingBalance)' },
                  { campo: 'reserved',  desc: 'Retido pela reserva de risco' },
                  { campo: 'blocked',   desc: 'Bloqueado por disputa ou chargeback' },
                  { campo: 'future',    desc: 'Vendas ainda dentro do prazo de reserva' },
                  { campo: 'cdi',       desc: 'Investido em CDI' },
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
              ]} />
            </Accordion>

            {/* GET /transactions */}
            <Accordion
              title={
                <>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded border bg-blue-500/15 text-blue-400 border-blue-500/20 shrink-0">GET</span>
                  <code className="text-[12.5px] font-mono text-slate-200">/api/v1/transactions</code>
                  <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded shrink-0">Bearer token</span>
                </>
              }
              badge={<span className="text-[11px] text-slate-600 hidden sm:block">Listar transações</span>}
            >
              <p className="text-[11.5px] text-slate-500">Lista transações com paginação e filtros.</p>

              <FieldTable title="Query params" fields={[
                { name: 'merchantId', type: 'string', req: true,  desc: 'Seu Merchant ID' },
                { name: 'limit',      type: 'number', req: false, desc: 'Itens por página (padrão: 20, máx: 100)' },
                { name: 'offset',     type: 'number', req: false, desc: 'Deslocamento para paginação (padrão: 0)' },
                { name: 'type',       type: 'string', req: false, desc: 'VENDA | ESTORNO | REEMBOLSO' },
                { name: 'status',     type: 'string', req: false, desc: 'APROVADO | CANCELADO | PENDENTE' },
              ]} />

              <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/transactions?merchantId=${idPlaceholder}&limit=5&type=VENDA" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
              }</CodeBlock>

              <CodeBlock label="Response 200">{
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
  "pagination": { "total": 42, "limit": 5, "offset": 0, "hasMore": true }
}`
              }</CodeBlock>

              <ErrorTable errors={[
                { code: 400, desc: 'merchantId ausente' },
                { code: 401, desc: 'API Key ausente ou incorreta' },
              ]} />
            </Accordion>

            {/* GET /transactions/:id */}
            <Accordion
              title={
                <>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded border bg-blue-500/15 text-blue-400 border-blue-500/20 shrink-0">GET</span>
                  <code className="text-[12.5px] font-mono text-slate-200">/api/v1/transactions/:id</code>
                  <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded shrink-0">Bearer token</span>
                </>
              }
              badge={<span className="text-[11px] text-slate-600 hidden sm:block">Consultar transação</span>}
            >
              <p className="text-[11.5px] text-slate-500">Retorna os detalhes de uma transação específica pelo ID interno.</p>

              <FieldTable title="Path param" fields={[
                { name: ':id', type: 'string', req: true, desc: 'ID interno da transação' },
              ]} />
              <FieldTable title="Query params" fields={[
                { name: 'merchantId', type: 'string', req: true, desc: 'Seu Merchant ID — valida ownership' },
              ]} />

              <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/transactions/clx1abc...?merchantId=${idPlaceholder}" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
              }</CodeBlock>

              <CodeBlock label="Response 200">{
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
                { code: 401, desc: 'API Key ausente ou incorreta' },
                { code: 404, desc: 'Transação não encontrada ou pertence a outro merchant' },
              ]} />
            </Accordion>

            {/* POST /withdrawals */}
            <Accordion
              title={
                <>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shrink-0">POST</span>
                  <code className="text-[12.5px] font-mono text-slate-200">/api/v1/withdrawals</code>
                  <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded shrink-0">Bearer token</span>
                </>
              }
              badge={<span className="text-[11px] text-slate-600 hidden sm:block">Solicitar saque</span>}
            >
              <p className="text-[11.5px] text-slate-500">Solicita um saque via Pix. O valor é debitado imediatamente do saldo disponível e a solicitação fica pendente de aprovação.</p>

              <FieldTable title="Campos do body (JSON)" fields={[
                { name: 'merchantId',  type: 'string', req: true, desc: 'Seu Merchant ID' },
                { name: 'amount',      type: 'number', req: true, desc: 'Valor a sacar em BRL — deve ser ≤ saldo disponível' },
                { name: 'pixKey',      type: 'string', req: true, desc: 'Chave Pix de destino' },
                { name: 'pixKeyType',  type: 'string', req: true, desc: 'CPF | CNPJ | EMAIL | TELEFONE | ALEATORIA' },
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

              <CodeBlock label="Response 201">{
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
                { code: 401, desc: 'API Key ausente ou incorreta' },
                { code: 403, desc: 'Merchant inativo ou bloqueado' },
                { code: 422, desc: 'Saldo insuficiente — resposta inclui o disponível atual' },
              ]} />
            </Accordion>

            {/* GET /withdrawals */}
            <Accordion
              title={
                <>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded border bg-blue-500/15 text-blue-400 border-blue-500/20 shrink-0">GET</span>
                  <code className="text-[12.5px] font-mono text-slate-200">/api/v1/withdrawals</code>
                  <span className="text-[10px] text-slate-500 bg-slate-800/40 border border-slate-700/30 px-1.5 py-0.5 rounded shrink-0">Bearer token</span>
                </>
              }
              badge={<span className="text-[11px] text-slate-600 hidden sm:block">Listar saques</span>}
            >
              <p className="text-[11.5px] text-slate-500">Lista o histórico de solicitações de saque com status de cada uma.</p>

              <FieldTable title="Query params" fields={[
                { name: 'merchantId', type: 'string', req: true,  desc: 'Seu Merchant ID' },
                { name: 'limit',      type: 'number', req: false, desc: 'Itens por página (padrão: 20, máx: 100)' },
                { name: 'offset',     type: 'number', req: false, desc: 'Deslocamento para paginação' },
              ]} />

              <CodeBlock label="Exemplo de request">{
`curl "${baseUrl}/v1/withdrawals?merchantId=${idPlaceholder}&limit=10" \\
  -H "Authorization: Bearer ${keyPlaceholder}"`
              }</CodeBlock>

              <CodeBlock label="Response 200">{
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
  "limit": 10, "offset": 0, "count": 1
}`
              }</CodeBlock>

              <div className="space-y-1">
                {[
                  { val: 'PENDENTE', desc: 'Aguardando aprovação' },
                  { val: 'APROVADO', desc: 'Aprovado e transferido via Pix' },
                  { val: 'NEGADO',   desc: 'Recusado pela equipe' },
                ].map((s) => (
                  <div key={s.val} className="flex gap-2 text-[11px]">
                    <code className={`font-mono w-20 shrink-0 ${s.val === 'APROVADO' ? 'text-emerald-400' : s.val === 'NEGADO' ? 'text-red-400' : 'text-amber-400'}`}>{s.val}</code>
                    <span className="text-slate-500">{s.desc}</span>
                  </div>
                ))}
              </div>

              <ErrorTable errors={[
                { code: 401, desc: 'API Key ausente ou incorreta' },
              ]} />
            </Accordion>

          </div>
        </section>

        {/* ── ERROS PADRÃO (acordeão) ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <Accordion
            title={<p className="text-[13px] font-semibold text-white">Erros — formato padrão</p>}
            badge={<span className="text-[10.5px] text-slate-500">Todos os erros retornam JSON com campo <code className="font-mono">error</code></span>}
          >
            <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 border border-slate-800/40">
{`// HTTP 4xx ou 5xx
{ "error": "Descrição do erro em português" }

// Exemplos:
// 401  { "error": "Não autorizado." }
// 422  { "error": "Saldo insuficiente. Disponível: R$ 127,50." }
// 500  { "error": "Erro interno." }`}
            </pre>
          </Accordion>
        </section>

        {/* ── WEBHOOKS ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[13px] font-semibold text-white">Webhooks</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                Notificações via <code className="font-mono text-slate-400">POST</code> no seu endpoint. Gerencie em{' '}
                <a href="/cliente/minha-conta" className="text-blue-400 hover:underline">Minha Conta → Webhooks</a>.
              </p>
            </div>
            {webhooks.length > 0 && (
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full shrink-0">
                {webhooks.length} endpoint{webhooks.length > 1 ? 's' : ''} ativo{webhooks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-800/40">

            {/* Envelope + validação */}
            <Accordion title={<p className="text-[12px] font-semibold text-slate-300">Formato do envelope e validação HMAC</p>}>
              <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 border border-slate-800/40 overflow-x-auto">
{`// Headers recebidos:
X-MasterPay-Event:     payment.approved
X-MasterPay-Signature: a3f9c1... (HMAC-SHA256)

// Body JSON:
{
  "event":     "payment.approved",
  "timestamp": "2024-07-01T14:32:00.000Z",
  "data":      { /* payload do evento */ }
}`}
              </pre>
              <pre className="text-[11.5px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-4 border border-slate-800/40 overflow-x-auto">
{`// Validação HMAC (Node.js):
const crypto = require('crypto')

function isValid(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)   // string bruta — antes do JSON.parse
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}`}
              </pre>
            </Accordion>

            {/* Eventos */}
            {([
              { event: 'payment.approved',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', when: 'Venda registrada com sucesso via POST /v1/sales.',
                payload: `{\n  "saleLogId":   "clx1abc...",\n  "amount":      150.00,\n  "description": "Plano Mensal",\n  "externalId":  "ORD-2024-001"\n}`,
                fields: [{ name: 'saleLogId', desc: 'ID interno da transação' }, { name: 'amount', desc: 'Valor bruto em BRL' }, { name: 'description', desc: 'Pode ser null' }, { name: 'externalId', desc: 'Pode ser null' }] },
              { event: 'payment.refused',     color: 'text-red-400 bg-red-500/10 border-red-500/20',             when: 'Tentativa de venda recusada.',
                payload: `{\n  "amount":  150.00,\n  "reason":  "insufficient_funds",\n  "externalId": "ORD-2024-002"\n}`,
                fields: [{ name: 'amount', desc: 'Valor tentado' }, { name: 'reason', desc: 'Código de recusa' }, { name: 'externalId', desc: 'Pode ser null' }] },
              { event: 'refund.created',      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       when: 'Reembolso ou estorno aprovado.',
                payload: `{\n  "saleLogId": "clx1abc...",\n  "amount":    150.00,\n  "type":      "REEMBOLSO",\n  "reason":    "Solicitação do cliente"\n}`,
                fields: [{ name: 'saleLogId', desc: 'ID da transação original' }, { name: 'amount', desc: 'Valor reembolsado' }, { name: 'type', desc: 'REEMBOLSO ou ESTORNO' }] },
              { event: 'chargeback.opened',   color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',    when: 'Chargeback aberto pelo time operacional.',
                payload: `{\n  "disputeId":        "cly9abc...",\n  "type":             "CHARGEBACK",\n  "contestedAmount":  150.00\n}`,
                fields: [{ name: 'disputeId', desc: 'ID interno da disputa' }, { name: 'contestedAmount', desc: 'Valor contestado' }] },
              { event: 'med.opened',          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',    when: 'MED Pix aberto pelo time operacional.',
                payload: `{\n  "disputeId":        "cly9def...",\n  "type":             "MED_PIX",\n  "contestedAmount":  75.00\n}`,
                fields: [{ name: 'disputeId', desc: 'ID interno' }, { name: 'contestedAmount', desc: 'Valor contestado' }] },
              { event: 'dispute.updated',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       when: 'Status de uma disputa atualizado.',
                payload: `{\n  "disputeId": "cly9abc...",\n  "newStatus": "RESOLVIDO"\n}`,
                fields: [{ name: 'disputeId', desc: 'ID da disputa' }, { name: 'newStatus', desc: 'ABERTO | RESOLVIDO | PERDIDO | CANCELADO' }] },
              { event: 'balance.updated',     color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',          when: 'Saldo do merchant alterado (venda, saque, liberação, etc.).',
                payload: `{\n  "available": 1280.50,\n  "reserved":   450.00,\n  "blocked":      0.00,\n  "reason":    "sale_credited"\n}`,
                fields: [{ name: 'available', desc: 'Novo saldo disponível' }, { name: 'reason', desc: 'sale_credited | reserve_released | withdrawal_deducted | chargeback_blocked' }] },
              { event: 'withdrawal.created',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',          when: 'Saque solicitado via POST /v1/withdrawals.',
                payload: `{\n  "withdrawalId": "clx9xyz...",\n  "amount":       500.00,\n  "pixKey":       "empresa@email.com",\n  "pixKeyType":   "EMAIL"\n}`,
                fields: [{ name: 'withdrawalId', desc: 'ID da solicitação' }, { name: 'amount', desc: 'Valor em BRL' }] },
              { event: 'withdrawal.paid',     color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', when: 'Saque aprovado e pago via Pix.',
                payload: `{\n  "merchantId":    "${idPlaceholder}",\n  "amount":        500.00,\n  "requestLogId":  "clx9xyz..."\n}`,
                fields: [{ name: 'amount', desc: 'Valor pago' }, { name: 'requestLogId', desc: 'ID do registro original' }] },
              { event: 'withdrawal.rejected', color: 'text-red-400 bg-red-500/10 border-red-500/20',             when: 'Saque rejeitado. Valor devolvido ao saldo.',
                payload: `{\n  "merchantId":    "${idPlaceholder}",\n  "amount":        500.00,\n  "requestLogId":  "clx9xyz..."\n}`,
                fields: [{ name: 'amount', desc: 'Valor devolvido ao saldo' }] },
              { event: 'reserve.released',    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',    when: 'Reserva de risco liberada para o saldo disponível.',
                payload: `{\n  "merchantId":  "${idPlaceholder}",\n  "amount":       22.50,\n  "saleLogId":   "clx1abc...",\n  "releasedAt":  "2024-08-01T03:00:00.000Z"\n}`,
                fields: [{ name: 'amount', desc: 'Valor liberado' }, { name: 'saleLogId', desc: 'Venda que gerou a reserva' }] },
              { event: 'cdi.credited',        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',    when: 'Rendimento CDI creditado mensalmente.',
                payload: `{\n  "sellerId":      "${idPlaceholder}",\n  "amount":         12.80,\n  "baseBalance":   320.00,\n  "cdiRate":        0.04,\n  "newCdiBalance": 332.80\n}`,
                fields: [{ name: 'amount', desc: 'Rendimento creditado' }, { name: 'cdiRate', desc: 'Taxa aplicada no ciclo' }, { name: 'newCdiBalance', desc: 'Novo saldo CDI' }] },
              { event: 'merchant.activated',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', when: 'Conta aprovada e ativada após revisão de KYC.',
                payload: `{\n  "merchantId": "${idPlaceholder}",\n  "newStatus":  "ACTIVE"\n}`,
                fields: [{ name: 'newStatus', desc: 'Sempre ACTIVE' }] },
              { event: 'merchant.blocked',    color: 'text-red-400 bg-red-500/10 border-red-500/20',             when: 'Conta bloqueada por risco ou decisão operacional.',
                payload: `{\n  "merchantId": "${idPlaceholder}",\n  "newStatus":  "BLOCKED"\n}`,
                fields: [{ name: 'newStatus', desc: 'Sempre BLOCKED' }] },
            ] as const).map(({ event, color, when, payload, fields }) => (
              <Accordion
                key={event}
                title={<code className={`shrink-0 text-[11px] font-semibold font-mono px-2.5 py-1 rounded border ${color}`}>{event}</code>}
                badge={<span className="text-[11px] text-slate-500 flex-1">{when}</span>}
              >
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-950/60 rounded-xl p-3.5 overflow-x-auto border border-slate-800/40 leading-relaxed">
                  {`// data:\n${payload}`}
                </pre>
                <div className="space-y-1">
                  {([...fields] as { name: string; desc: string }[]).map((f) => (
                    <div key={f.name} className="flex gap-2 text-[11px]">
                      <code className="font-mono text-blue-400 w-28 shrink-0">{f.name}</code>
                      <span className="text-slate-600">{f.desc}</span>
                    </div>
                  ))}
                </div>
              </Accordion>
            ))}

          </div>
        </section>

      </div>
    </div>
  )
}

/* ── Componentes internos (Server-safe) ────────────────────────── */

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
            <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded shrink-0 border ${
              f.req ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-700/30 text-slate-500 border-slate-700/30'
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
            <code className={`font-mono font-semibold w-10 shrink-0 ${e.code >= 500 ? 'text-red-400' : e.code >= 400 ? 'text-amber-400' : 'text-emerald-400'}`}>{e.code}</code>
            <span className="text-slate-500">{e.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
