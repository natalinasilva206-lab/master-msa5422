'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return { id: user.id as string, name: user.name as string, email: user.email as string }
}

function getIp(): string {
  try {
    const h = headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
  } catch { return 'unknown' }
}

export async function blockMerchant(merchantId: string, reason: string) {
  const admin = await getAdminSession()
  const ip = getIp()

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) throw new Error('Seller não encontrado.')

  await prisma.$transaction(async (tx) => {
    await tx.merchant.update({ where: { id: merchantId }, data: { status: 'BLOCKED' } })
    await tx.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'KYC_BLOCKED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantName: merchant.name,
          reason: reason || 'Bloqueio manual via antifraude',
          previousStatus: merchant.status,
          adminName:  admin.name,
          adminEmail: admin.email,
          ip,
        }),
      },
    })
  })

  revalidatePath('/admin/antifraude')
  revalidatePath(`/admin/clientes/${merchantId}`)
}

export async function unblockMerchant(merchantId: string) {
  const admin = await getAdminSession()
  const ip = getIp()

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) throw new Error('Seller não encontrado.')

  await prisma.$transaction(async (tx) => {
    await tx.merchant.update({ where: { id: merchantId }, data: { status: 'ACTIVE' } })
    await tx.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'KYC_APPROVED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantName: merchant.name,
          reason: 'Desbloqueio manual via antifraude',
          previousStatus: merchant.status,
          adminName:  admin.name,
          adminEmail: admin.email,
          ip,
        }),
      },
    })
  })

  revalidatePath('/admin/antifraude')
  revalidatePath(`/admin/clientes/${merchantId}`)
}

export async function markForReview(merchantId: string) {
  const admin = await getAdminSession()
  const ip = getIp()

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) throw new Error('Seller não encontrado.')

  await prisma.$transaction(async (tx) => {
    await tx.merchant.update({ where: { id: merchantId }, data: { status: 'REVIEW' } })
    await tx.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'MERCHANT_STATUS_CHANGE',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantName: merchant.name,
          newStatus: 'REVIEW',
          previousStatus: merchant.status,
          reason: 'Marcado para revisão manual via antifraude',
          adminName:  admin.name,
          adminEmail: admin.email,
          ip,
        }),
      },
    })
  })

  revalidatePath('/admin/antifraude')
  revalidatePath(`/admin/clientes/${merchantId}`)
}
