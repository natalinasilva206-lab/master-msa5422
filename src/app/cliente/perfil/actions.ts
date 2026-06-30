'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function changePassword(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Error('Sessão inválida.')

  const currentPassword = (formData.get('currentPassword') as string | null) ?? ''
  const newPassword     = (formData.get('newPassword') as string | null) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) ?? ''

  if (!currentPassword || !newPassword || !confirmPassword) throw new Error('Preencha todos os campos.')
  if (newPassword.length < 8) throw new Error('Nova senha deve ter no mínimo 8 caracteres.')
  if (newPassword !== confirmPassword) throw new Error('Confirmação de senha não confere.')

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.password) throw new Error('Usuário não encontrado.')

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new Error('Senha atual incorreta.')

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })
}
