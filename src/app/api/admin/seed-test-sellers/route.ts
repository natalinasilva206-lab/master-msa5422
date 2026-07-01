/**
 * POST /api/admin/seed-test-sellers
 * Cria 4 sellers fictícios para validação do Master Score.
 * Acesso restrito a ADM. Idempotente: usa upsert via email único.
 *
 * Scores esperados após "Recalcular Todos":
 *   Bronze:   ~18 pts  (Alto risco)
 *   Prata:    ~42 pts  (Atenção)
 *   Ouro:     ~75 pts  (Saudável)
 *   Diamante: ~100 pts (Premium)
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function randomWithin(startDaysAgo: number, endDaysAgo: number): Date {
  const start = startDaysAgo * 86400000
  const end   = endDaysAgo   * 86400000
  return new Date(Date.now() - end - Math.random() * (start - end))
}

async function criarVendas(merchantId: string, adminId: string, qtd: number, valor: number, within: [number, number]) {
  const rows = Array.from({ length: qtd }, () => ({
    userId:   adminId,
    action:   'BALANCE_ADJUST',
    entity:   'merchant',
    entityId: merchantId,
    metadata: JSON.stringify({ amount: String(valor), type: 'venda_teste' }),
    createdAt: randomWithin(within[0], within[1]),
  }))
  await prisma.auditLog.createMany({ data: rows })
}

async function criarEventos(merchantId: string, adminId: string, action: string, qtd: number, within: [number, number]) {
  const rows = Array.from({ length: qtd }, () => ({
    userId:   adminId,
    action,
    entity:   'merchant',
    entityId: merchantId,
    metadata: JSON.stringify({ source: 'seed_teste' }),
    createdAt: randomWithin(within[0], within[1]),
  }))
  await prisma.auditLog.createMany({ data: rows })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!adminUser) return NextResponse.json({ error: 'Admin não encontrado' }, { status: 500 })

  const adminId = adminUser.id
  const results: Record<string, string> = {}

  // ─── SELLER 1: Bronze / Alto risco ─────────────────────────────────────────
  // Esperado: ~18 pts
  //   volume=5 + cb=0 + med=0 + reemb=0 + saldo=3 + cresc=0 + tempo=5 + margem≈5
  {
    const m = await prisma.merchant.upsert({
      where:  { email: 'bronze.teste@masterpagamentos.com' },
      update: {},
      create: {
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
        createdAt:          daysAgo(250),
      },
    })

    await prisma.user.upsert({
      where:  { email: 'usuario.bronze@masterpagamentos.com' },
      update: {},
      create: {
        name:       'Usuário Bronze',
        email:      'usuario.bronze@masterpagamentos.com',
        password:   '$2a$10$dummyhashfortestingonly',
        role:       'CLIENT',
        merchantId: m.id,
      },
    })

    // Só cria logs se ainda não existem para este seller (idempotência)
    const existing = await prisma.auditLog.count({ where: { entityId: m.id } })
    if (existing === 0) {
      await criarVendas(m.id, adminId, 20, 250, [1, 29])
      await criarEventos(m.id, adminId, 'CHARGEBACK_OPENED', 5, [1, 29])
      await criarEventos(m.id, adminId, 'DISPUTE_OPENED',    5, [1, 29])
      await criarEventos(m.id, adminId, 'MED_PIX_REQUEST',   3, [1, 29])
      await criarEventos(m.id, adminId, 'FRAUD_FLAG',        2, [1, 29])
      await criarEventos(m.id, adminId, 'REEMBOLSO',         4, [1, 29])
      await criarEventos(m.id, adminId, 'ESTORNO',           2, [1, 29])
      await criarVendas(m.id, adminId, 25, 300, [31, 58])
    }

    results.bronze = m.id
  }

  // ─── SELLER 2: Prata / Atenção ──────────────────────────────────────────────
  // Esperado: ~42 pts
  //   volume=10 + cb=10 + med=5 + reemb=3 + saldo=3 + cresc=5 + tempo=3 + margem=3
  {
    const m = await prisma.merchant.upsert({
      where:  { email: 'prata.teste@masterpagamentos.com' },
      update: {},
      create: {
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
        createdAt:          daysAgo(50),
      },
    })

    await prisma.user.upsert({
      where:  { email: 'usuario.prata@masterpagamentos.com' },
      update: {},
      create: {
        name:       'Usuário Prata',
        email:      'usuario.prata@masterpagamentos.com',
        password:   '$2a$10$dummyhashfortestingonly',
        role:       'CLIENT',
        merchantId: m.id,
      },
    })

    const existing = await prisma.auditLog.count({ where: { entityId: m.id } })
    if (existing === 0) {
      await criarVendas(m.id, adminId, 60, 350, [1, 29])
      await criarEventos(m.id, adminId, 'CHARGEBACK_OPENED', 1, [1, 29])
      await criarEventos(m.id, adminId, 'MED_PIX_REQUEST',   2, [1, 29])
      await criarEventos(m.id, adminId, 'REEMBOLSO',         6, [1, 29])
      await criarVendas(m.id, adminId, 65, 330, [31, 58])
    }

    results.prata = m.id
  }

  // ─── SELLER 3: Ouro / Saudável ──────────────────────────────────────────────
  // Esperado: ~75 pts
  //   volume=15 + cb=18 + med=15 + reemb=6 + saldo=6 + cresc=5 + tempo=5 + margem=5
  {
    const m = await prisma.merchant.upsert({
      where:  { email: 'ouro.teste@masterpagamentos.com' },
      update: {},
      create: {
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
        createdAt:          daysAgo(180),
      },
    })

    await prisma.user.upsert({
      where:  { email: 'usuario.ouro@masterpagamentos.com' },
      update: {},
      create: {
        name:       'Usuário Ouro',
        email:      'usuario.ouro@masterpagamentos.com',
        password:   '$2a$10$dummyhashfortestingonly',
        role:       'CLIENT',
        merchantId: m.id,
      },
    })

    const existing = await prisma.auditLog.count({ where: { entityId: m.id } })
    if (existing === 0) {
      await criarVendas(m.id, adminId, 200, 350, [1, 29])
      await criarEventos(m.id, adminId, 'CHARGEBACK_OPENED', 2, [1, 29])
      // 0 MEDs — sem eventos
      await criarEventos(m.id, adminId, 'REEMBOLSO', 5, [1, 29])
      await criarVendas(m.id, adminId, 180, 355, [31, 58])
    }

    results.ouro = m.id
  }

  // ─── SELLER 4: Diamante / Premium ───────────────────────────────────────────
  // Esperado: 100 pts
  //   volume=20 + cb=25 + med=15 + reemb=10 + saldo=10 + cresc=10 + tempo=5 + margem=5
  {
    const m = await prisma.merchant.upsert({
      where:  { email: 'diamante.teste@masterpagamentos.com' },
      update: {},
      create: {
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
        createdAt:          daysAgo(500),
      },
    })

    await prisma.user.upsert({
      where:  { email: 'usuario.diamante@masterpagamentos.com' },
      update: {},
      create: {
        name:       'Usuário Diamante',
        email:      'usuario.diamante@masterpagamentos.com',
        password:   '$2a$10$dummyhashfortestingonly',
        role:       'CLIENT',
        merchantId: m.id,
      },
    })

    const existing = await prisma.auditLog.count({ where: { entityId: m.id } })
    if (existing === 0) {
      await criarVendas(m.id, adminId, 400, 400, [1, 29])
      await criarEventos(m.id, adminId, 'CHARGEBACK_OPENED', 1, [1, 29])
      // 0 MEDs — sem eventos
      await criarEventos(m.id, adminId, 'REEMBOLSO', 4, [1, 29])
      await criarVendas(m.id, adminId, 350, 385, [31, 58])
    }

    results.diamante = m.id
  }

  return NextResponse.json({
    ok: true,
    message: 'Sellers de teste criados. Acesse /admin/master-score e clique em "Recalcular Todos" para gerar os scores.',
    sellers: {
      bronze:   { id: results.bronze,   email: 'bronze.teste@masterpagamentos.com',   esperado: '~18 pts → Bronze / Alto risco' },
      prata:    { id: results.prata,    email: 'prata.teste@masterpagamentos.com',    esperado: '~42 pts → Prata / Atenção' },
      ouro:     { id: results.ouro,     email: 'ouro.teste@masterpagamentos.com',     esperado: '~75 pts → Ouro / Saudável' },
      diamante: { id: results.diamante, email: 'diamante.teste@masterpagamentos.com', esperado: '~100 pts → Diamante / Premium' },
    },
  })
}
