'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dispatchWebhook } from '@/lib/dispatchWebhook'
import { headers } from 'next/headers'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')
  return session
}

function getIp(): string {
  return headers().get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers().get('x-real-ip')
    ?? 'desconhecido'
}

export async function approveMerchant(merchantId: string) {
  const session = await requireAdmin()
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'ACTIVE' } })
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'APPROVE_MERCHANT_KYC',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'ACTIVE' }),
    },
  })
  dispatchWebhook(merchantId, 'merchant.activated', { merchantId, newStatus: 'ACTIVE' }).catch(() => {})
  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}

export async function rejectMerchant(merchantId: string) {
  const session = await requireAdmin()
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'BLOCKED' } })
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'KYC_REJECTED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'BLOCKED' }),
    },
  })
  dispatchWebhook(merchantId, 'merchant.blocked', { merchantId, newStatus: 'BLOCKED' }).catch(() => {})
  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}

export async function blockMerchant(merchantId: string) {
  return rejectMerchant(merchantId)
}

export async function reactivateMerchant(merchantId: string) {
  const session = await requireAdmin()
  await prisma.merchant.update({ where: { id: merchantId }, data: { status: 'REVIEW' } })
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'KYC_REACTIVATED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ newStatus: 'REVIEW' }),
    },
  })
  revalidatePath('/admin/kyc')
  revalidatePath('/admin/clientes')
}

export async function requestCall(merchantId: string) {
  const session = await requireAdmin()
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'KYC_CALL_REQUESTED',
      entity: 'Merchant',
      entityId: merchantId,
      metadata: JSON.stringify({ requestedAt: new Date().toISOString() }),
    },
  })
  revalidatePath('/admin/kyc')
}

type KycDoc = { type: string; label: string; url: string }

function parseDocs(raw: string | null): KycDoc[] {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') return { type: 'OTHER', label: 'Documento', url: item }
      return item as KycDoc
    })
  } catch { return [] }
}

export async function addKycDocument(merchantId: string, url: string, type = 'OTHER', label = 'Documento') {
  const session = await requireAdmin()
  const admin   = session.user as any

  const merchant = await prisma.merchant.findUnique({
    where:  { id: merchantId },
    select: { name: true, kycDocumentUrls: true },
  })
  if (!merchant) throw new Error('Merchant não encontrado.')

  const before   = parseDocs((merchant as any).kycDocumentUrls)
  const docs     = [...before]
  const existingIdx = docs.findIndex((d) => d.type === type)
  const newDoc: KycDoc = { type, label, url }
  const replaced = existingIdx >= 0 ? docs[existingIdx] : null
  if (existingIdx >= 0) { docs[existingIdx] = newDoc } else { docs.push(newDoc) }

  await prisma.$transaction([
    prisma.merchant.update({
      where: { id: merchantId },
      data:  { kycDocumentUrls: JSON.stringify(docs) } as any,
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'KYC_DOCUMENT_ADDED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantId,
          merchantName:    merchant.name,
          documentType:    type,
          documentLabel:   label,
          documentUrl:     url,
          replacedDoc:     replaced ?? null,
          totalDocsAfter:  docs.length,
          adminName:       admin.name,
          adminEmail:      admin.email,
          ip:              getIp(),
          addedAt:         new Date().toISOString(),
        }),
      },
    }),
  ])

  revalidatePath('/admin/kyc')
}

export async function removeKycDocument(merchantId: string, url: string) {
  const session = await requireAdmin()
  const admin   = session.user as any

  const merchant = await prisma.merchant.findUnique({
    where:  { id: merchantId },
    select: { name: true, kycDocumentUrls: true },
  })
  if (!merchant) return

  const before  = parseDocs((merchant as any).kycDocumentUrls)
  const removed = before.find((d) => d.url === url) ?? null
  const docs    = before.filter((d) => d.url !== url)

  await prisma.$transaction([
    prisma.merchant.update({
      where: { id: merchantId },
      data:  { kycDocumentUrls: JSON.stringify(docs) } as any,
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   'KYC_DOCUMENT_REMOVED',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          merchantId,
          merchantName:    merchant.name,
          documentType:    removed?.type  ?? 'UNKNOWN',
          documentLabel:   removed?.label ?? 'Documento',
          documentUrl:     url,
          totalDocsBefore: before.length,
          totalDocsAfter:  docs.length,
          adminName:       admin.name,
          adminEmail:      admin.email,
          ip:              getIp(),
          removedAt:       new Date().toISOString(),
        }),
      },
    }),
  ])

  revalidatePath('/admin/kyc')
}

export async function requestAdjustment(merchantId: string, note: string) {
  const session = await requireAdmin()
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'KYC_ADJUSTMENT_REQUESTED',
        entity: 'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({ note, requestedAt: new Date().toISOString() }),
      },
    }),
    prisma.merchant.update({
      where: { id: merchantId },
      data: { kycNotes: note } as any,
    }),
  ])
  revalidatePath('/admin/kyc')
  revalidatePath('/cliente/kyc')
}
