export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cron/release-reserves
// Called by Vercel Cron (vercel.json) daily at 02:00 UTC.
// Also callable by admin via button for immediate processing.
// Authorization: CRON_SECRET env var (set in Vercel dashboard).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const now = new Date()

  // Find all RESERVADO entries past their release date
  const due = await prisma.reserveRelease.findMany({
    where: {
      status:    'RESERVADO',
      releaseAt: { lte: now },
    },
    select: { id: true, merchantId: true, amount: true },
  })

  if (due.length === 0) {
    return NextResponse.json({ processed: 0, message: 'Nenhuma reserva para liberar.' })
  }

  // Group by merchant to minimise transactions
  const byMerchant = new Map<string, { id: string; amount: number }[]>()
  for (const r of due) {
    const list = byMerchant.get(r.merchantId) ?? []
    list.push({ id: r.id, amount: r.amount })
    byMerchant.set(r.merchantId, list)
  }

  // Find any ADMIN user to attribute automatic audit entries
  const systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  })
  const systemUserId = systemUser?.id ?? ''

  let processed = 0
  const errors: string[] = []

  for (const [merchantId, items] of Array.from(byMerchant.entries())) {
    try {
      const totalToRelease = items.reduce((s, i) => s + i.amount, 0)
      const ids = items.map((i) => i.id)

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { pendingBalance: true, reservedBalance: true, name: true },
      })

      const auditOps = systemUserId
        ? items.map((item) =>
            prisma.auditLog.create({
              data: {
                userId:   systemUserId,
                action:   'RISK_RELEASE',
                entity:   'Merchant',
                entityId: merchantId,
                metadata: JSON.stringify({
                  amount:      item.amount,
                  from:        'reservedBalance',
                  to:          'pendingBalance',
                  reserveId:   item.id,
                  triggeredBy: 'cron/release-reserves',
                  merchantName: merchant?.name ?? '',
                  before: {
                    pendingBalance:  merchant?.pendingBalance  ?? 0,
                    reservedBalance: merchant?.reservedBalance ?? 0,
                  },
                  after: {
                    pendingBalance:  (merchant?.pendingBalance  ?? 0) + totalToRelease,
                    reservedBalance: (merchant?.reservedBalance ?? 0) - totalToRelease,
                  },
                }),
              },
            })
          )
        : []

      await prisma.$transaction([
        prisma.merchant.update({
          where: { id: merchantId },
          data: {
            pendingBalance:  { increment: totalToRelease },
            reservedBalance: { decrement: totalToRelease },
          },
        }),
        prisma.reserveRelease.updateMany({
          where: { id: { in: ids } },
          data: { status: 'LIBERADO', releasedAt: now },
        }),
        ...auditOps,
      ])
      processed += items.length
    } catch (e: any) {
      errors.push(`${merchantId}: ${e.message}`)
    }
  }

  return NextResponse.json({ processed, errors: errors.length ? errors : undefined })
}
