'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function approveMerchant(merchantId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  await prisma.merchant.update({
    where: { id: merchantId },
    data: { status: 'ACTIVE' },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'APPROVE_MERCHANT_KYC',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'ACTIVE' }),
    },
  })

  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}

export async function blockMerchant(merchantId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  await prisma.merchant.update({
    where: { id: merchantId },
    data: { status: 'BLOCKED' },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'BLOCK_MERCHANT_KYC',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'BLOCKED' }),
    },
  })

  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}
