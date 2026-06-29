import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword  = await bcrypt.hash('admin123', 10)
  const clientPassword = await bcrypt.hash('teste123', 10)

  // ── Planos de taxa ──────────────────────────────────────────────────────────
  await prisma.feePlan.upsert({
    where:  { id: 'plan-start' },
    update: { chargedPercent: 3.49, chargedFixed: 0.49, costPercent: 1.99, costFixed: 0.25 },
    create: {
      id: 'plan-start', name: 'Start',
      chargedPercent: 3.49, chargedFixed: 0.49,
      costPercent:    1.99, costFixed:   0.25,
    },
  })
  await prisma.feePlan.upsert({
    where:  { id: 'plan-growth' },
    update: { chargedPercent: 2.99, chargedFixed: 0.45, costPercent: 1.75, costFixed: 0.22 },
    create: {
      id: 'plan-growth', name: 'Growth',
      chargedPercent: 2.99, chargedFixed: 0.45,
      costPercent:    1.75, costFixed:   0.22,
    },
  })
  await prisma.feePlan.upsert({
    where:  { id: 'plan-prime' },
    update: { chargedPercent: 2.49, chargedFixed: 0.39, costPercent: 1.50, costFixed: 0.20 },
    create: {
      id: 'plan-prime', name: 'Prime',
      chargedPercent: 2.49, chargedFixed: 0.39,
      costPercent:    1.50, costFixed:   0.20,
    },
  })
  await prisma.feePlan.upsert({
    where:  { id: 'plan-black' },
    update: { chargedPercent: 1.99, chargedFixed: 0.29, costPercent: 1.20, costFixed: 0.15 },
    create: {
      id: 'plan-black', name: 'Black',
      chargedPercent: 1.99, chargedFixed: 0.29,
      costPercent:    1.20, costFixed:   0.15,
    },
  })

  // ── Merchants demo ──────────────────────────────────────────────────────────
  // Conta do usuário cliente de teste
  const merchantTeste = await prisma.merchant.upsert({
    where:  { email: 'loja@teste.com' },
    update: { balance: 8420.50, pendingBalance: 1240.00, cdiRate: 1.0, status: 'ACTIVE', plan: 'Prime' },
    create: {
      name: 'Loja Teste',           email: 'loja@teste.com',
      document: '11.111.111/0001-11',
      type: 'ECOMMERCE',            status: 'ACTIVE',
      plan: 'Prime',
      balance: 8420.50,             pendingBalance: 1240.00,
      cdiRate: 1.0,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'techstore@demo.com' },
    update: { balance: 47850.00, pendingBalance: 8320.50, cdiRate: 1.2 },
    create: {
      name: 'TechStore Brasil',     email: 'techstore@demo.com',
      document: '12.345.678/0001-90',
      type: 'ECOMMERCE',            status: 'ACTIVE',
      plan: 'Prime',
      balance: 47850.00,            pendingBalance: 8320.50,
      cdiRate: 1.2,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'edu@demo.com' },
    update: { balance: 128400.00, pendingBalance: 23100.00, cdiRate: 1.5 },
    create: {
      name: 'Edu Digital Academy',  email: 'edu@demo.com',
      document: '23.456.789/0001-01',
      type: 'INFOPRODUTOR',         status: 'ACTIVE',
      plan: 'Black',
      balance: 128400.00,           pendingBalance: 23100.00,
      cdiRate: 1.5,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'modaurbana@demo.com' },
    update: { balance: 9200.75, pendingBalance: 1450.00, cdiRate: 1.0 },
    create: {
      name: 'Moda Urbana LTDA',     email: 'modaurbana@demo.com',
      document: '34.567.890/0001-12',
      type: 'ECOMMERCE',            status: 'ACTIVE',
      plan: 'Growth',
      balance: 9200.75,             pendingBalance: 1450.00,
      cdiRate: 1.0,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'fitlife@demo.com' },
    update: { balance: 31200.00, pendingBalance: 4800.00, cdiRate: 1.3 },
    create: {
      name: 'FitLife Suplementos',  email: 'fitlife@demo.com',
      document: '45.678.901/0001-23',
      type: 'ECOMMERCE',            status: 'ACTIVE',
      plan: 'Prime',
      balance: 31200.00,            pendingBalance: 4800.00,
      cdiRate: 1.3,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'carlos@demo.com' },
    update: {},
    create: {
      name: 'Carlos Mendes Coach',  email: 'carlos@demo.com',
      document: '456.789.012-34',
      type: 'INFOPRODUTOR',         status: 'REVIEW',
      plan: 'Start',
      balance: 0,                   pendingBalance: 0,
      cdiRate: 1.0,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'anasilva@demo.com' },
    update: {},
    create: {
      name: 'Ana Silva Cursos',     email: 'anasilva@demo.com',
      document: '567.890.123-45',
      type: 'INFOPRODUTOR',         status: 'REVIEW',
      plan: 'Start',
      balance: 0,                   pendingBalance: 0,
      cdiRate: 1.0,
    },
  })

  await prisma.merchant.upsert({
    where:  { email: 'papelaria@demo.com' },
    update: {},
    create: {
      name: 'Papelaria Express',    email: 'papelaria@demo.com',
      document: '67.890.123/0001-56',
      type: 'ECOMMERCE',            status: 'BLOCKED',
      plan: 'Start',
      balance: 250.00,              pendingBalance: 0,
      cdiRate: 0.0,
    },
  })

  // ── Usuários ────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where:  { email: 'admin@masterpagamentos.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@masterpagamentos.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where:  { email: 'teste@masterpagamentos.com' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'teste@masterpagamentos.com',
      password: clientPassword,
      role: 'CLIENT',
      merchantId: merchantTeste.id,
    },
  })

  // ── Resumo ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed demo concluído!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤  ADMIN')
  console.log('    Email : admin@masterpagamentos.com')
  console.log('    Senha : admin123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤  CLIENTE (conta demo vinculada à Loja Teste)')
  console.log('    Email : teste@masterpagamentos.com')
  console.log('    Senha : teste123')
  console.log('    Saldo : R$ 8.420,50  |  CDI: 1,00%/mês')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏪  MERCHANTS DEMO (8 ao total)')
  console.log('    Loja Teste           ACTIVE   Prime  R$   8.420,50  1,00%')
  console.log('    TechStore Brasil     ACTIVE   Prime  R$  47.850,00  1,20%')
  console.log('    Edu Digital Academy  ACTIVE   Black  R$ 128.400,00  1,50%')
  console.log('    Moda Urbana LTDA     ACTIVE  Growth  R$   9.200,75  1,00%')
  console.log('    FitLife Suplementos  ACTIVE   Prime  R$  31.200,00  1,30%')
  console.log('    Carlos Mendes Coach  REVIEW   Start  R$       0,00  1,00%')
  console.log('    Ana Silva Cursos     REVIEW   Start  R$       0,00  1,00%')
  console.log('    Papelaria Express   BLOCKED   Start  R$     250,00  0,00%')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋  PLANOS DE TAXA')
  console.log('    Start  3,49% + R$0,49  |  custo 1,99% + R$0,25')
  console.log('    Growth 2,99% + R$0,45  |  custo 1,75% + R$0,22')
  console.log('    Prime  2,49% + R$0,39  |  custo 1,50% + R$0,20')
  console.log('    Black  1,99% + R$0,29  |  custo 1,20% + R$0,15')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
