'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function requireClient() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'CLIENT') redirect('/login')
  return session
}

/* ── Perfil pessoal ── */
export async function updateSellerProfile(formData: FormData) {
  const session = await requireClient()
  const userId  = (session.user as any).id as string

  const name  = (formData.get('name')  as string | null)?.trim() ?? ''
  const phone = (formData.get('phone') as string | null)?.trim() ?? ''

  if (!name) return { error: 'Nome é obrigatório.' }

  await prisma.user.update({
    where: { id: userId },
    data:  { name, phone: phone || null },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'UPDATE_PROFILE',
      entity:   'User',
      entityId: userId,
      metadata: JSON.stringify({ name, phone, updatedAt: new Date().toISOString() }),
    },
  })

  revalidatePath('/cliente/minha-conta')
  return { success: true }
}

/* ── Dados da empresa (campos editáveis) ── */
export async function updateMerchantInfo(formData: FormData) {
  const session  = await requireClient()
  const userId   = (session.user as any).id as string

  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: {
      merchant: {
        select: {
          id: true, status: true, type: true,
          tradeName: true, commercialPhone: true, website: true,
          instagram: true, segment: true, address: true,
          legalRepresentative: true,
        },
      },
    },
  })
  const merchant = user?.merchant
  if (!merchant) return { error: 'Empresa não encontrada.' }

  // Fields that can be edited
  const editableFields: Record<string, string | null> = {
    type:               (formData.get('type')               as string | null)?.trim() || null,
    tradeName:          (formData.get('tradeName')           as string | null)?.trim() || null,
    commercialPhone:    (formData.get('commercialPhone')     as string | null)?.trim() || null,
    website:            (formData.get('website')             as string | null)?.trim() || null,
    instagram:          (formData.get('instagram')           as string | null)?.trim() || null,
    segment:            (formData.get('segment')             as string | null)?.trim() || null,
    address:            (formData.get('address')             as string | null)?.trim() || null,
    legalRepresentative:(formData.get('legalRepresentative') as string | null)?.trim() || null,
  }

  const validTypes = ['ECOMMERCE', 'INFOPRODUTOR', 'SERVICOS', 'MARKETPLACE']
  if (editableFields.type && !validTypes.includes(editableFields.type))
    return { error: 'Tipo de negócio inválido.' }

  // Build diff for audit log
  const fieldLabels: Record<string, string> = {
    type:               'Tipo de negócio',
    tradeName:          'Nome fantasia',
    commercialPhone:    'Telefone comercial',
    website:            'Site',
    instagram:          'Instagram',
    segment:            'Segmento',
    address:            'Endereço',
    legalRepresentative:'Responsável legal',
  }
  const prev: Record<string, string | null> = {
    type:               merchant.type,
    tradeName:          merchant.tradeName,
    commercialPhone:    merchant.commercialPhone,
    website:            merchant.website,
    instagram:          merchant.instagram,
    segment:            merchant.segment,
    address:            merchant.address,
    legalRepresentative:merchant.legalRepresentative,
  }

  const changes: Array<{ field: string; label: string; from: string | null; to: string | null }> = []
  for (const [key, newVal] of Object.entries(editableFields)) {
    const oldVal = prev[key] ?? null
    if (newVal !== oldVal) {
      changes.push({ field: key, label: fieldLabels[key] ?? key, from: oldVal, to: newVal })
    }
  }

  if (changes.length === 0) return { success: true }

  // Sensitive fields that trigger a review status when changed
  const sensitiveFields = ['address', 'legalRepresentative']
  const hasSensitiveChange = changes.some(c => sensitiveFields.includes(c.field))

  const updateData: Record<string, string | null | undefined> = {}
  for (const [key, val] of Object.entries(editableFields)) {
    updateData[key] = val ?? null
  }
  if (hasSensitiveChange && merchant.status === 'ACTIVE') {
    updateData.status = 'REVIEW'
  }

  await prisma.merchant.update({
    where: { id: merchant.id },
    data:  updateData as any,
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'UPDATE_MERCHANT_INFO',
      entity:   'Merchant',
      entityId: merchant.id,
      metadata: JSON.stringify({
        changes,
        sensitiveReview: hasSensitiveChange && merchant.status === 'ACTIVE',
        updatedAt: new Date().toISOString(),
      }),
    },
  })

  revalidatePath('/cliente/minha-conta')
  return {
    success: true,
    changesCount: changes.length,
    statusChangedToReview: hasSensitiveChange && merchant.status === 'ACTIVE',
  }
}

/* ── Alterar senha ── */
export async function changeSellerPassword(formData: FormData) {
  const session = await requireClient()
  const userId  = (session.user as any).id as string

  const currentPassword = (formData.get('currentPassword') as string | null) ?? ''
  const newPassword     = (formData.get('newPassword')     as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (!currentPassword || !newPassword || !confirmPassword) return { error: 'Preencha todos os campos.' }
  if (newPassword.length < 8)          return { error: 'A nova senha deve ter ao menos 8 caracteres.' }
  if (newPassword !== confirmPassword) return { error: 'As senhas não coincidem.' }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Usuário não encontrado.' }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return { error: 'Senha atual incorreta.' }

  const now    = new Date()
  const hashed = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data:  { password: hashed, passwordChangedAt: now },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'CHANGE_PASSWORD',
      entity:   'User',
      entityId: userId,
      metadata: JSON.stringify({ changedAt: now.toISOString(), sessionsInvalidated: true }),
    },
  })

  return { success: true }
}

/* ── Encerrar sessões ── */
export async function revokeSellerSessions() {
  const session = await requireClient()
  const userId  = (session.user as any).id as string

  await prisma.user.update({
    where: { id: userId },
    data:  { passwordChangedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'SESSION_REVOKED',
      entity:   'User',
      entityId: userId,
      metadata: JSON.stringify({ revokedAt: new Date().toISOString(), revokedBy: 'self' }),
    },
  })

  return { success: true }
}

/* ── Tema ── */
export async function saveSellerTheme(theme: string, accentColor: string) {
  const session = await requireClient()
  const userId  = (session.user as any).id as string

  const validThemes  = ['dark', 'darker', 'system', 'light']
  const validAccents = ['blue', 'violet', 'emerald', 'rose', 'amber']
  if (!validThemes.includes(theme))        return { error: 'Tema inválido.' }
  if (!validAccents.includes(accentColor)) return { error: 'Cor inválida.' }

  await prisma.user.update({
    where: { id: userId },
    data:  { theme, accentColor },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action:   'UPDATE_THEME',
      entity:   'User',
      entityId: userId,
      metadata: JSON.stringify({ theme, accentColor, updatedAt: new Date().toISOString() }),
    },
  })

  revalidatePath('/cliente')
  return { success: true }
}
