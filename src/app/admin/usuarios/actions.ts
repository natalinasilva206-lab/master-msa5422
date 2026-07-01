'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!session || user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return user as { id: string; name: string; email: string; role: string }
}

export async function createAdminUser(formData: FormData) {
  const admin = await requireAdmin()

  const name     = (formData.get('name')     as string | null)?.trim() ?? ''
  const email    = (formData.get('email')    as string | null)?.trim().toLowerCase() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!name || !email || !password) throw new Error('Preencha todos os campos.')
  if (password.length < 8) throw new Error('Senha deve ter no mínimo 8 caracteres.')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('E-mail já cadastrado.')

  const hashed = await bcrypt.hash(password, 12)

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? headers().get('x-real-ip')
    ?? null

  const newUser = await prisma.user.create({
    data: { name, email, password: hashed, role: 'ADMIN' },
    select: { id: true, name: true, email: true, role: true },
  })

  await prisma.auditLog.create({
    data: {
      userId:   admin.id,
      action:   'ADMIN_USER_CREATED',
      entity:   'User',
      entityId: newUser.id,
      metadata: JSON.stringify({
        createdUserId:    newUser.id,
        createdUserEmail: newUser.email,
        createdUserName:  newUser.name,
        createdUserRole:  newUser.role,
        adminId:          admin.id,
        adminName:        admin.name,
        adminEmail:       admin.email,
        ip:               ip ?? 'desconhecido',
        createdAt:        new Date().toISOString(),
      }),
    },
  })

  revalidatePath('/admin/usuarios')
}
