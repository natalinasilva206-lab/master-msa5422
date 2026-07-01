'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { recalcAllScores } from '@/app/admin/master-score/actions'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Não autorizado')
}

export async function forceReleaseReserves(): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  const now = new Date()
  const due = await prisma.reserveRelease.findMany({
    where: { status: 'RESERVADO', releaseAt: { lte: now } },
    select: { id: true, merchantId: true, amount: true },
  })

  if (due.length === 0) return { processed: 0, errors: [] }

  const byMerchant = new Map<string, { id: string; amount: number }[]>()
  for (const r of due) {
    const list = byMerchant.get(r.merchantId) ?? []
    list.push({ id: r.id, amount: r.amount })
    byMerchant.set(r.merchantId, list)
  }

  let processed = 0
  const errors: string[] = []

  for (const [merchantId, items] of Array.from(byMerchant.entries())) {
    try {
      const totalToRelease = items.reduce((s, i) => s + i.amount, 0)
      const ids = items.map((i) => i.id)
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
      ])
      processed += items.length
    } catch (e: any) {
      errors.push(`${merchantId}: ${e?.message ?? 'erro'}`)
    }
  }

  revalidatePath('/admin/configuracoes')
  revalidatePath('/admin/risco')
  return { processed, errors }
}

export async function triggerScoreRecalc(): Promise<{ updated: number }> {
  await requireAdmin()
  const result = await recalcAllScores()
  revalidatePath('/admin/master-score')
  return result as { updated: number }
}
