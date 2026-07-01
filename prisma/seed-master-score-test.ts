/**
 * Seed: 4 sellers de teste para validação do Master Score.
 *
 * Scores esperados (calculados manualmente antes de rodar):
 *   Bronze:   ~18 pts  → nível Bronze  / Alto risco
 *   Prata:    ~42 pts  → nível Prata   / Atenção
 *   Ouro:     ~75 pts  → nível Ouro    / Saudável
 *   Diamante: 100 pts  → nível Diamante / Premium
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
function createId(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const prisma = new PrismaClient()

// ─── Helpers de data ──────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function randomWithin30d(): Date {
  const ms = Math.floor(Math.random() * 29 * 24 * 60 * 60 * 1000)
  return new Date(Date.now() - ms)
}

function randomWithin30_60d(): Date {
  const ms = (31 + Math.random() * 27) * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ms)
}

// ─── Criar AuditLogs de vendas (BALANCE_ADJUST) ───────────────────────────────

async function criarVendas(merchantId: string, adminId: string, qtd: number, valor: number, dateGen: () => Date) {
  for (let i = 0; i < qtd; i++) {
    await prisma.auditLog.create({
      data: {
        id:       createId(),
        userId:   adminId,
        action:   'BALANCE_ADJUST',
        entity:   'merchant',
        entityId: merchantId,
        metadata: JSON.stringify({ amount: String(valor), type: 'venda_teste' }),
        createdAt: dateGen(),
      },
    })
  }
}

async function criarEventos(merchantId: string, adminId: string, action: string, qtd: number, dateGen: () => Date) {
  for (let i = 0; i < qtd; i++) {
    await prisma.auditLog.create({
      data: {
        id:       createId(),
        userId:   adminId,
        action,
        entity:   'merchant',
        entityId: merchantId,
        metadata: JSON.stringify({ source: 'seed_teste' }),
        createdAt: dateGen(),
      },
    })
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Buscando admin...')
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

  if (!admin) {
    console.log('👤 Criando admin temporário para seed...')
    admin = await prisma.user.create({
      data: {
        id:       createId(),
        name:     'Admin Teste',
        email:    'admin@masterpagamentos.com',
        password: await bcrypt.hash('admin123', 10),
        role:     'ADMIN',
      },
    })
  }
  const adminId = admin.id
  console.log(`✅ Admin: ${admin.email} (${adminId})`)

  // ─── SELLER 1: Bronze / Alto Risco ──────────────────────────────────────────
  // Score esperado: ~18 pts
  //   volume=5pts + cb=0pts + med=0pts + reemb=0pts + saldo=3pts + cresc=0pts + tempo=5pts + margem=5pts
  //   = 18 pts → Bronze

  console.log('\n🟤 Criando Seller Bronze...')

  const merchantBronzeId = createId()
  await prisma.merchant.upsert({
    where:  { email: 'bronze.teste@masterpagamentos.com' },
    update: {},
    create: {
      id:                 merchantBronzeId,
      name:               'Bronze Comércio Digital Ltda',
      email:              'bronze.teste@masterpagamentos.com',
      document:           '11.111.111/0001-11',
      type:               'ECOMMERCE',
      status:             'ACTIVE',
      plan:               'Start',
      balance:            0,
      pendingBalance:     300,
      reservedBalance:    1500,
      riskReservePercent: 15,
      riskReleaseDays:    90,
      riskLevel:          'HIGH',
      createdAt:          daysAgo(250),  // 250 dias → tempo=5 pts
    },
  })

  // Buscar ID real (pode ter existido antes)
  const mBronze = await prisma.merchant.findUnique({ where: { email: 'bronze.teste@masterpagamentos.com' } })
  if (!mBronze) throw new Error('Merchant bronze não criado')

  // Criar usuário para o seller bronze
  await prisma.user.upsert({
    where:  { email: 'usuario.bronze@masterpagamentos.com' },
    update: {},
    create: {
      id:         createId(),
      name:       'Usuário Bronze',
      email:      'usuario.bronze@masterpagamentos.com',
      password:   await bcrypt.hash('teste123', 10),
      role:       'CLIENT',
      merchantId: mBronze.id,
    },
  })

  // 20 vendas em 30d × R$250 = R$5.000 → volumeScore=5
  await criarVendas(mBronze.id, adminId, 20, 250, randomWithin30d)
  // 10 chargebacks → 10/20 = 50% → chargebackScore=0
  await criarEventos(mBronze.id, adminId, 'CHARGEBACK_OPENED', 5, randomWithin30d)
  await criarEventos(mBronze.id, adminId, 'DISPUTE_OPENED',    5, randomWithin30d)
  // 5 MED Pix → medScore=0 (>3)
  await criarEventos(mBronze.id, adminId, 'MED_PIX_REQUEST',   3, randomWithin30d)
  await criarEventos(mBronze.id, adminId, 'FRAUD_FLAG',        2, randomWithin30d)
  // 6 reembolsos / 20 = 30% → reembolsoScore=0
  await criarEventos(mBronze.id, adminId, 'REEMBOLSO',         4, randomWithin30d)
  await criarEventos(mBronze.id, adminId, 'ESTORNO',           2, randomWithin30d)
  // Mês anterior: 25 vendas × R$300 = R$7.500 → crescimento=-33% → crescimentoScore=0
  await criarVendas(mBronze.id, adminId, 25, 300, randomWithin30_60d)

  console.log(`  ✅ Bronze: ${mBronze.id}`)

  // ─── SELLER 2: Prata / Atenção ───────────────────────────────────────────────
  // Score esperado: ~42 pts
  //   volume=10pts + cb=10pts + med=5pts + reemb=3pts + saldo=3pts + cresc=5pts + tempo=3pts + margem=3pts
  //   = 42 pts → Prata

  console.log('\n⚪ Criando Seller Prata...')

  await prisma.merchant.upsert({
    where:  { email: 'prata.teste@masterpagamentos.com' },
    update: {},
    create: {
      id:                 createId(),
      name:               'Prata Vendas Online ME',
      email:              'prata.teste@masterpagamentos.com',
      document:           '22.222.222/0001-22',
      type:               'ECOMMERCE',
      status:             'ACTIVE',
      plan:               'Growth',
      balance:            200,
      pendingBalance:     800,
      reservedBalance:    3000,
      riskReservePercent: 8,
      riskReleaseDays:    60,
      riskLevel:          'MEDIUM',
      createdAt:          daysAgo(50),   // 50 dias → tempo=3 pts
    },
  })

  const mPrata = await prisma.merchant.findUnique({ where: { email: 'prata.teste@masterpagamentos.com' } })
  if (!mPrata) throw new Error('Merchant prata não criado')

  await prisma.user.upsert({
    where:  { email: 'usuario.prata@masterpagamentos.com' },
    update: {},
    create: {
      id:         createId(),
      name:       'Usuário Prata',
      email:      'usuario.prata@masterpagamentos.com',
      password:   await bcrypt.hash('teste123', 10),
      role:       'CLIENT',
      merchantId: mPrata.id,
    },
  })

  // 60 vendas × R$350 = R$21.000 → volumeScore=10 (10k-50k)
  await criarVendas(mPrata.id, adminId, 60, 350, randomWithin30d)
  // 1 chargeback → 1/60 = 1.67% → chargebackScore=10 (1.01-2%)
  await criarEventos(mPrata.id, adminId, 'CHARGEBACK_OPENED', 1, randomWithin30d)
  // 2 MED Pix → medScore=5 (2-3 MEDs)
  await criarEventos(mPrata.id, adminId, 'MED_PIX_REQUEST', 2, randomWithin30d)
  // 6 reembolsos / 60 = 10% → reembolsoScore=3 (5.01-10%)
  await criarEventos(mPrata.id, adminId, 'REEMBOLSO', 6, randomWithin30d)
  // Mês anterior: 65 vendas × R$330 = R$21.450 → cresc=-2.1% → crescimentoScore=5 (estável)
  await criarVendas(mPrata.id, adminId, 65, 330, randomWithin30_60d)

  console.log(`  ✅ Prata: ${mPrata.id}`)

  // ─── SELLER 3: Ouro / Saudável ───────────────────────────────────────────────
  // Score esperado: ~75 pts
  //   volume=15 + cb=18 + med=15 + reemb=6 + saldo=6 + cresc=5 + tempo=5 + margem=5
  //   = 75 pts → Ouro

  console.log('\n🟡 Criando Seller Ouro...')

  await prisma.merchant.upsert({
    where:  { email: 'ouro.teste@masterpagamentos.com' },
    update: {},
    create: {
      id:                 createId(),
      name:               'Ouro Marketplace Ltda',
      email:              'ouro.teste@masterpagamentos.com',
      document:           '33.333.333/0001-33',
      type:               'ECOMMERCE',
      status:             'ACTIVE',
      plan:               'Prime',
      balance:            2000,
      pendingBalance:     3000,
      reservedBalance:    8000,
      riskReservePercent: 4,
      riskReleaseDays:    30,
      riskLevel:          'LOW',
      createdAt:          daysAgo(180),  // 180 dias → tempo=5 pts
    },
  })

  const mOuro = await prisma.merchant.findUnique({ where: { email: 'ouro.teste@masterpagamentos.com' } })
  if (!mOuro) throw new Error('Merchant ouro não criado')

  await prisma.user.upsert({
    where:  { email: 'usuario.ouro@masterpagamentos.com' },
    update: {},
    create: {
      id:         createId(),
      name:       'Usuário Ouro',
      email:      'usuario.ouro@masterpagamentos.com',
      password:   await bcrypt.hash('teste123', 10),
      role:       'CLIENT',
      merchantId: mOuro.id,
    },
  })

  // 200 vendas × R$350 = R$70.000 → volumeScore=15 (50k-100k)
  await criarVendas(mOuro.id, adminId, 200, 350, randomWithin30d)
  // 2 chargebacks → 2/200 = 1% → chargebackScore=18 (0.51-1%)
  await criarEventos(mOuro.id, adminId, 'CHARGEBACK_OPENED', 2, randomWithin30d)
  // 0 MEDs → medScore=15
  // 5 reembolsos → 5/200 = 2.5% → reembolsoScore=6 (2.01-5%)
  await criarEventos(mOuro.id, adminId, 'REEMBOLSO', 5, randomWithin30d)
  // Mês anterior: 180 vendas × R$355 = R$63.900 → cresc=+9.5% → crescimentoScore=5 (estável <10%)
  await criarVendas(mOuro.id, adminId, 180, 355, randomWithin30_60d)

  console.log(`  ✅ Ouro: ${mOuro.id}`)

  // ─── SELLER 4: Diamante / Premium ────────────────────────────────────────────
  // Score esperado: 100 pts
  //   volume=20 + cb=25 + med=15 + reemb=10 + saldo=10 + cresc=10 + tempo=5 + margem=5
  //   = 100 pts → Diamante

  console.log('\n💎 Criando Seller Diamante...')

  await prisma.merchant.upsert({
    where:  { email: 'diamante.teste@masterpagamentos.com' },
    update: {},
    create: {
      id:                 createId(),
      name:               'Diamante Pagamentos SA',
      email:              'diamante.teste@masterpagamentos.com',
      document:           '44.444.444/0001-44',
      type:               'ECOMMERCE',
      status:             'ACTIVE',
      plan:               'Black',
      balance:            12000,
      pendingBalance:     18000,
      reservedBalance:    5000,
      riskReservePercent: 1.5,
      riskReleaseDays:    15,
      riskLevel:          'LOW',
      createdAt:          daysAgo(500),  // 500 dias → tempo=5 pts
    },
  })

  const mDiamante = await prisma.merchant.findUnique({ where: { email: 'diamante.teste@masterpagamentos.com' } })
  if (!mDiamante) throw new Error('Merchant diamante não criado')

  await prisma.user.upsert({
    where:  { email: 'usuario.diamante@masterpagamentos.com' },
    update: {},
    create: {
      id:         createId(),
      name:       'Usuário Diamante',
      email:      'usuario.diamante@masterpagamentos.com',
      password:   await bcrypt.hash('teste123', 10),
      role:       'CLIENT',
      merchantId: mDiamante.id,
    },
  })

  // 400 vendas × R$400 = R$160.000 → volumeScore=20 (≥100k)
  await criarVendas(mDiamante.id, adminId, 400, 400, randomWithin30d)
  // 1 chargeback → 1/400 = 0.25% → chargebackScore=25 (≤0.5%)
  await criarEventos(mDiamante.id, adminId, 'CHARGEBACK_OPENED', 1, randomWithin30d)
  // 0 MEDs → medScore=15
  // 4 reembolsos → 4/400 = 1% → reembolsoScore=10 (≤2%)
  await criarEventos(mDiamante.id, adminId, 'REEMBOLSO', 4, randomWithin30d)
  // Mês anterior: 350 vendas × R$385 = R$134.750 → cresc=+18.7% → crescimentoScore=10 (≥10%)
  await criarVendas(mDiamante.id, adminId, 350, 385, randomWithin30_60d)

  console.log(`  ✅ Diamante: ${mDiamante.id}`)

  // ─── Resumo ───────────────────────────────────────────────────────────────────

  console.log('\n✅ Sellers de teste criados com sucesso!')
  console.log('\n📊 Scores esperados (antes do recálculo):')
  console.log('  Bronze:   ~18 pts → Bronze / Alto risco')
  console.log('  Prata:    ~42 pts → Prata  / Atenção')
  console.log('  Ouro:     ~75 pts → Ouro   / Saudável')
  console.log('  Diamante: ~100 pts → Diamante / Premium')
  console.log('\n👉 Acesse /admin/master-score e clique em "Recalcular Todos"')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
