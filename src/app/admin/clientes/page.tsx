export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import Link from 'next/link'
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
  MARKETPLACE: 'Marketplace',
  SERVICOS: 'Serviços',
}

const planDot: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-400',
  Prime:  'bg-purple-400',
  Black:  'bg-slate-200',
}

const avatarGradients = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-700',
  'from-pink-500 to-pink-700',
  'from-teal-500 to-teal-700',
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const PAGE_SIZE = 30

interface PageProps {
  searchParams: { q?: string; status?: string; type?: string; page?: string }
}

async function KpiCards() {
  const [total, ativos, revisao, bloqueados, saldos] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'ACTIVE' } }),
    prisma.merchant.count({ where: { status: 'REVIEW' } }),
    prisma.merchant.count({ where: { status: 'BLOCKED' } }),
    prisma.merchant.aggregate({ _sum: { balance: true } }),
  ])
  const totalBalance = saldos._sum.balance ?? 0

  const cards = [
    { label: 'Total de Empresas', value: String(total), sub: 'cadastradas na plataforma', color: 'text-white', bg: 'bg-blue-500/10 text-blue-500', border: 'border-slate-800/70', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Ativas', value: String(ativos), sub: 'com acesso completo', color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Em Revisão', value: String(revisao), sub: 'aguardando KYC', color: revisao > 0 ? 'text-amber-400' : 'text-slate-600', bg: 'bg-amber-500/10 text-amber-500', border: revisao > 0 ? 'border-amber-500/20' : 'border-slate-800/70', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { label: 'Bloqueadas', value: String(bloqueados), sub: 'acesso suspenso', color: bloqueados > 0 ? 'text-red-400' : 'text-slate-600', bg: 'bg-red-500/10 text-red-500', border: 'border-slate-800/70', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
    { label: 'Saldo Total', value: `R$ ${formatBRL(totalBalance)}`, sub: 'em custódia', color: 'text-emerald-400', bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-emerald-500/20', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  ]

  return (
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4 hover:bg-slate-800/40 transition-colors`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[12px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${c.bg}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

async function MerchantsTable({ q, status, type, page }: { q?: string; status?: string; type?: string; page?: string }) {
  const currentPage = Math.max(1, parseInt(page ?? '1'))
  const where = {
    AND: [
      status ? { status } : {},
      type ? { type } : {},
      q ? { OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { document: { contains: q, mode: 'insensitive' as const } },
      ] } : {},
    ],
  }
  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.merchant.count({ where }),
  ])
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (merchants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-[13px] font-medium">Nenhuma empresa encontrada</p>
        <p className="text-[11px] text-slate-700 mt-1">Tente ajustar os filtros ou cadastre uma nova empresa.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800/60">
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Plano</th>
            <th className="text-right px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Saldo</th>
            <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Cadastro</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {merchants.map((m, i) => (
            <tr key={m.id} className="hover:bg-slate-800/25 transition-colors group">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                    {getInitials(m.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{m.name}</p>
                    <p className="text-[12px] text-slate-600 truncate">{m.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 hidden sm:table-cell">
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-800/50 px-2.5 py-0.5 rounded-md">
                  {typeLabel[m.type] ?? m.type}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <Badge variant={statusVariant[m.status] ?? 'neutral'}>
                  {statusLabel[m.status] ?? m.status}
                </Badge>
              </td>
              <td className="px-4 py-3.5 hidden md:table-cell">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${planDot[m.plan] ?? 'bg-slate-500'}`} />
                  {m.plan}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                <span className={`text-[13px] font-semibold tabular-nums ${m.balance > 0 ? 'text-emerald-400' : 'text-slate-700'}`}>
                  R$ {formatBRL(m.balance)}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                <span className="text-[12px] text-slate-600">
                  {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </td>
              <td className="px-5 py-3.5 text-right">
                <Link
                  href={`/admin/clientes/${m.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-blue-400 hover:text-white hover:bg-blue-600 border border-blue-500/30 hover:border-blue-600 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between gap-4 flex-wrap">
        <span className="text-[11px] text-slate-700">
          {total} {total === 1 ? 'empresa encontrada' : 'empresas encontradas'}
          {totalPages > 1 && ` · Página ${currentPage} de ${totalPages}`}
        </span>
        <div className="flex items-center gap-2">
          {currentPage > 1 && (
            <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(type ? { type } : {}), page: String(currentPage - 1) })}`}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-300 bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-lg transition-colors">
              ← Anterior
            </Link>
          )}
          {currentPage < totalPages && (
            <Link href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(type ? { type } : {}), page: String(currentPage + 1) })}`}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-300 bg-slate-800 border border-slate-700/50 px-2.5 py-1 rounded-lg transition-colors">
              Próxima →
            </Link>
          )}
          <Link href="/admin/clientes/novo" className="text-[11px] font-medium text-slate-600 hover:text-blue-400 transition-colors ml-2">
            + Nova empresa
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AdminClientesPage({ searchParams }: PageProps) {
  const { q, status, type } = searchParams

  return (
    <div>
      <Topbar
        title="Empresas"
        breadcrumb="Casa › Operações"
        subtitle="E-commerces e infoprodutores cadastrados na plataforma"
      />
      <div className="p-4 xl:p-6 space-y-4">

        <Suspense fallback={<div className="h-[88px] bg-slate-900/40 rounded-xl animate-pulse" />}>
          <KpiCards />
        </Suspense>

        {/* Header row */}
        <div className="flex items-center justify-between">
          <Suspense>
            <ClientesFilters />
          </Suspense>
          <Link
            href="/admin/clientes/novo"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[12.5px] font-semibold rounded-lg transition-colors shrink-0 ml-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova empresa
          </Link>
        </div>

        {/* Table */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Todas as empresas</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Clique em "Ver" para gerenciar cada empresa</p>
            </div>
          </div>
          <Suspense fallback={<div className="py-16 text-center text-slate-600 text-sm">Carregando...</div>}>
            <MerchantsTable q={q} status={status} type={type} page={searchParams.page} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
