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

const VALID_EVENTS = [
  'sale.created',
  'dispute.opened',
  'dispute.updated',
  'merchant.activated',
  'merchant.blocked',
  'withdrawal.approved',
  'withdrawal.denied',
  'reserve.released',
]

export async function createWebhook(merchantId: string, url: string, events: string[]) {
  await requireAdmin()
  if (!url.startsWith('https://')) throw new Error('URL deve usar HTTPS.')
  const filtered = events.filter((e) => VALID_EVENTS.includes(e))
  await prisma.webhookEndpoint.create({
    data: {
      merchantId,
      url,
      events: JSON.stringify(filtered),
      secret: generateWebhookSecret(),
    },
  })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}

export async function toggleWebhook(id: string, merchantId: string, active: boolean) {
  await requireAdmin()
  await prisma.webhookEndpoint.update({ where: { id }, data: { active } })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}

export async function deleteWebhook(id: string, merchantId: string) {
  await requireAdmin()
  await prisma.webhookEndpoint.delete({ where: { id } })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}

export async function rotateWebhookSecret(id: string, merchantId: string) {
  await requireAdmin()
  await prisma.webhookEndpoint.update({ where: { id }, data: { secret: generateWebhookSecret() } })
  revalidatePath(`/admin/clientes/${merchantId}/webhooks`)
}
