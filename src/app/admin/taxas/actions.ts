'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

function parseFloat2(val: FormDataEntryValue | null): number {
  const n = parseFloat(String(val ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export async function createFeePlan(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const chargedPercent = parseFloat2(formData.get('chargedPercent'))
  const chargedFixed = parseFloat2(formData.get('chargedFixed'))
  const costPercent = parseFloat2(formData.get('costPercent'))
  const costFixed = parseFloat2(formData.get('costFixed'))

  if (!name) redirect('/admin/taxas/novo?error=name_required')

  const existing = await prisma.feePlan.findFirst({ where: { name } })
  if (existing) redirect('/admin/taxas/novo?error=name_exists')

  await prisma.feePlan.create({
    data: { name, chargedPercent, chargedFixed, costPercent, costFixed },
  })

  revalidatePath('/admin/taxas')
  redirect('/admin/taxas')
}

export async function updateFeePlan(id: string, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const chargedPercent = parseFloat2(formData.get('chargedPercent'))
  const chargedFixed = parseFloat2(formData.get('chargedFixed'))
  const costPercent = parseFloat2(formData.get('costPercent'))
  const costFixed = parseFloat2(formData.get('costFixed'))

  if (!name) redirect(`/admin/taxas/${id}/editar?error=name_required`)

  const existing = await prisma.feePlan.findFirst({
    where: { name, NOT: { id } },
  })
  if (existing) redirect(`/admin/taxas/${id}/editar?error=name_exists`)

  await prisma.feePlan.update({
    where: { id },
    data: { name, chargedPercent, chargedFixed, costPercent, costFixed },
  })

  revalidatePath('/admin/taxas')
  revalidatePath(`/admin/taxas/${id}`)
  redirect(`/admin/taxas/${id}`)
}

export async function deleteFeePlan(id: string) {
  await prisma.feePlan.delete({ where: { id } })
  revalidatePath('/admin/taxas')
  redirect('/admin/taxas')
}
