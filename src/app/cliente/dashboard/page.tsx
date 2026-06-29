import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/types/ui'

const STATUS_BADGE: Record<string, BadgeVariant> = {
  active: 'success',
  blocked: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  blocked: 'Bloqueada',
}
const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  client: 'Cliente',
}

const IconWallet = (
  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
)
const IconChart = (
  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)
const IconTrend = (
  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

export default async function ClienteDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role, status')
    .eq('id', user.id)
    .single()

  const name   = profile?.name   ?? user.email ?? 'Usuário'
  const email  = profile?.email  ?? user.email ?? '—'
  const role   = profile?.role   ?? 'client'
  const status = profile?.status ?? 'active'

  return (
    <div>
      <Topbar title="Meu Dashboard" subtitle={`Bem-vindo, ${name}`} />
      <div className="p-6 space-y-6">

        {/* Perfil */}
        <Card title="Minha Conta">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nome</p>
              <p className="text-white font-semibold">{name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">E-mail</p>
              <p className="text-slate-300 text-sm break-all">{email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Perfil</p>
              <Badge variant="info">{ROLE_LABEL[role] ?? role}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Status</p>
              <Badge variant={STATUS_BADGE[status] ?? 'neutral'}>
                {STATUS_LABEL[status] ?? status}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Placeholders financeiros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlaceholderCard
            icon={IconWallet}
            label="Saldo Disponível"
            accent="emerald"
          />
          <PlaceholderCard
            icon={IconChart}
            label="Volume Transacionado"
            accent="blue"
          />
          <PlaceholderCard
            icon={IconTrend}
            label="Rendimento Previsto"
            accent="purple"
          />
        </div>

      </div>
    </div>
  )
}

function PlaceholderCard({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode
  label: string
  accent: 'emerald' | 'blue' | 'purple'
}) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-500/10',
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
  }
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${bg[accent]}`}>
        {icon}
      </div>
      <p className="text-slate-400 text-sm mb-2">{label}</p>
      <div className="h-7 w-32 bg-slate-700/50 rounded-lg animate-pulse" />
      <p className="text-slate-600 text-xs mt-3">Disponível em breve</p>
    </div>
  )
}
