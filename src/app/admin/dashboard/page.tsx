import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/types/ui'

const IconBuilding = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)
const IconCheck = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconClock = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const IconLock = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)
const IconTag = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
)

const STATUS_BADGE: Record<string, BadgeVariant> = {
  active: 'success',
  review: 'warning',
  blocked: 'danger',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  review: 'Em análise',
  blocked: 'Bloqueado',
}

const TYPE_LABEL: Record<string, string> = {
  ecommerce: 'E-commerce',
  infoprodutor: 'Infoprodutor',
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const [{ data: merchants }, { count: feePlansCount }] = await Promise.all([
    supabase
      .from('merchants')
      .select('id, name, email, type, status, plan, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('fee_plans')
      .select('id', { count: 'exact', head: true }),
  ])

  const total   = merchants?.length ?? 0
  const active  = merchants?.filter((m) => m.status === 'active').length ?? 0
  const review  = merchants?.filter((m) => m.status === 'review').length ?? 0
  const blocked = merchants?.filter((m) => m.status === 'blocked').length ?? 0
  const recent  = merchants?.slice(0, 5) ?? []

  const stats = [
    { title: 'Total de Merchants', value: String(total),         subtitle: 'Cadastrados na plataforma', accent: 'blue',   icon: IconBuilding },
    { title: 'Merchants Ativos',   value: String(active),        subtitle: 'Com status ativo',           accent: 'green',  icon: IconCheck    },
    { title: 'Em Análise',         value: String(review),        subtitle: 'Aguardando aprovação',       accent: 'amber',  icon: IconClock    },
    { title: 'Bloqueados',         value: String(blocked),       subtitle: 'Acesso suspenso',            accent: 'purple', icon: IconLock     },
    { title: 'Planos de Taxa',     value: String(feePlansCount ?? 0), subtitle: 'Planos disponíveis',   accent: 'blue',   icon: IconTag      },
  ]

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Visão geral da plataforma" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>

        <Card title="Últimos Merchants Cadastrados">
          {recent.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum merchant cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">E-mail</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Plano</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-slate-400">{m.email}</td>
                      <td className="px-4 py-3 text-slate-400">{TYPE_LABEL[m.type] ?? m.type}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[m.status] ?? 'neutral'}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                          {m.plan ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
