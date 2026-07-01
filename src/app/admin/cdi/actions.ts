'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sendCdiCreditEmail } from '@/lib/email'
import { setSystemConfig } from '@/lib/systemConfig'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

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

export async function updateBalance(
  merchantId: string,
  balance: number,
  reason: string,
): Promise<{ error?: string }> {
  const session = await requireAdminSession()
  const admin   = session.user as any

  if (!reason?.trim()) return { error: 'Motivo é obrigatório para ajuste manual de saldo.' }
  if (balance < 0)     return { error: 'Saldo não pode ser negativo.' }

  const merchant = await prisma.merchant.findUnique({
    where:  { id: merchantId },
    select: { id: true, name: true, balance: true },
  })
  if (!merchant) return { error: 'Merchant não encontrado.' }

  const before = merchant.balance
  const delta  = Math.round((balance - before) * 100) / 100

  await prisma.$transaction([
    prisma.merchant.update({
      where: { id: merchantId },
      data:  { balance },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'CDI_BALANCE_ADJUSTED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantId,
          merchantName:   merchant.name,
          before:         { balance: before },
          after:          { balance },
          delta,
          reason:         reason.trim(),
          adminName:      admin.name,
          adminEmail:     admin.email,
          adjustedAt:     new Date().toISOString(),
        }),
      },
    }),
  ])

  revalidatePath('/admin/cdi')
  return {}
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

export async function creditCdiToAll(skipCycleCheck = false): Promise<{ count: number; totalCredited: number }> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  if (!skipCycleCheck) {
    const activeCycle = await prisma.cdiCycle.findFirst({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    })
    if (activeCycle) {
      throw new Error(
        'Existe um ciclo CDI ativo no fluxo de aprovação. Use "Aprovar e Creditar" no painel de ciclos, ou cancele o ciclo pendente antes de usar o crédito manual.'
      )
    }
  }

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

    // Webhook — fire-and-forget; never blocks CDI credit
    const auditLogForWebhook = { merchantId: m.id, amount: yield_, baseBalance: m.balance, cdiRate: m.cdiRate, creditedAt, newCdiBalance: newBalance }
    void dispatchWebhook(m.id, 'cdi.credited', auditLogForWebhook)

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

export async function retryCdiWebhookDelivery(deliveryId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdminSession()
  const { retryWebhookDelivery } = await import('@/lib/dispatchWebhook')
  const result = await retryWebhookDelivery(deliveryId)
  revalidatePath('/admin/cdi')
  return result
}

// ─── CDI Cycle Preview ──────────────────────────────────────────────────────

export type CdiCyclePreviewSeller = {
  id: string
  name: string
  email: string
  balance: number
  cdiRate: number
  yield: number
  newBalance: number
  inconsistency: string | null
}

export type CdiCyclePreviewData = {
  sellers: CdiCyclePreviewSeller[]
  totalEligible: number
  totalToCredit: number
  inconsistencies: string[]
  generatedAt: string
}

export async function generateCdiPreview(): Promise<{ id: string; preview: CdiCyclePreviewData }> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  // Block if there's already a PENDING cycle
  const existing = await prisma.cdiCycle.findFirst({ where: { status: 'PENDING' } })
  if (existing) throw new Error('Já existe uma prévia pendente de aprovação. Cancele-a antes de gerar uma nova.')

  const merchants = await prisma.merchant.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true, balance: true, cdiRate: true },
  })

  const sellers: CdiCyclePreviewSeller[] = []
  const inconsistencies: string[] = []
  let totalToCredit = 0

  for (const m of merchants) {
    const inconsistency: string[] = []
    if (m.balance <= 0) continue                           // not eligible — skip
    if (m.cdiRate <= 0) inconsistency.push('taxa CDI = 0')
    if (m.cdiRate > 5)  inconsistency.push(`taxa CDI elevada (${m.cdiRate}%/mês)`)

    const yield_ = Math.round(m.balance * (m.cdiRate / 100) * 100) / 100
    const newBalance = Math.round((m.balance + yield_) * 100) / 100
    const note = inconsistency.length > 0 ? inconsistency.join('; ') : null

    sellers.push({
      id:            m.id,
      name:          m.name,
      email:         m.email,
      balance:       m.balance,
      cdiRate:       m.cdiRate,
      yield:         yield_,
      newBalance,
      inconsistency: note,
    })

    if (note) inconsistencies.push(`${m.name}: ${note}`)
    if (yield_ > 0) totalToCredit += yield_
  }

  const preview: CdiCyclePreviewData = {
    sellers,
    totalEligible: sellers.filter((s) => s.yield > 0).length,
    totalToCredit: Math.round(totalToCredit * 100) / 100,
    inconsistencies,
    generatedAt: new Date().toISOString(),
  }

  const cycle = await prisma.cdiCycle.create({
    data: {
      status:        'PENDING',
      previewData:   JSON.stringify(preview),
      generatedById: userId,
    },
  })

  revalidatePath('/admin/cdi')
  return { id: cycle.id, preview }
}

export async function approveCdiCycle(cycleId: string): Promise<{ count: number; totalCredited: number }> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  const cycle = await prisma.cdiCycle.findUnique({ where: { id: cycleId } })
  if (!cycle) throw new Error('Ciclo não encontrado.')
  if (cycle.status !== 'PENDING') throw new Error('Este ciclo não está mais pendente.')

  // Mark as approved first so duplicate clicks are blocked
  await prisma.cdiCycle.update({
    where: { id: cycleId },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: userId },
  })

  try {
    const result = await creditCdiToAll(true) // skip cycle check — called from approved cycle

    await prisma.cdiCycle.update({
      where: { id: cycleId },
      data: {
        status:       'CREDITED',
        creditedAt:   new Date(),
        creditedById: userId,
        count:        result.count,
        totalCredited: result.totalCredited,
      },
    })

    revalidatePath('/admin/cdi')
    return result
  } catch (err: unknown) {
    await prisma.cdiCycle.update({
      where: { id: cycleId },
      data: { status: 'ERROR', errorMessage: err instanceof Error ? err.message : String(err) },
    })
    throw err
  }
}

export async function recoverCdiCycle(cycleId: string): Promise<{ count: number; totalCredited: number }> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  const cycle = await prisma.cdiCycle.findUnique({ where: { id: cycleId } })
  if (!cycle) throw new Error('Ciclo não encontrado.')
  if (cycle.status !== 'APPROVED') throw new Error('Apenas ciclos em estado APPROVED podem ser recuperados.')

  try {
    const result = await creditCdiToAll(true)
    await prisma.cdiCycle.update({
      where: { id: cycleId },
      data: { status: 'CREDITED', creditedAt: new Date(), creditedById: userId, count: result.count, totalCredited: result.totalCredited },
    })
    revalidatePath('/admin/cdi')
    return result
  } catch (err: unknown) {
    await prisma.cdiCycle.update({
      where: { id: cycleId },
      data: { status: 'ERROR', errorMessage: err instanceof Error ? err.message : String(err) },
    })
    throw err
  }
}

export async function cancelCdiCycle(cycleId: string): Promise<void> {
  const session = await requireAdminSession()
  const userId = (session.user as any)?.id as string

  const cycle = await prisma.cdiCycle.findUnique({ where: { id: cycleId } })
  if (!cycle) throw new Error('Ciclo não encontrado.')
  if (cycle.status !== 'PENDING') throw new Error('Apenas ciclos pendentes podem ser cancelados.')

  await prisma.cdiCycle.update({
    where: { id: cycleId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: userId },
  })

  revalidatePath('/admin/cdi')
}

export async function setIrIofSimulation(enabled: boolean): Promise<void> {
  await requireAdminSession()
  await setSystemConfig('ir_iof_simulation_enabled', enabled ? 'true' : 'false')
  revalidatePath('/admin/cdi')
  revalidatePath('/cliente/cdi')
}
