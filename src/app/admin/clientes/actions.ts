'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function createMerchant(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const name = formData.get('name')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  const document = formData.get('document')?.toString().trim() ?? ''
  const type = formData.get('type')?.toString() ?? ''
  const status = formData.get('status')?.toString() ?? ''
  const plan = formData.get('plan')?.toString() ?? ''

  // Server-side guard (client already validates, this is a safety net)
  if (!name || !email || !document || !type || !status || !plan) {
    redirect('/admin/clientes/novo?error=campos_obrigatorios')
  }

  const existing = await prisma.merchant.findUnique({ where: { email } })
  if (existing) {
    redirect('/admin/clientes/novo?error=email_duplicado')
  }

  const merchant = await prisma.merchant.create({
    data: { name, email, document, type, status, plan },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'CREATE_MERCHANT',
      entity: 'Merchant',
      entityId: merchant.id,
      metadata: JSON.stringify({ name, email, type, status, plan }),
    },
  })

  revalidatePath('/admin/clientes')
  redirect('/admin/clientes')
}
