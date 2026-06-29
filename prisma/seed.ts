import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const clientePassword = await bcrypt.hash('cliente123', 10)

  // Create a merchant for the client
  const merchant = await prisma.merchant.upsert({
    where: { email: 'loja@teste.com' },
    update: {},
    create: {
      name: 'Loja Teste',
      email: 'loja@teste.com',
      document: '12.345.678/0001-90',
      type: 'ECOMMERCE',
      status: 'ACTIVE',
      plan: 'premium',
    },
  })

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

  await prisma.user.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
      password: clientePassword,
      role: 'CLIENT',
      merchantId: merchant.id,
    },
  })

  await prisma.feePlan.upsert({
    where: { id: 'plan-basic' },
    update: {},
    create: {
      id: 'plan-basic',
      name: 'Básico',
      chargedPercent: 2.99,
      chargedFixed: 0.39,
      costPercent: 1.5,
      costFixed: 0.2,
    },
  })

  await prisma.feePlan.upsert({
    where: { id: 'plan-premium' },
    update: {},
    create: {
      id: 'plan-premium',
      name: 'Premium',
      chargedPercent: 1.99,
      chargedFixed: 0.29,
      costPercent: 1.2,
      costFixed: 0.15,
    },
  })

  console.log('✅ Seed concluído com sucesso!')
  console.log('👤 Admin: admin@masterpagamentos.com / admin123')
  console.log('👤 Cliente: cliente@teste.com / cliente123')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
