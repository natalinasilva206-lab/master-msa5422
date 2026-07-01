import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CLIENT') redirect('/admin/dashboard')

  const userId = (session.user as any).id as string
  const prefs = await prisma.user.findUnique({
    where:  { id: userId },
    select: { theme: true, accentColor: true },
  })
  const theme       = prefs?.theme       ?? 'dark'
  const accentColor = prefs?.accentColor ?? 'blue'

  return (
    <div
      className="admin-shell flex h-screen overflow-hidden"
      data-theme={theme}
      data-accent={accentColor}
    >
      <Sidebar role="CLIENT" userName={session.user.name ?? 'Cliente'} />
      <main className="flex-1 overflow-y-auto min-w-0 scroll-smooth">{children}</main>
    </div>
  )
}
