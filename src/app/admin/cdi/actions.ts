'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function updateCdiRate(merchantId: string, rate: number) {
  if (rate < 0 || rate > 100) throw new Error('Taxa inválida')
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { cdiRate: rate },
  })
  revalidatePath('/admin/cdi')
}

export async function updateBalance(merchantId: string, balance: number) {
  if (balance < 0) throw new Error('Saldo inválido')
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { balance },
  })
  revalidatePath('/admin/cdi')
}

export async function setCdiPrazo(merchantId: string, expiresAt: string | null) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const userId = (session.user as any)?.id as string
  await prisma.auditLog.create({
    data: {
      userId,
      action:   'CDI_LIMIT_SET',
      entity:   'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ expiresAt }),
    },
  })
  revalidatePath('/admin/cdi')
}

export async function applyGlobalRate(rate: number, plan?: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  if (rate < 0 || rate > 100) throw new Error('Taxa inválida')

  await prisma.merchant.updateMany({
    where: plan ? { plan } : {},
    data: { cdiRate: rate },
  })
  revalidatePath('/admin/cdi')
}
