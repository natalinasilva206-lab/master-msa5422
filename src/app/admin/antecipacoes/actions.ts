'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getAdminSession() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return { id: user.id as string, name: user.name as string, email: user.email as string }
}

function getIp(): string {
  try {
    const h = headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
  } catch { return 'unknown' }
}

const taxaPlano: Record<string, number> = { Start: 2.5, Growth: 2.0, Prime: 1.5, Black: 1.0 }
const TAXA_DEFAULT = 2.5

export async function approveAntecipacao(merchantId: string) {
  const admin = await getAdminSession()
  const ip    = getIp()

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) throw new Error('Seller não encontrado.')
  if (merchant.pendingBalance <= 0) throw new Error('Sem saldo pendente para antecipar.')

  const taxaPercent = taxaPlano[merchant.plan] ?? TAXA_DEFAULT
  const grossAmount = merchant.pendingBalance
  const taxa        = Math.round(grossAmount * (taxaPercent / 100) * 100) / 100
  const netAmount   = Math.round((grossAmount - taxa) * 100) / 100

  await prisma.$transaction(async (tx) => {
    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        pendingBalance: { decrement: grossAmount },
        balance:        { increment: netAmount },
      },
    })

    await tx.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'ANTECIPACAO_APPROVED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          grossAmount,
          taxa,
          taxaPercent,
          netAmount,
          merchantName:  merchant.name,
          adminName:     admin.name,
          adminEmail:    admin.email,
          ip,
          balanceBefore: merchant.balance,
          pendingBefore: merchant.pendingBalance,
        }),
      },
    })
  })

  revalidatePath('/admin/antecipacoes')
  revalidatePath(`/admin/clientes/${merchantId}`)
}
