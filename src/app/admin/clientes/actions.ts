'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateApiKey } from '@/lib/apiKey'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

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
  const cdiRateRaw = formData.get('cdiRate')?.toString().trim() ?? ''
  const cdiRate = cdiRateRaw ? Math.max(0, Math.min(10, parseFloat(cdiRateRaw) || 1.0)) : 1.0

  // Server-side guard (client already validates, this is a safety net)
  if (!name || !email || !document || !type || !status || !plan) {
    redirect('/admin/clientes/novo?error=campos_obrigatorios')
  }

  const existing = await prisma.merchant.findUnique({ where: { email } })
  if (existing) {
    redirect('/admin/clientes/novo?error=email_duplicado')
  }

  const merchant = await prisma.merchant.create({
    data: { name, email, document, type, status, plan, cdiRate, apiKey: generateApiKey() },
  })

  const userPassword = formData.get('user_password')?.toString().trim()
  const userName = formData.get('user_name')?.toString().trim() || name
  if (userPassword && userPassword.length >= 6) {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser) {
      const hashed = await bcrypt.hash(userPassword, 10)
      await prisma.user.create({
        data: { name: userName, email, password: hashed, role: 'CLIENT', merchantId: merchant.id },
      })
    }
  }

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
  const cdiRateRaw = formData.get('cdiRate')?.toString().trim() ?? ''
  const cdiRate = cdiRateRaw ? Math.max(0, Math.min(10, parseFloat(cdiRateRaw) || 1.0)) : undefined

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
    data: { name, email, document, type, status, plan, ...(cdiRate !== undefined ? { cdiRate } : {}) },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPDATE_MERCHANT',
      entity: 'Merchant',
      entityId: id,
      metadata: JSON.stringify({ name, email, type, status, plan, cdiRate }),
    },
  })

  revalidatePath(`/admin/clientes/${id}`)
  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${id}`)
}

export async function createClientAccess(merchantId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) redirect('/admin/clientes')

  const userName = formData.get('user_name')?.toString().trim() || merchant.name
  const userPassword = formData.get('user_password')?.toString().trim() ?? ''

  if (userPassword.length < 6) {
    redirect(`/admin/clientes/${merchantId}?error=senha_curta`)
  }

  const existingUser = await prisma.user.findUnique({ where: { email: merchant.email } })
  if (existingUser) {
    redirect(`/admin/clientes/${merchantId}?error=acesso_existente`)
  }

  const hashed = await bcrypt.hash(userPassword, 10)
  await prisma.user.create({
    data: { name: userName, email: merchant.email, password: hashed, role: 'CLIENT', merchantId },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'CREATE_CLIENT_ACCESS',
      entity: 'User',
      entityId: merchantId,
      metadata: JSON.stringify({ email: merchant.email }),
    },
  })

  revalidatePath(`/admin/clientes/${merchantId}`)
  redirect(`/admin/clientes/${merchantId}?success=acesso_criado`)
}

export async function saveMerchantNotes(id: string, notes: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  await prisma.merchant.update({ where: { id }, data: { merchantNotes: notes } as any })
  revalidatePath(`/admin/clientes/${id}`)
}

export async function resetMerchantPassword(merchantId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, include: { users: { take: 1 } } })
  if (!merchant || !merchant.users[0]) return { error: 'Seller sem usuário de acesso.' }
  const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase()
  const hashed = await bcrypt.hash(tempPassword, 10)
  await prisma.user.update({ where: { id: merchant.users[0].id }, data: { password: hashed } })
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'RESET_MERCHANT_PASSWORD',
      entity: 'User',
      entityId: merchantId,
      metadata: JSON.stringify({ email: merchant.users[0].email }),
    },
  })
  revalidatePath(`/admin/clientes/${merchantId}`)
  return { tempPassword }
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

  dispatchWebhook(id, newStatus === 'BLOCKED' ? 'merchant.blocked' : 'merchant.activated', { merchantId: id, newStatus }).catch(() => {})

  revalidatePath(`/admin/clientes/${id}`)
  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${id}`)
}
