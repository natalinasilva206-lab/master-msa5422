import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const clientePassword = await bcrypt.hash('teste123', 10)

  // --- Único merchant de teste ---
  const merchant = await prisma.merchant.upsert({
    where: { email: 'loja@teste.com' },
    update: {},
    create: {
      name: 'Loja Teste',
      email: 'loja@teste.com',
      document: '11.111.111/0001-11',
      type: 'ECOMMERCE',
      status: 'ACTIVE',
      plan: 'Prime',
      balance: 1250.75,
      pendingBalance: 340.00,
    },
  })

  // --- Planos de taxa ---
  await prisma.feePlan.upsert({
    where: { id: 'plan-start' },
    update: {},
    create: {
      id: 'plan-start',
      name: 'Start',
      chargedPercent: 3.49,
      chargedFixed: 0.49,
      costPercent: 1.99,
      costFixed: 0.25,
    },
  })

  await prisma.feePlan.upsert({
    where: { id: 'plan-prime' },
    update: {},
    create: {
      id: 'plan-prime',
      name: 'Prime',
      chargedPercent: 2.49,
      chargedFixed: 0.39,
      costPercent: 1.50,
      costFixed: 0.20,
    },
  })

  // --- Usuário admin ---
  await prisma.user.upsert({
    where: { email: 'admin@masterpagamentos.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@masterpagamentos.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  // --- Único usuário cliente de teste ---
  await prisma.user.upsert({
    where: { email: 'teste@masterpagamentos.com' },
    update: {},
    create: {
      name: 'Usuário Teste',
      email: 'teste@masterpagamentos.com',
      password: clientePassword,
      role: 'CLIENT',
      merchantId: merchant.id,
    },
  })

  console.log('\n✅ Seed concluído!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 ADMIN')
  console.log('   Email: admin@masterpagamentos.com')
  console.log('   Senha: admin123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👤 CLIENTE TESTE')
  console.log('   Email: teste@masterpagamentos.com')
  console.log('   Senha: teste123')
  console.log('   Merchant: Loja Teste')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
