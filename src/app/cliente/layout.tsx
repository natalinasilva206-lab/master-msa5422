import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.app_metadata?.role !== 'client') redirect('/admin/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar role="CLIENT" userName={profile?.name ?? user.email ?? 'Cliente'} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
