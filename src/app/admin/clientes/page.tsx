import { Suspense } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { ClientesFilters } from './ClientesFilters'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  REVIEW: 'Em análise',
}

const statusVariant: Record<string, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  BLOCKED: 'danger',
  REVIEW: 'warning',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

interface PageProps {
  searchParams: { q?: string; status?: string; type?: string }
}

async function MerchantsTable({ q, status, type }: { q?: string; status?: string; type?: string }) {
  const merchants = await prisma.merchant.findMany({
    where: {
      AND: [
        status ? { status } : {},
        type ? { type } : {},
        q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { document: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
  })

  if (merchants.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        Nenhum cliente encontrado com os filtros aplicados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">E-mail</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Documento</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Tipo</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Plano</th>
            <th className="text-left px-4 py-3 text-slate-400 font-medium">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {merchants.map((m) => (
            <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{m.name}</td>
              <td className="px-4 py-3 text-slate-300">{m.email}</td>
              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{m.document}</td>
              <td className="px-4 py-3 text-slate-400">{typeLabel[m.type] ?? m.type}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant[m.status] ?? 'neutral'}>
                  {statusLabel[m.status] ?? m.status}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-700 text-slate-300">
                  {m.plan}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs">
                {new Date(m.createdAt).toLocaleDateString('pt-BR')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-slate-500 text-xs px-4 pt-3">
        {merchants.length} {merchants.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
      </p>
    </div>
  )
}

export default function AdminClientesPage({ searchParams }: PageProps) {
  const { q, status, type } = searchParams

  return (
    <div>
      <Topbar title="Clientes" subtitle="E-commerces e infoprodutores cadastrados na plataforma" />
      <div className="p-6 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">
            Todos os clientes
          </h2>
          <button
            disabled
            title="Disponível em breve"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg opacity-50 cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo cliente
          </button>
        </div>

        {/* Filters */}
        <Suspense>
          <ClientesFilters />
        </Suspense>

        {/* Table */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <Suspense
            fallback={
              <div className="text-center py-16 text-slate-500 text-sm">Carregando...</div>
            }
          >
            <MerchantsTable q={q} status={status} type={type} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
