import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if ((session.user as any).role !== 'CLIENT') redirect('/admin/dashboard')

  return (
    <div className="flex h-screen overflow-hidden bg-[#080c12]">
      <Sidebar role="CLIENT" userName={session.user.name ?? 'Cliente'} />
      <main className="flex-1 overflow-y-auto min-w-0 scroll-smooth">{children}</main>
    </div>
  )
}
