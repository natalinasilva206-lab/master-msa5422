export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { ClienteContaTabs } from './ClienteContaTabs'

const SECURITY_ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'CHANGE_PASSWORD',
  'UPDATE_PROFILE', 'UPDATE_MERCHANT_INFO', 'UPDATE_THEME', 'SESSION_REVOKED',
]

export default async function ClienteMinhaContaPage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'CLIENT') redirect('/login')

  const userId = (session.user as any).id as string

  const [user, securityLogs] = await Promise.all([
    prisma.user.findUnique({
      where:   { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        theme: true, accentColor: true,
        lastLoginAt: true, lastLoginIp: true, lastLoginUa: true,
        createdAt: true,
        merchant: {
          select: {
            id: true, name: true, email: true, document: true,
            type: true, status: true, plan: true, cdiRate: true,
            balance: true, pendingBalance: true,
            createdAt: true,
          },
        },
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
        subtitle="Gerencie sua conta e empresa"
      />

      <div className="p-4 xl:p-6">
        <ClienteContaTabs
          user={user}
          merchant={user.merchant ?? null}
          securityLogs={securityLogs}
          tokenIat={(session.user as any).tokenIat ?? null}
        />
      </div>
    </div>
  )
}
