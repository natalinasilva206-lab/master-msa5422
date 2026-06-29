import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  const clientePassword = await bcrypt.hash('cliente123', 10)

  // --- Merchants ---
  const merchantsData = [
    {
      name: 'Loja Alpha',
      email: 'lojalpha@teste.com',
      document: '11.111.111/0001-11',
      type: 'ECOMMERCE',
      status: 'ACTIVE',
      plan: 'Prime',
    },
    {
      name: 'Digital Pro',
      email: 'digitalpro@teste.com',
      document: '22.222.222/0001-22',
      type: 'INFOPRODUTOR',
      status: 'ACTIVE',
      plan: 'Black',
    },
    {
      name: 'Market Fit Store',
      email: 'marketfit@teste.com',
      document: '33.333.333/0001-33',
      type: 'ECOMMERCE',
      status: 'REVIEW',
      plan: 'Growth',
    },
    {
      name: 'Curso Elite',
      email: 'cursoelite@teste.com',
      document: '44.444.444/0001-44',
      type: 'INFOPRODUTOR',
      status: 'BLOCKED',
      plan: 'Start',
    },
    {
      name: 'Oferta Max',
      email: 'ofertamax@teste.com',
      document: '55.555.555/0001-55',
      type: 'ECOMMERCE',
      status: 'ACTIVE',
      plan: 'Growth',
    },
  ]

  const createdMerchants: Record<string, string> = {}
  for (const m of merchantsData) {
    const merchant = await prisma.merchant.upsert({
      where: { email: m.email },
      update: {},
      create: m,
    })
    createdMerchants[m.email] = merchant.id
  }

  // --- Fee Plans ---
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

  // --- Users ---
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
      merchantId: createdMerchants['lojalpha@teste.com'],
    },
  })

  console.log('✅ Seed concluído!')
  console.log('👤 Admin: admin@masterpagamentos.com / admin123')
  console.log('👤 Cliente: cliente@teste.com / cliente123')
  console.log(`🏪 ${merchantsData.length} merchants criados`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
