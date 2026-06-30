import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/cliente/dashboard')

  // Always read fresh from DB so theme updates apply on next navigation
  const userId = (session.user as any).id as string
  const prefs = await prisma.user.findUnique({
    where: { id: userId },
    select: { theme: true, accentColor: true },
  }).catch(() => null)

  const theme       = prefs?.theme       ?? (session.user as any).theme       ?? 'dark'
  const accentColor = prefs?.accentColor ?? (session.user as any).accentColor ?? 'blue'

  return (
    <div
      className="admin-shell flex h-screen overflow-hidden"
      data-theme={theme}
      data-accent={accentColor}
    >
      <Sidebar role="ADMIN" userName={session.user.name ?? 'Admin'} />
      <main className="flex-1 overflow-y-auto min-w-0 scroll-smooth">{children}</main>
    </div>
  )
}
