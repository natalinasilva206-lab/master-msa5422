'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/apiKey'
import { retryWebhookDelivery } from '@/lib/dispatchWebhook'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Acesso negado.')
  return session!.user as any
}

export async function resetApiKey(merchantId: string): Promise<{ ok: boolean; apiKey?: string; error?: string }> {
  const admin = await requireAdmin()
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true, name: true } })
  if (!merchant) return { ok: false, error: 'Merchant não encontrado.' }

  const newKey = generateApiKey()
  await prisma.merchant.update({ where: { id: merchantId }, data: { apiKey: newKey } })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'RESET_API_KEY',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ merchantName: merchant.name }),
    },
  })
  revalidatePath('/admin/integracoes')
  return { ok: true, apiKey: newKey }
}

export async function revokeApiKey(merchantId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin()
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true, name: true } })
  if (!merchant) return { ok: false, error: 'Merchant não encontrado.' }

  await prisma.merchant.update({ where: { id: merchantId }, data: { apiKey: null } })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'REVOKE_API_KEY',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ merchantName: merchant.name }),
    },
  })
  revalidatePath('/admin/integracoes')
  return { ok: true }
}

export async function retryWebhook(deliveryId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin()
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, merchantId: true, event: true },
  })
  if (!delivery) return { ok: false, error: 'Entrega não encontrada.' }

  const result = await retryWebhookDelivery(deliveryId)
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'RETRY_WEBHOOK',
      entity: 'WebhookDelivery',
      entityId: deliveryId,
      metadata: JSON.stringify({ merchantId: delivery.merchantId, event: delivery.event, success: result.success }),
    },
  })
  revalidatePath('/admin/integracoes')
  if (!result.success) return { ok: false, error: result.error ?? 'Falha na reentrega.' }
  return { ok: true }
}
