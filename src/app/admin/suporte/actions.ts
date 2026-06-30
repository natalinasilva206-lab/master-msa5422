'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Acesso negado.')
  return session!.user as any
}

function getIp() {
  try { return headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown' } catch { return 'unknown' }
}

export async function markTicketReplied(ticketId: string, sellerName: string) {
  const admin = await getAdminSession()
  const ip = getIp()
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SUPPORT_TICKET_REPLIED',
      entity: 'AuditLog',
      entityId: ticketId,
      metadata: JSON.stringify({
        ticketId,
        sellerName,
        adminName: admin.name,
        adminEmail: admin.email,
        ip,
        repliedAt: new Date().toISOString(),
      }),
    },
  })
  revalidatePath('/admin/suporte')
}
