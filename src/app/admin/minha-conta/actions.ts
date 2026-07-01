'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login')
  return session
}

export async function updateProfile(formData: FormData) {
  const session = await requireAdmin()
  const userId = (session.user as any).id as string

  const name  = (formData.get('name') as string | null)?.trim() ?? ''
  const phone = (formData.get('phone') as string | null)?.trim() ?? ''

  if (!name) return { error: 'Nome é obrigatório.' }

  await prisma.user.update({
    where: { id: userId },
    data: { name, phone: phone || null },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE_PROFILE',
      entity: 'User',
      entityId: userId,
      metadata: JSON.stringify({ name, phone, updatedAt: new Date().toISOString() }),
    },
  })

  revalidatePath('/admin/minha-conta')
  return { success: true }
}

export async function changePassword(formData: FormData) {
  const session = await requireAdmin()
  const userId = (session.user as any).id as string

  const currentPassword = (formData.get('currentPassword') as string | null) ?? ''
  const newPassword     = (formData.get('newPassword') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (!currentPassword || !newPassword || !confirmPassword)
    return { error: 'Preencha todos os campos.' }

  if (newPassword.length < 8)
    return { error: 'A nova senha deve ter ao menos 8 caracteres.' }

  if (newPassword !== confirmPassword)
    return { error: 'As senhas não coincidem.' }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Usuário não encontrado.' }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return { error: 'Senha atual incorreta.' }

  const now = new Date()
  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, passwordChangedAt: now },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: userId,
      metadata: JSON.stringify({ changedAt: now.toISOString(), sessionsInvalidated: true }),
    },
  })

  return { success: true }
}

export async function saveTheme(theme: string, accentColor: string) {
  const session = await requireAdmin()
  const userId = (session.user as any).id as string

  const validThemes  = ['dark', 'darker', 'system', 'light']
  const validAccents = ['blue', 'violet', 'emerald', 'rose', 'amber']
  if (!validThemes.includes(theme))        return { error: 'Tema inválido.' }
  if (!validAccents.includes(accentColor)) return { error: 'Cor inválida.' }

  await prisma.user.update({
    where: { id: userId },
    data: { theme, accentColor },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE_THEME',
      entity: 'User',
      entityId: userId,
      metadata: JSON.stringify({ theme, accentColor, updatedAt: new Date().toISOString() }),
    },
  })

  revalidatePath('/admin')
  return { success: true }
}

export async function revokeAllSessions() {
  const session = await requireAdmin()
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
