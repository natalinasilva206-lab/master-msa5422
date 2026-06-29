'use server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateCdiRate(merchantId: string, rate: number) {
  if (rate < 0 || rate > 100) throw new Error('Taxa inválida')
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { cdiRate: rate },
  })
  revalidatePath('/admin/cdi')
}

export async function updateBalance(merchantId: string, balance: number) {
  if (balance < 0) throw new Error('Saldo inválido')
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { balance },
  })
  revalidatePath('/admin/cdi')
}
