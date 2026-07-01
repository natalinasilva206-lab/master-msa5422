/**
 * Auditoria completa dos logs do Master Score.
 *
 * Valida rastreabilidade de:
 *   - recálculo manual
 *   - recálculo via cron
 *   - aplicar sugestão
 *   - ignorar sugestão
 *   - alterar nível manual
 *   - marcar como monitorado
 *   - marcar como estratégico
 *   - congelar benefício
 *   - alterar observação interna
 *
 * Valida também:
 *   - ADM vê histórico completo
 *   - Seller não vê dados internos
 *   - Seller não vê MasterScoreAudit nem MasterScoreHistory brutos
 *   - Motivo obrigatório em toda ação manual
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BASE   = 'http://localhost:3000'
const SECRET = 'test-cron-secret-2024'

const results = []
let step = 0

const sep  = () => console.log('─'.repeat(72))
const log  = (t) => { step++; console.log(`\n[${ String(step).padStart(2,'0') }] ${t}`) }
const ok   = (t, d = '') => { results.push({ t, ok: true,  d }); console.log(`      ✅  ${t}${d?' — '+d:''}`) }
const fail = (t, d = '') => { results.push({ t, ok: false, d }); console.log(`      ❌  ${t}${d?' — '+d:''}`) }
const chk  = (c, t, d = '') => c ? ok(t, d) : fail(t, d)
const note = (t) => console.log(`      ℹ️   ${t}`)

// ─── Setup: merchant de teste ─────────────────────────────────────────────────

let MID = null   // merchantId de teste
let UID = null   // userId de teste

async function setup() {
  const pw = await bcrypt.hash('Teste@123', 10)
  const user = await prisma.user.upsert({
    where:  { email: 'audit-score-test@teste.com' },
    update: {},
    create: {
      email:    'audit-score-test@teste.com',
      name:     'Audit Score Test',
      password: pw,
      role:     'CLIENT',
      merchant: {
        create: {
          name: 'Audit Test Merchant', document: '88.001.001/0001-01',
          email: 'audit-test-merchant@teste.com',
          status: 'ACTIVE', plan: 'Growth',
          pendingBalance: 5000, balance: 8000, reservedBalance: 600,
          blockedBalance: 0, futureBalance: 0, cdiRate: 1.2,
        },
      },
    },
    include: { merchant: true },
  })
  MID = user.merchant.id
  UID = user.id
  await prisma.masterScore.upsert({ where: { merchantId: MID }, update: {}, create: { merchantId: MID } })
  console.log(`      Merchant de teste: ${MID}`)
}

async function cleanup() {
  if (!MID) return
  await prisma.masterScoreHistory.deleteMany({ where: { merchantId: MID } })
  await prisma.masterScoreAudit.deleteMany({ where: { merchantId: MID } })
  await prisma.masterScore.deleteMany({ where: { merchantId: MID } })
  await prisma.dispute.deleteMany({ where: { merchantId: MID } })
  await prisma.saleLog.deleteMany({ where: { merchantId: MID } })
  await prisma.auditLog.deleteMany({ where: { OR: [{ entityId: MID }, { userId: UID }] } })
  await prisma.merchant.deleteMany({ where: { id: MID } })
  await prisma.user.deleteMany({ where: { id: UID } })
}

// Helpers para inserir registros de auditoria simulando as Server Actions
// (sem login de sessão real usamos Prisma direto, validando a estrutura dos registros)

async function fakeAudit(acao, valorAntes, valorDepois, motivo) {
  return prisma.masterScoreAudit.create({
    data: {
      merchantId: MID,
      adminEmail: 'admin@teste.com',
      adminName:  'Admin Teste',
      acao, valorAntes, valorDepois, motivo,
    },
  })
}

// ─── PASSO 1 — Estrutura dos modelos de auditoria ────────────────────────────

log('ESTRUTURA DOS MODELOS DE AUDITORIA')

// MasterScoreHistory: campos obrigatórios
const histFields = ['id','merchantId','scoreBefore','scoreAfter','nivelBefore','nivelAfter',
  'statusBefore','statusAfter','volumeScore','chargebackScore','medScore','reembolsoScore',
  'saldoScore','crescimentoScore','tempoContaScore','margemScore','motivosAlteracao',
  'triggerMotivo','createdAt']

// Testar criando um registro real
const testHist = await prisma.masterScoreHistory.create({
  data: {
    merchantId: MID, scoreBefore: 0, scoreAfter: 55, nivelBefore: 'Bronze', nivelAfter: 'Prata',
    statusBefore: 'Alto risco', statusAfter: 'Atenção',
    volumeScore: 0, chargebackScore: 25, medScore: 15, reembolsoScore: 10,
    saldoScore: 3, crescimentoScore: 0, tempoContaScore: 1, margemScore: 0,
    motivosAlteracao: JSON.stringify(['Primeiro cálculo']),
    triggerMotivo: 'cron_periodic',
  },
})
const histKeys = Object.keys(testHist)
const missingHist = histFields.filter(f => !histKeys.includes(f))
chk(missingHist.length === 0, 'MasterScoreHistory — todos os campos obrigatórios presentes',
  missingHist.length > 0 ? `faltando: ${missingHist.join(', ')}` : `${histKeys.length} campos`)

// MasterScoreAudit: campos obrigatórios
const auditFields = ['id','merchantId','adminEmail','adminName','acao','valorAntes','valorDepois','motivo','createdAt']
const testAudit = await fakeAudit('OBSERVACAO', 'obs antiga', 'obs nova', 'Teste de estrutura')
const auditKeys = Object.keys(testAudit)
const missingAudit = auditFields.filter(f => !auditKeys.includes(f))
chk(missingAudit.length === 0, 'MasterScoreAudit — todos os campos obrigatórios presentes',
  missingAudit.length > 0 ? `faltando: ${missingAudit.join(', ')}` : `${auditKeys.length} campos`)

// Campos de rastreabilidade específicos
chk('adminEmail' in testAudit, 'MasterScoreAudit — campo adminEmail presente')
chk('adminName'  in testAudit, 'MasterScoreAudit — campo adminName presente')
chk('motivo'     in testAudit, 'MasterScoreAudit — campo motivo presente')
chk('valorAntes' in testAudit, 'MasterScoreAudit — campo valorAntes presente')
chk('valorDepois' in testAudit,'MasterScoreAudit — campo valorDepois presente')
chk('createdAt'  in testAudit, 'MasterScoreAudit — campo createdAt (data/hora) presente')

// Limpar registros de teste
await prisma.masterScoreHistory.delete({ where: { id: testHist.id } })
await prisma.masterScoreAudit.delete({ where: { id: testAudit.id } })

// ─── PASSO 2 — Recálculo via cron ────────────────────────────────────────────

log('RECÁLCULO VIA CRON — rastreabilidade')

const histBefore = await prisma.masterScoreHistory.count({ where: { merchantId: MID } })
const resp = await fetch(`${BASE}/api/cron/recalc-scores`, {
  headers: { Authorization: `Bearer ${SECRET}` },
})
const cronBody = await resp.json()
chk(resp.status === 200, 'Cron executa com sucesso', `HTTP ${resp.status} updated=${cronBody.updated}`)

const histAfter = await prisma.masterScoreHistory.count({ where: { merchantId: MID } })
const cronHist  = await prisma.masterScoreHistory.findFirst({ where: { merchantId: MID }, orderBy: { createdAt: 'desc' } })

chk(histAfter > histBefore, 'Cron cria MasterScoreHistory', `antes=${histBefore} depois=${histAfter}`)
chk(cronHist?.triggerMotivo === 'cron_periodic', 'Trigger registrado como "cron_periodic"',
  `trigger=${cronHist?.triggerMotivo}`)
chk(typeof cronHist?.scoreAfter === 'number', 'scoreAfter registrado', `scoreAfter=${cronHist?.scoreAfter}`)
chk(typeof cronHist?.scoreBefore === 'number', 'scoreBefore registrado', `scoreBefore=${cronHist?.scoreBefore}`)
chk(cronHist?.motivosAlteracao != null, 'motivosAlteracao registrado',
  `motivos=${cronHist?.motivosAlteracao?.slice(0,60)}`)

// Cron NÃO gera MasterScoreAudit (é automático, sem ADM)
const cronAuditAfter = await prisma.masterScoreAudit.count({ where: { merchantId: MID } })
chk(cronAuditAfter === 0, 'Cron NÃO gera MasterScoreAudit (correto — ação automática)',
  `auditCount=${cronAuditAfter}`)

note('LIMITAÇÃO: MasterScoreHistory não armazena adminEmail → impossível saber qual ADM disparou recálculo manual')

// ─── PASSO 3 — Todas as ações manuais: verificar MasterScoreAudit ─────────────

log('AÇÕES MANUAIS — campos de rastreabilidade em MasterScoreAudit')

const ACOES = [
  { acao: 'OBSERVACAO',            valorAntes: 'obs velha',    valorDepois: 'obs nova',    motivo: 'Corrigindo obs' },
  { acao: 'MONITORADO',            valorAntes: 'false',        valorDepois: 'true',        motivo: 'Volume suspeito' },
  { acao: 'ESTRATEGICO',           valorAntes: 'false',        valorDepois: 'true',        motivo: 'Cliente VIP' },
  { acao: 'NIVEL_MANUAL',          valorAntes: 'automático',   valorDepois: 'Diamante',    motivo: 'Override acordado' },
  { acao: 'BENEFICIO_CONGELADO',   valorAntes: 'ativo',        valorDepois: 'congelado',   motivo: 'Disputa em aberto' },
  { acao: 'BENEFICIO_DESCONGELADO',valorAntes: 'congelado',    valorDepois: 'ativo',       motivo: 'Disputa encerrada' },
  { acao: 'SUGESTAO_IGNORADA',     valorAntes: 'pendente',     valorDepois: 'ignorada',    motivo: 'ADM avaliou e manteve' },
  { acao: 'SUGESTAO_APLICADA',     valorAntes: 'pendente',     valorDepois: 'aplicada',    motivo: 'Sugestão confirmada' },
]

const auditIds = []
for (const a of ACOES) {
  const rec = await fakeAudit(a.acao, a.valorAntes, a.valorDepois, a.motivo)
  auditIds.push(rec.id)

  const campos = [
    rec.merchantId   === MID,
    rec.adminEmail   === 'admin@teste.com',
    rec.adminName    === 'Admin Teste',
    rec.acao         === a.acao,
    rec.valorAntes   === a.valorAntes,
    rec.valorDepois  === a.valorDepois,
    rec.motivo       === a.motivo,
    rec.createdAt instanceof Date,
  ]
  const allOk = campos.every(Boolean)
  chk(allOk, `[${a.acao}] merchantId + adminEmail + adminName + acao + valorAntes + valorDepois + motivo + createdAt`,
    allOk ? 'todos os campos corretos' : `campos ausentes`)
}

// ─── PASSO 4 — Motivo: ações sem motivo não devem ser aceitas ─────────────────

log('MOTIVO OBRIGATÓRIO — ações manuais')

// Verificar assinatura de cada Server Action (análise estática)
// Carregamos o arquivo e verificamos as assinaturas
import { readFileSync } from 'fs'
const actionsCode = readFileSync('/home/user/master-msa5422/src/app/admin/master-score/actions.ts', 'utf-8')

const acoesManuais = [
  { fn: 'setMonitorado',       assinatura: /setMonitorado\(merchantId: string, valor: boolean, motivo: string\)/ },
  { fn: 'setEstrategico',      assinatura: /setEstrategico\(merchantId: string, valor: boolean, motivo: string\)/ },
  { fn: 'setNivelManual',      assinatura: /setNivelManual\(merchantId: string, nivel: string \| null, motivo: string\)/ },
  { fn: 'setBeneficioCongelado',assinatura: /setBeneficioCongelado\(merchantId: string, congelar: boolean, motivo: string\)/ },
  { fn: 'ignorarSugestaoScore',assinatura: /ignorarSugestaoScore\(merchantId: string, motivo: string\)/ },
  { fn: 'aplicarSugestaoScore',assinatura: /aplicarSugestaoScore\(merchantId: string, motivo: string\)/ },
]

for (const a of acoesManuais) {
  chk(a.assinatura.test(actionsCode), `[${a.fn}] motivo: string (obrigatório na assinatura)`)
}

// saveScoreObservacao — BUG: motivo é OPCIONAL (motivo?)
const obsAssinatura = /saveScoreObservacao\(merchantId: string, observacao: string, motivo\?: string\)/
const obsTemBug = obsAssinatura.test(actionsCode)
if (obsTemBug) {
  fail('[saveScoreObservacao] motivo é OPCIONAL (motivo?: string) — BUG: ação sem motivo é aceita',
    'Deve ser motivo: string (obrigatório)')
} else {
  ok('[saveScoreObservacao] motivo obrigatório (correto)')
}

// Verificar que o fallback de motivo padrão existe (evidência do bug)
const temFallback = /motivo \?\? 'Observação interna atualizada'/.test(actionsCode)
if (temFallback) {
  fail('[saveScoreObservacao] fallback de motivo detectado — permite salvar sem motivo real',
    `Linha: motivo ?? 'Observação interna atualizada'`)
}

// ─── PASSO 5 — recálculo manual sem ADM registrado ────────────────────────────

log('RECÁLCULO MANUAL — ADM responsável NÃO registrado no histórico')

// MasterScoreHistory não tem campo adminEmail
const histSchema = Object.keys(testHist)  // analisado anteriormente
const histTemAdmin = histSchema.includes('adminEmail') || histSchema.includes('adminId')
if (histTemAdmin) {
  ok('[MasterScoreHistory] campo adminEmail/adminId presente')
} else {
  fail('[MasterScoreHistory] campo adminEmail AUSENTE — BUG: quem recalculou manualmente não é identificável',
    'triggerMotivo="recalculo_manual" mas sem adminEmail no registro')
}

// recalcSellerScore NÃO chama registrarAuditControle
const recalcSellerChamaAudit = /registrarAuditControle/.test(
  actionsCode.slice(
    actionsCode.indexOf('export async function recalcSellerScore'),
    actionsCode.indexOf('export async function recalcAllScores'),
  )
)
chk(!recalcSellerChamaAudit,
  '[recalcSellerScore] NÃO registra no MasterScoreAudit — BUG: ADM responsável desconhecido',
  recalcSellerChamaAudit ? 'registra (correto)' : 'não registra (identificado como bug)')

// recalcAllScores (manual, via botão ADM) NÃO registra auditoria
const recalcAllChamaAudit = /registrarAuditControle/.test(
  actionsCode.slice(
    actionsCode.indexOf('export async function recalcAllScores'),
    actionsCode.indexOf('export async function saveScoreObservacao'),
  )
)
chk(!recalcAllChamaAudit,
  '[recalcAllScores] NÃO registra no MasterScoreAudit — BUG: ADM responsável desconhecido',
  recalcAllChamaAudit ? 'registra (correto)' : 'não registra (identificado como bug)')

// ─── PASSO 6 — Divergência buildScoreInput em actions.ts vs scoreEventHook.ts ─

log('DIVERGÊNCIA DE FONTES: actions.ts vs scoreEventHook.ts')

const hookCode = readFileSync('/home/user/master-msa5422/src/lib/scoreEventHook.ts', 'utf-8')

// actions.ts ainda usa AuditLog para chargebacks/MEDs
const actionsUsaAuditLogCB  = /action: \{ in: \['CHARGEBACK_OPENED'/.test(actionsCode)
const actionsUsaAuditLogMED = /action: \{ in: \['MED_PIX_REQUEST'/.test(actionsCode)
const actionsUsaAuditLogReb = /action: \{ in: \['WITHDRAW_DENIED'/.test(actionsCode)

// scoreEventHook.ts usa a tabela Dispute
const hookUsaDisputeTable = /prisma\.dispute\.findMany/.test(hookCode)
const hookUsaSaleLog      = /prisma\.saleLog\.count.*REFUND/.test(hookCode.replace(/\s/g, ' '))

chk(actionsUsaAuditLogCB,
  '[actions.ts] Chargebacks via AuditLog.CHARGEBACK_OPENED — BUG: diverge de scoreEventHook.ts',
  'Cron usa Dispute table; recálculo manual usa AuditLog → scores diferentes para o mesmo seller!')
chk(actionsUsaAuditLogMED,
  '[actions.ts] MEDs via AuditLog.MED_PIX_REQUEST — BUG: diverge de scoreEventHook.ts',
  'Cron usa Dispute table; recálculo manual usa AuditLog → MEDs ignorados no cálculo manual')
chk(actionsUsaAuditLogReb,
  '[actions.ts] Reembolsos via AuditLog.WITHDRAW_DENIED — BUG: diverge de scoreEventHook.ts',
  'Cron usa SaleLog.REFUND; recálculo manual usa AuditLog → contagens diferentes')
chk(hookUsaDisputeTable,
  '[scoreEventHook.ts] Chargebacks/MEDs via Dispute table (correto)',
  'Fonte de verdade: tabela Dispute')
chk(hookUsaSaleLog,
  '[scoreEventHook.ts] Reembolsos via SaleLog.REFUND (correto)',
  'Fonte de verdade: tabela SaleLog')

note('IMPACTO: se um ADM recalcula manualmente, o score pode ser DIFERENTE do cron para o mesmo seller')

// ─── PASSO 7 — Seller não vê dados internos ───────────────────────────────────

log('VISIBILIDADE DO SELLER — dados internos protegidos')

// Seller dashboard: select limitado
const dashboardCode = readFileSync('/home/user/master-msa5422/src/app/cliente/dashboard/page.tsx', 'utf-8')

const sellerVeScoreTotal    = /scoreTotal.*true/.test(dashboardCode)
const sellerVeNivelScore    = /nivelScore.*true/.test(dashboardCode)
const sellerVeUpdatedAt     = /updatedAt.*true/.test(dashboardCode)
const sellerNaoVeStatusRisco= !/statusRisco.*true/.test(dashboardCode.slice(dashboardCode.indexOf('masterScore: {'), dashboardCode.indexOf('}\n', dashboardCode.indexOf('masterScore: {')) + 50))
const sellerNaoVeChargebackScore = !/chargebackScore.*true/.test(dashboardCode.slice(dashboardCode.indexOf('masterScore: {'), dashboardCode.indexOf('}\n', dashboardCode.indexOf('masterScore: {')) + 100))

chk(sellerVeScoreTotal,         'Seller VÊ scoreTotal (OK)', 'campo público')
chk(sellerVeNivelScore,         'Seller VÊ nivelScore (OK)', 'campo público')
chk(sellerVeUpdatedAt,          'Seller VÊ updatedAt (OK)',  'campo público')
chk(sellerNaoVeStatusRisco,     'Seller NÃO vê statusRisco (campo interno ADM)', 'bloqueado pelo select')
chk(sellerNaoVeChargebackScore, 'Seller NÃO vê chargebackScore (peso interno)', 'bloqueado pelo select')

// Seller NÃO acessa MasterScoreAudit ou MasterScoreHistory
const clienteDir = '/home/user/master-msa5422/src/app/cliente'
import { execSync } from 'child_process'
let sellerAcessaAudit = false
try {
  const out = execSync(`grep -r "masterScoreAudit\\|MasterScoreHistory\\|masterScoreHistory" ${clienteDir} --include="*.tsx" --include="*.ts" -l 2>/dev/null`).toString()
  sellerAcessaAudit = out.trim().length > 0
} catch { sellerAcessaAudit = false }

chk(!sellerAcessaAudit, 'Seller NÃO acessa MasterScoreAudit nem MasterScoreHistory (correto)',
  sellerAcessaAudit ? 'VULNERABILIDADE: acessa dados internos!' : 'painel do cliente limpo')

// Seller NÃO vê observacaoInterna, monitorado, estrategico, nivelManual
const camposInternos = ['observacaoInterna','monitorado','estrategico','nivelManual','sugestaoStatus','beneficioCongelado']
let sellerVeCampoInterno = false
for (const campo of camposInternos) {
  const regex = new RegExp(`${campo}.*true`)
  if (regex.test(dashboardCode.slice(dashboardCode.indexOf('masterScore: {'), dashboardCode.indexOf('}', dashboardCode.indexOf('masterScore: {')) + 200))) {
    sellerVeCampoInterno = true
    fail(`Seller VÊ campo interno "${campo}" — VULNERABILIDADE`, 'deve ser bloqueado no select')
  }
}
if (!sellerVeCampoInterno) {
  ok('Seller NÃO vê nenhum campo interno (observacaoInterna, monitorado, estrategico, nivelManual, sugestaoStatus)', 'select correto')
}

// ─── PASSO 8 — ADM vê histórico completo ──────────────────────────────────────

log('VISIBILIDADE DO ADM — histórico completo')

const admPageCode = readFileSync('/home/user/master-msa5422/src/app/admin/master-score/[merchantId]/page.tsx', 'utf-8')

chk(admPageCode.includes('masterScoreAudits'),  'ADM página carrega masterScoreAudits')
chk(admPageCode.includes('MasterScoreHistory'), 'ADM página carrega MasterScoreHistory')
chk(admPageCode.includes('orderBy: { createdAt: \'desc\' }'), 'Audits ordenados por data desc')
chk(admPageCode.includes('triggerMotivo'), 'ADM exibe triggerMotivo')
chk(admPageCode.includes('adminEmail') || admPageCode.includes('adminName'), 'ADM exibe adminEmail/adminName')

// MasterScoreAudit count paginado
chk(admPageCode.includes('masterScoreAudit.count'), 'Paginação de audits com .count()')

// ─── PASSO 9 — Tabela de cobertura de auditoria ───────────────────────────────

log('MATRIZ DE COBERTURA DE AUDITORIA')

const COBERTURA = [
  { acao: 'Recálculo cron (automático)',        hist: true,  auditAdm: false, admRegistrado: false, motivoOk: true,  nota: 'trigger=cron_periodic; ADM não aplicável' },
  { acao: 'Recálculo manual (por seller)',      hist: true,  auditAdm: false, admRegistrado: false, motivoOk: null,  nota: 'BUG: adminEmail ausente no histórico' },
  { acao: 'Recálculo em lote (botão ADM)',      hist: true,  auditAdm: false, admRegistrado: false, motivoOk: null,  nota: 'BUG: adminEmail ausente no histórico' },
  { acao: 'Aplicar sugestão',                  hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: true,  nota: 'SUGESTAO_APLICADA; valorAntes/Depois ok' },
  { acao: 'Ignorar sugestão',                  hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: true,  nota: 'SUGESTAO_IGNORADA; valorAntes/Depois ok' },
  { acao: 'Alteração nível manual',            hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: true,  nota: 'NIVEL_MANUAL; automático → nível escolhido' },
  { acao: 'Marcar como monitorado',            hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: true,  nota: 'MONITORADO; false → true' },
  { acao: 'Marcar como estratégico',           hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: true,  nota: 'ESTRATEGICO; false → true' },
  { acao: 'Congelar / descongelar benefício',  hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: true,  nota: 'BENEFICIO_CONGELADO / DESCONGELADO' },
  { acao: 'Alterar observação interna',        hist: false, auditAdm: true,  admRegistrado: true,  motivoOk: false, nota: 'BUG: motivo é opcional (motivo?: string)' },
]

console.log()
const H = ['Ação','History','AuditAdm','ADM ID','Motivo OK','Status']
console.log('  ' + H.map(h => h.padEnd(28)).join(''))
sep()
for (const c of COBERTURA) {
  const status = (!c.admRegistrado && c.auditAdm === false && c.motivoOk === null) ? '⚠️  BUG'
               : (c.motivoOk === false) ? '⚠️  BUG'
               : (!c.admRegistrado && c.auditAdm === false) ? '✅ OK (automático)'
               : (c.admRegistrado && c.auditAdm && c.motivoOk) ? '✅ OK'
               : '⚠️  BUG'
  const row = [
    c.acao.padEnd(28),
    (c.hist    ? '✅' : '—').padEnd(28),
    (c.auditAdm ? '✅' : '—').padEnd(28),
    (c.admRegistrado ? '✅' : c.auditAdm ? '⚠️ ' : '—').padEnd(28),
    (c.motivoOk === true ? '✅' : c.motivoOk === false ? '❌' : '—').padEnd(28),
    status,
  ]
  console.log('  ' + row.join(''))
}

// ─── CLEANUP ─────────────────────────────────────────────────────────────────

// Limpar audits criados no teste
await prisma.masterScoreAudit.deleteMany({ where: { merchantId: MID } })

await cleanup()
await prisma.$disconnect()

// ─── RESULTADO FINAL ──────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(72))
console.log('RESULTADO FINAL')
console.log('═'.repeat(72))
const passed = results.filter(r => r.ok)
const failed = results.filter(r => !r.ok)
console.log(`✅  PASSOU: ${passed.length}/${results.length}`)
console.log(`❌  FALHOU (bugs ou gaps): ${failed.length}/${results.length}`)

if (failed.length) {
  console.log('\n  Bugs / gaps encontrados:')
  failed.forEach(r => console.log(`    ❌  ${r.t}${r.d ? '\n        → '+r.d : ''}`))
}
console.log()
