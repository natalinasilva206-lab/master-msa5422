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

export async function updateMerchant(id: string, formData: FormData) {
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

  const base = `/admin/clientes/${id}/editar`

  if (!name || !email || !document || !type || !status || !plan) {
    redirect(`${base}?error=campos_obrigatorios`)
  }

  // Allow merchant to keep its own email; block if email belongs to a different merchant
  const conflict = await prisma.merchant.findFirst({
    where: { email, NOT: { id } },
  })
  if (conflict) {
    redirect(`${base}?error=email_duplicado`)
  }

  await prisma.merchant.update({
    where: { id },
    data: { name, email, document, type, status, plan },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPDATE_MERCHANT',
      entity: 'Merchant',
      entityId: id,
      metadata: JSON.stringify({ name, email, type, status, plan }),
    },
  })

  revalidatePath(`/admin/clientes/${id}`)
  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${id}`)
}

export async function toggleMerchantStatus(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const merchant = await prisma.merchant.findUnique({ where: { id } })
  if (!merchant) redirect('/admin/clientes')

  // Only toggle between ACTIVE ↔ BLOCKED; REVIEW is unchanged by this action
  if (merchant.status === 'REVIEW') {
    redirect(`/admin/clientes/${id}`)
  }

  const previousStatus = merchant.status
  const newStatus = merchant.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'
  const action = newStatus === 'BLOCKED' ? 'BLOCK_MERCHANT' : 'ACTIVATE_MERCHANT'

  await prisma.merchant.update({
    where: { id },
    data: { status: newStatus },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action,
      entity: 'Merchant',
      entityId: id,
      metadata: JSON.stringify({ previousStatus, newStatus }),
    },
  })

  revalidatePath(`/admin/clientes/${id}`)
  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${id}`)
}
