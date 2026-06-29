import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { MerchantsFilters } from './_components/MerchantsFilters'
import type { BadgeVariant } from '@/types/ui'

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
const TYPE_BADGE: Record<string, BadgeVariant> = {
  ecommerce: 'info',
  infoprodutor: 'neutral',
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}

export default async function AdminClientesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const q      = params.q?.trim()  ?? ''
  const status = params.status     ?? ''
  const type   = params.type       ?? ''

  const supabase = await createClient()

  let query = supabase
    .from('merchants')
    .select('id, name, email, document, type, status, plan, created_at')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (type)   query = query.eq('type', type)
  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,document.ilike.%${q}%`)
  }

  const { data: merchants } = await query
  const rows = merchants ?? []

  return (
    <div>
      <Topbar
        title="Clientes"
        subtitle="Gerencie e-commerces e infoprodutores cadastrados na Master Pagamentos."
      />

      <div className="p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            {rows.length}{' '}
            {rows.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </p>
          <Button variant="primary" size="md" disabled title="Em breve">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo cliente
          </Button>
        </div>

        {/* Filters — needs Suspense because useSearchParams is async in client */}
        <Suspense fallback={<div className="h-11 bg-slate-800/50 rounded-lg animate-pulse" />}>
          <MerchantsFilters currentQ={q} currentStatus={status} currentType={type} />
        </Suspense>

        {/* Table */}
        <Card>
          {rows.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center gap-3">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-slate-400 text-sm">Nenhum cliente encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -m-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-6 py-3.5 text-slate-400 font-medium whitespace-nowrap">Nome</th>
                    <th className="text-left px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">E-mail</th>
                    <th className="text-left px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">Documento</th>
                    <th className="text-left px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">Tipo</th>
                    <th className="text-left px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">Plano</th>
                    <th className="text-left px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-white font-medium whitespace-nowrap">{m.name}</td>
                      <td className="px-4 py-3.5 text-slate-400">{m.email}</td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">
                        {m.document ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={TYPE_BADGE[m.type] ?? 'neutral'}>
                          {TYPE_LABEL[m.type] ?? m.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={STATUS_BADGE[m.status] ?? 'neutral'}>
                          {STATUS_LABEL[m.status] ?? m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {m.plan ? (
                          <span className="text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                            {m.plan}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('pt-BR')}
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
