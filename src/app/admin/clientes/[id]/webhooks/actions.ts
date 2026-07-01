'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWebhookSecret } from '@/lib/apiKey'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Acesso negado.')
  return session!.user as any
}

/** Ensures the endpoint belongs to the declared merchant (IDOR guard). */
async function requireEndpointOwnership(id: string, merchantId: string) {
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id }, select: { merchantId: true } })
  if (!ep || ep.merchantId !== merchantId) throw new Error('Endpoint não encontrado.')
  return ep
}

const VALID_EVENTS = [
  'payment.approved',
  'payment.refused',
  'refund.created',
  'chargeback.opened',
  'med.opened',
  'dispute.updated',
  'balance.updated',
  'withdrawal.created',
  'withdrawal.paid',
  'withdrawal.rejected',
  'reserve.released',
  'cdi.credited',
  'merchant.activated',
  'merchant.blocked',
]

export async function createWebhook(merchantId: string, url: string, events: string[]) {
  const admin = await requireAdmin()
  if (!url.startsWith('https://')) throw new Error('URL deve usar HTTPS.')
  const filtered = events.filter((e) => VALID_EVENTS.includes(e))
  const ep = await prisma.webhookEndpoint.create({
    data: {
      merchantId,
      url,
      events: JSON.stringify(filtered),
      secret: generateWebhookSecret(),
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'WEBHOOK_CREATED',
      entity: 'WebhookEndpoint',
      entityId: ep.id,
      metadata: JSON.stringify({ merchantId, url, events: filtered }),
    },
  })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}

export async function toggleWebhook(id: string, merchantId: string, active: boolean) {
  const admin = await requireAdmin()
  await requireEndpointOwnership(id, merchantId)
  await prisma.webhookEndpoint.update({ where: { id }, data: { active } })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: active ? 'WEBHOOK_ACTIVATED' : 'WEBHOOK_DEACTIVATED',
      entity: 'WebhookEndpoint',
      entityId: id,
      metadata: JSON.stringify({ merchantId }),
    },
  })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}

export async function deleteWebhook(id: string, merchantId: string) {
  const admin = await requireAdmin()
  await requireEndpointOwnership(id, merchantId)
  await prisma.webhookEndpoint.delete({ where: { id } })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'WEBHOOK_DELETED',
      entity: 'WebhookEndpoint',
      entityId: id,
      metadata: JSON.stringify({ merchantId }),
    },
  })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}

export async function rotateWebhookSecret(id: string, merchantId: string) {
  const admin = await requireAdmin()
  await requireEndpointOwnership(id, merchantId)
  await prisma.webhookEndpoint.update({ where: { id }, data: { secret: generateWebhookSecret() } })
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'WEBHOOK_SECRET_ROTATED',
      entity: 'WebhookEndpoint',
      entityId: id,
      metadata: JSON.stringify({ merchantId }),
    },
  })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}
