export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { MinhaContaTabs } from './MinhaContaTabs'

const SECURITY_ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'CHANGE_PASSWORD',
  'UPDATE_PROFILE', 'UPDATE_THEME', 'SESSION_REVOKED',
  'APPROVE_MERCHANT_KYC', 'KYC_REJECTED',
]

export default async function MinhaContaPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'ADMIN') redirect('/login')

  const userId = (session.user as any).id as string

  const [user, securityLogs] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        theme: true, accentColor: true,
        lastLoginAt: true, lastLoginIp: true, lastLoginUa: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where:   { userId, action: { in: SECURITY_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take:    30,
      select:  { id: true, action: true, metadata: true, createdAt: true },
    }),
  ])

  if (!user) redirect('/login')

  return (
    <div>
      <Topbar
        title="Minha Conta"
        breadcrumb="Casa › Configurações › Minha Conta"
        subtitle="Gerencie suas configurações pessoais"
      />

      <div className="p-4 xl:p-6">
        <MinhaContaTabs user={user} securityLogs={securityLogs} tokenIat={(session.user as any).tokenIat ?? null} />
      </div>
    </div>
  )
}
