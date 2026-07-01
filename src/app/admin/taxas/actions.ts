'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Acesso negado.')
  return session!.user as any
}

function parseFloat2(val: FormDataEntryValue | null): number {
  const n = parseFloat(String(val ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export async function createFeePlan(formData: FormData) {
  const admin = await requireAdmin()

  const name = String(formData.get('name') ?? '').trim()
  const chargedPercent = parseFloat2(formData.get('chargedPercent'))
  const chargedFixed = parseFloat2(formData.get('chargedFixed'))
  const costPercent = parseFloat2(formData.get('costPercent'))
  const costFixed = parseFloat2(formData.get('costFixed'))

  if (!name) redirect('/admin/taxas/novo?error=name_required')
  if (costPercent > chargedPercent) redirect('/admin/taxas/novo?error=negative_margin')

  const existing = await prisma.feePlan.findFirst({ where: { name } })
  if (existing) redirect('/admin/taxas/novo?error=name_exists')

  const withdrawalDeadline = String(formData.get('withdrawalDeadline') ?? '1 dia útil').trim() || '1 dia útil'

  const plan = await prisma.feePlan.create({
    data: { name, chargedPercent, chargedFixed, costPercent, costFixed, withdrawalDeadline },
  })

  await prisma.auditLog.create({
    data: {
      userId:   admin.id,
      action:   'FEE_PLAN_CREATED',
      entity:   'FeePlan',
      entityId: plan.id,
      metadata: JSON.stringify({
        name, chargedPercent, chargedFixed, costPercent, costFixed, withdrawalDeadline,
        adminName: admin.name,
      }),
    },
  })

  revalidatePath('/admin/taxas')
  revalidatePath('/admin/configuracoes')
  redirect('/admin/taxas')
}

export async function updateFeePlan(id: string, formData: FormData) {
  const admin = await requireAdmin()

  const name = String(formData.get('name') ?? '').trim()
  const chargedPercent = parseFloat2(formData.get('chargedPercent'))
  const chargedFixed = parseFloat2(formData.get('chargedFixed'))
  const costPercent = parseFloat2(formData.get('costPercent'))
  const costFixed = parseFloat2(formData.get('costFixed'))

  if (!name) redirect(`/admin/taxas/${id}/editar?error=name_required`)
  if (costPercent > chargedPercent) redirect(`/admin/taxas/${id}/editar?error=negative_margin`)

  const existing = await prisma.feePlan.findFirst({
    where: { name, NOT: { id } },
  })
  if (existing) redirect(`/admin/taxas/${id}/editar?error=name_exists`)

  const withdrawalDeadline = String(formData.get('withdrawalDeadline') ?? '1 dia útil').trim() || '1 dia útil'

  const before = await prisma.feePlan.findUnique({ where: { id } })

  await prisma.feePlan.update({
    where: { id },
    data: { name, chargedPercent, chargedFixed, costPercent, costFixed, withdrawalDeadline },
  })

  await prisma.auditLog.create({
    data: {
      userId:   admin.id,
      action:   'FEE_PLAN_UPDATED',
      entity:   'FeePlan',
      entityId: id,
      metadata: JSON.stringify({
        before: before ? {
          name: before.name, chargedPercent: before.chargedPercent,
          chargedFixed: before.chargedFixed, costPercent: before.costPercent,
          costFixed: before.costFixed, withdrawalDeadline: before.withdrawalDeadline,
        } : null,
        after: { name, chargedPercent, chargedFixed, costPercent, costFixed, withdrawalDeadline },
        adminName: admin.name,
      }),
    },
  })

  revalidatePath('/admin/taxas')
  revalidatePath(`/admin/taxas/${id}`)
  revalidatePath('/admin/configuracoes')
  redirect(`/admin/taxas/${id}`)
}

export async function deleteFeePlan(id: string) {
  const admin = await requireAdmin()

  const merchantsUsingPlan = await prisma.merchant.count({
    where: { plan: { equals: (await prisma.feePlan.findUnique({ where: { id }, select: { name: true } }))?.name ?? '' } },
  })
  if (merchantsUsingPlan > 0) redirect(`/admin/taxas?error=plan_in_use`)

  const plan = await prisma.feePlan.findUnique({ where: { id } })

  await prisma.feePlan.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId:   admin.id,
      action:   'FEE_PLAN_DELETED',
      entity:   'FeePlan',
      entityId: id,
      metadata: JSON.stringify({
        name: plan?.name,
        chargedPercent: plan?.chargedPercent,
        costPercent: plan?.costPercent,
        adminName: admin.name,
      }),
    },
  })

  revalidatePath('/admin/taxas')
  revalidatePath('/admin/configuracoes')
  redirect('/admin/taxas')
}
