import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getMerchant() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { merchantId: true } })
  return user?.merchantId ?? null
}

// GET /api/cliente/notifications — list notifications for the authenticated merchant
export async function GET(req: NextRequest) {
  const merchantId = await getMerchant()
  if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === '1'

  const notifications = await prisma.notification.findMany({
    where: { merchantId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = await prisma.notification.count({
    where: { merchantId, read: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

// PATCH /api/cliente/notifications — mark as read
// body: { id?: string } — if no id, marks all as read
export async function PATCH(req: NextRequest) {
  const merchantId = await getMerchant()
  if (!merchantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id: string | undefined = body?.id

  if (id) {
    // Verify ownership before marking
    const notif = await prisma.notification.findUnique({ where: { id }, select: { merchantId: true } })
    if (!notif || notif.merchantId !== merchantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    await prisma.notification.update({ where: { id }, data: { read: true } })
  } else {
    await prisma.notification.updateMany({ where: { merchantId, read: false }, data: { read: true } })
  }

  return NextResponse.json({ ok: true })
}
