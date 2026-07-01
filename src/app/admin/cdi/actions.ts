'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sendCdiCreditEmail } from '@/lib/email'

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'ADMIN') redirect('/login')
  return session
}

export async function updateCdiRate(merchantId: string, rate: number) {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string
  if (rate < 0 || rate > 100) throw new Error('Taxa inválida')
  const prev = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { cdiRate: true } })
  await prisma.merchant.update({ where: { id: merchantId }, data: { cdiRate: rate } })
  await prisma.auditLog.create({
    data: {
      userId, action: 'CDI_RATE_UPDATED', entity: 'Merchant', entityId: merchantId,
      metadata: JSON.stringify({ previousRate: prev?.cdiRate, rate }),
    },
  })
  revalidatePath('/admin/cdi')
}

export async function updateBalance(merchantId: string, balance: number) {
  await requireAdminSession()
  if (balance < 0) throw new Error('Saldo inválido')
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { balance },
  })
  revalidatePath('/admin/cdi')
}

export async function setCdiPrazo(merchantId: string, expiresAt: string | null) {
  const session = await requireAdminSession()
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

export async function resolveEarlyWithdraw(
  requestLogId: string,
  merchantId: string,
  amount: number,
  approve: boolean
): Promise<{ error?: string }> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  if (approve) {
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
    if (!merchant) return { error: 'Merchant não encontrado.' }
    if (amount > merchant.balance) return { error: 'Saldo insuficiente em CDI.' }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        balance:        { decrement: amount },
        pendingBalance: { increment: amount },
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action:   approve ? 'CDI_EARLY_APPROVED' : 'CDI_EARLY_DENIED',
      entity:   'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ requestLogId, amount }),
    },
  })

  revalidatePath('/admin/cdi')
  revalidatePath('/cliente/cdi')
  revalidatePath('/cliente/dashboard')
  return {}
}

export async function applyGlobalRate(rate: number, plan?: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  const userId = (session.user as any)?.id as string
  if (rate < 0 || rate > 100) throw new Error('Taxa inválida')

  const merchants = await prisma.merchant.findMany({
    where: plan ? { plan } : {},
    select: { id: true },
  })
  await prisma.merchant.updateMany({ where: plan ? { plan } : {}, data: { cdiRate: rate } })

  // Audit log per merchant (batch)
  if (merchants.length > 0) {
    await prisma.auditLog.createMany({
      data: merchants.map((m) => ({
        userId, action: 'CDI_RATE_UPDATED', entity: 'Merchant', entityId: m.id,
        metadata: JSON.stringify({ rate, plan: plan ?? 'all', bulk: true }),
      })),
    })
  }
  revalidatePath('/admin/cdi')
}

export async function creditCdiToAll(): Promise<{ count: number; totalCredited: number }> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  const merchants = await prisma.merchant.findMany({
    where: { balance: { gt: 0 }, status: 'ACTIVE' },
    select: { id: true, name: true, email: true, balance: true, cdiRate: true },
  })

  if (merchants.length === 0) return { count: 0, totalCredited: 0 }

  let totalCredited = 0
  let count = 0
  const now = new Date()

  for (const m of merchants) {
    const yield_ = Math.round(m.balance * (m.cdiRate / 100) * 100) / 100
    if (yield_ <= 0) continue

    const newBalance = Math.round((m.balance + yield_) * 100) / 100

    await prisma.merchant.update({
      where: { id: m.id },
      data: { balance: { increment: yield_ } },
    })

    const creditedAt = now.toISOString()
    const metadata = JSON.stringify({ amount: yield_, rate: m.cdiRate, base: m.balance, creditedAt, newBalance })

    await prisma.auditLog.create({
      data: {
        userId, action: 'CDI_CREDIT', entity: 'Merchant', entityId: m.id,
        metadata,
      },
    })

    // Internal notification for the seller
    const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    await prisma.notification.create({
      data: {
        merchantId: m.id,
        type:       'CDI_CREDIT',
        title:      'Rendimento CDI creditado',
        body:       `Seu rendimento CDI de R$ ${brl(yield_)} foi creditado com base no saldo de R$ ${brl(m.balance)}.`,
        metadata,
      },
    })

    // Optional email — no-op when SMTP is not configured
    void sendCdiCreditEmail({
      to:           m.email,
      merchantName: m.name,
      amount:       yield_,
      base:         m.balance,
      rate:         m.cdiRate,
      newBalance,
      creditedAt:   creditedAt,
    })

    totalCredited += yield_
    count++
  }

  revalidatePath('/admin/cdi')
  revalidatePath('/cliente/cdi')
  revalidatePath('/cliente/dashboard')
  return { count, totalCredited: Math.round(totalCredited * 100) / 100 }
}
