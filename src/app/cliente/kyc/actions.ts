'use server'

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type KycDoc = { type: string; label: string; url: string }

const PIX_TYPE_LABELS: Record<string, string> = {
  CPF: 'CPF', CNPJ: 'CNPJ', EMAIL: 'E-mail', PHONE: 'Telefone', RANDOM: 'Chave aleatória',
}

async function getMerchant() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) throw new Error('Não autenticado')
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  if (!user?.merchant) throw new Error('Merchant não encontrado')
  return user.merchant
}

function parseDocs(raw: string | null): KycDoc[] {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') return { type: 'OTHER', label: 'Documento', url: item }
      return item as KycDoc
    })
  } catch { return [] }
}

export async function submitKycDocument(type: string, label: string, url: string): Promise<{ error?: string }> {
  try {
    const merchant = await getMerchant()
    const docs = parseDocs((merchant as any).kycDocumentUrls)
    const existingIdx = docs.findIndex((d) => d.type === type)
    const newDoc: KycDoc = { type, label, url }
    if (existingIdx >= 0) {
      docs[existingIdx] = newDoc
    } else {
      docs.push(newDoc)
    }
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { kycDocumentUrls: JSON.stringify(docs) } as any,
    })
    await prisma.auditLog.create({
      data: {
        userId: (await getServerSession(authOptions))!.user!.id,
        action: 'KYC_DOCUMENT_SUBMITTED',
        entity: 'Merchant',
        entityId: merchant.id,
        metadata: JSON.stringify({ type, label }),
      },
    })
    revalidatePath('/cliente/kyc')
    return {}
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao salvar documento.' }
  }
}

export async function removeKycDocument(type: string): Promise<{ error?: string }> {
  try {
    const merchant = await getMerchant()
    const docs = parseDocs((merchant as any).kycDocumentUrls).filter((d) => d.type !== type)
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { kycDocumentUrls: JSON.stringify(docs) } as any,
    })
    revalidatePath('/cliente/kyc')
    return {}
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao remover documento.' }
  }
}

export async function saveBankInfo(pixKey: string, pixKeyType: string, bankName: string): Promise<{ error?: string }> {
  try {
    if (!PIX_TYPE_LABELS[pixKeyType]) return { error: 'Tipo de chave inválido.' }
    if (!pixKey.trim()) return { error: 'Informe a chave PIX.' }
    const merchant = await getMerchant()
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { pixKey: pixKey.trim(), pixKeyType, bankName: bankName.trim() || null } as any,
    })
    await prisma.auditLog.create({
      data: {
        userId: (await getServerSession(authOptions))!.user!.id,
        action: 'KYC_BANK_INFO_SAVED',
        entity: 'Merchant',
        entityId: merchant.id,
        metadata: JSON.stringify({ pixKeyType, bankName }),
      },
    })
    revalidatePath('/cliente/kyc')
    return {}
  } catch (e: any) {
    return { error: e.message ?? 'Erro ao salvar dados bancários.' }
  }
}
