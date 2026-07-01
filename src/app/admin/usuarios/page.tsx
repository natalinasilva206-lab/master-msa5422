export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { CreateAdminForm } from './CreateAdminForm'

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

const roleLabel: Record<string, string> = {
  ADMIN:  'Admin',
  CLIENT: 'Seller',
}
const roleBadge: Record<string, string> = {
  ADMIN:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
  CLIENT: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
}

interface PageProps {
  searchParams: { q?: string; role?: string }
}

export default async function UsuariosPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const q    = searchParams.q?.trim() ?? ''
  const role = searchParams.role && searchParams.role !== 'todos' ? searchParams.role : undefined

  const where = {
    AND: [
      role ? { role } : {},
      q ? { OR: [
        { name:  { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ] } : {},
    ],
  }

  const [users, totalAdmin, totalClient, totalAll] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { merchant: { select: { id: true, name: true, plan: true, status: true } } },
    }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count(),
  ])

  return (
    <div>
      <Topbar
        title="Usuários e Permissões"
        breadcrumb="Casa › Gestão"
        subtitle={`${totalAll} usuários cadastrados`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* KPIs */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total de Usuários', value: users.length, color: 'text-white',    border: 'border-slate-800/70' },
            { label: 'Administradores',   value: totalAdmin,   color: 'text-purple-400', border: 'border-purple-500/20' },
            { label: 'Sellers',           value: totalClient,  color: 'text-blue-400',   border: 'border-blue-500/20' },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[20px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Filtros */}
        <form method="GET" className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Buscar por nome ou e-mail…"
              className="w-full bg-slate-900/60 border border-slate-800/70 rounded-lg pl-8 pr-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60"
            />
          </div>
          <select
            name="role"
            defaultValue={role ?? 'todos'}
            onChange={(e) => (e.target.form as HTMLFormElement).submit()}
            className="bg-slate-900/60 border border-slate-800/70 rounded-lg px-3 py-2 text-[12px] text-slate-300 focus:outline-none focus:border-blue-500/60"
          >
            <option value="todos">Todos os perfis</option>
            <option value="ADMIN">Admin</option>
            <option value="CLIENT">Seller</option>
          </select>
          <button type="submit" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-[12px] font-medium text-slate-300 transition-colors">
            Buscar
          </button>
          {(q || role) && (
            <a href="/admin/usuarios" className="px-3 py-2 text-[12px] text-slate-500 hover:text-slate-300 transition-colors">
              Limpar
            </a>
          )}
        </form>

        {/* Table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Todos os Usuários</p>
              {(q || role) && (
                <p className="text-[10.5px] text-slate-600 mt-0.5">{users.length} resultado{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <CreateAdminForm />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Usuário', 'E-mail', 'Perfil', 'Empresa vinculada', 'Plano', 'Cadastro'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {users.map((u) => {
                  const initial = (u.name ?? u.email ?? '?').charAt(0).toUpperCase()
                  const badge = roleBadge[u.role] ?? 'bg-slate-700/40 text-slate-400 border-slate-700/40'
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                            {initial}
                          </div>
                          <span className="text-[13px] font-semibold text-slate-200 truncate max-w-[120px]">{u.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-400 truncate max-w-[180px]">{u.email}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge}`}>
                          {roleLabel[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-400 truncate max-w-[160px]">
                        {u.merchant?.name ?? <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-400">
                        {u.merchant?.plan ?? <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-600 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
