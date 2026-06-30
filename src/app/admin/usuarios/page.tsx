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

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { merchant: { select: { id: true, name: true, plan: true, status: true } } },
  })

  const totalAdmin  = users.filter((u) => u.role === 'ADMIN').length
  const totalClient = users.filter((u) => u.role === 'CLIENT').length

  return (
    <div>
      <Topbar
        title="Usuários e Permissões"
        breadcrumb="Casa › Gestão"
        subtitle={`${users.length} usuários cadastrados`}
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
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[24px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </section>

        {/* Table */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Todos os Usuários</p>
            <CreateAdminForm />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Usuário', 'E-mail', 'Perfil', 'Empresa vinculada', 'Plano', 'Cadastro'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9.5px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                            {initial}
                          </div>
                          <span className="font-semibold text-slate-200 truncate max-w-[120px]">{u.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[180px]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge}`}>
                          {roleLabel[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[160px]">
                        {u.merchant?.name ?? <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {u.merchant?.plan ?? <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(u.createdAt)}</td>
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
