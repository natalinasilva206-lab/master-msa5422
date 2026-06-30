export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { MinhaContaTabs } from './MinhaContaTabs'

export default async function MinhaContaPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login')

  const userId = (session.user as any).id as string

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  })

  if (!user) redirect('/login')

  return (
    <div>
      <Topbar
        title="Minha Conta"
        breadcrumb="Casa › Configurações › Minha Conta"
        subtitle="Gerencie suas configurações pessoais"
      />

      <div className="p-4 xl:p-6">
        <MinhaContaTabs user={user} />
      </div>
    </div>
  )
}
