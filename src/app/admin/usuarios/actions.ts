'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (user?.role !== 'ADMIN') throw new Error('Não autorizado')
  return user.id as string
}

export async function createAdminUser(formData: FormData) {
  await requireAdmin()

  const name     = (formData.get('name')     as string | null)?.trim() ?? ''
  const email    = (formData.get('email')    as string | null)?.trim().toLowerCase() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!name || !email || !password) throw new Error('Preencha todos os campos.')
  if (password.length < 8) throw new Error('Senha deve ter no mínimo 8 caracteres.')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('E-mail já cadastrado.')

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name, email, password: hashed, role: 'ADMIN' },
  })

  revalidatePath('/admin/usuarios')
}
