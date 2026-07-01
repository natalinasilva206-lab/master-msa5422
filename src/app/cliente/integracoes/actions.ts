'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateApiKey } from '@/lib/apiKey'

export async function gerarApiKey(): Promise<{ ok: boolean; apiKey?: string; error?: string }> {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return { ok: false, error: 'Não autenticado' }

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { merchantId: true },
  })
  if (!user?.merchantId) return { ok: false, error: 'Merchant não encontrado' }

  const newKey = generateApiKey()
  await prisma.merchant.update({
    where:  { id: user.merchantId },
    data:   { apiKey: newKey },
  })

  return { ok: true, apiKey: newKey }
}
