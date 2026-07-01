'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') throw new Error('Acesso negado.')
  return session!.user as any
}

export async function createFaq(
  question: string,
  answer: string,
  category: string,
  order: number,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  if (!question.trim()) return { error: 'Pergunta obrigatória.' }
  if (!answer.trim())   return { error: 'Resposta obrigatória.' }

  await prisma.faqItem.create({
    data: {
      question: question.trim(),
      answer:   answer.trim(),
      category: category.trim() || 'Geral',
      order:    order || 0,
    },
  })

  revalidatePath('/admin/suporte/faq')
  revalidatePath('/cliente/suporte')
  return { ok: true }
}

export async function updateFaq(
  id: string,
  question: string,
  answer: string,
  category: string,
  order: number,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  if (!question.trim()) return { error: 'Pergunta obrigatória.' }
  if (!answer.trim())   return { error: 'Resposta obrigatória.' }

  await prisma.faqItem.update({
    where: { id },
    data: {
      question: question.trim(),
      answer:   answer.trim(),
      category: category.trim() || 'Geral',
      order:    order || 0,
    },
  })

  revalidatePath('/admin/suporte/faq')
  revalidatePath('/cliente/suporte')
  return { ok: true }
}

export async function toggleFaq(
  id: string,
  isActive: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  await prisma.faqItem.update({ where: { id }, data: { isActive } })
  revalidatePath('/admin/suporte/faq')
  revalidatePath('/cliente/suporte')
  return { ok: true }
}

export async function deleteFaq(
  id: string,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin()
  await prisma.faqItem.delete({ where: { id } })
  revalidatePath('/admin/suporte/faq')
  revalidatePath('/cliente/suporte')
  return { ok: true }
}
