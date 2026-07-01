'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  return session
}

export async function approveMerchant(merchantId: string) {
  const session = await requireAdmin()
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'ACTIVE' } })
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'APPROVE_MERCHANT_KYC',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'ACTIVE' }),
    },
  })
  dispatchWebhook(merchantId, 'merchant.activated', { merchantId, newStatus: 'ACTIVE' }).catch(() => {})
  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}

export async function rejectMerchant(merchantId: string) {
  const session = await requireAdmin()
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'BLOCKED' } })
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'KYC_REJECTED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'BLOCKED' }),
    },
  })
  dispatchWebhook(merchantId, 'merchant.blocked', { merchantId, newStatus: 'BLOCKED' }).catch(() => {})
  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}

export async function blockMerchant(merchantId: string) {
  return rejectMerchant(merchantId)
}

export async function requestCall(merchantId: string) {
  const session = await requireAdmin()
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'KYC_CALL_REQUESTED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ requestedAt: new Date().toISOString() }),
    },
  })
  revalidatePath('/admin/kyc')
}

export async function addKycDocument(merchantId: string, url: string) {
  await requireAdmin()
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { kycDocumentUrls: true } })
  if (!merchant) throw new Error('Merchant não encontrado.')
  let docs: string[] = []
  try { docs = JSON.parse((merchant as any).kycDocumentUrls ?? '[]') } catch {}
  if (!docs.includes(url)) docs.push(url)
  await prisma.merchant.update({ where: { id: merchantId }, data: { kycDocumentUrls: JSON.stringify(docs) } as any })
  revalidatePath('/admin/kyc')
}

export async function removeKycDocument(merchantId: string, url: string) {
  await requireAdmin()
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { kycDocumentUrls: true } })
  if (!merchant) return
  let docs: string[] = []
  try { docs = JSON.parse((merchant as any).kycDocumentUrls ?? '[]') } catch {}
  await prisma.merchant.update({ where: { id: merchantId }, data: { kycDocumentUrls: JSON.stringify(docs.filter((d) => d !== url)) } as any })
  revalidatePath('/admin/kyc')
}

export async function requestAdjustment(merchantId: string, note: string) {
  const session = await requireAdmin()
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'KYC_ADJUSTMENT_REQUESTED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ note, requestedAt: new Date().toISOString() }),
    },
  })
  revalidatePath('/admin/kyc')
}
