export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { EditPlanForm } from './EditPlanForm'

interface PageProps {
  params: { id: string }
  searchParams: { error?: string }
}

export default async function EditarPlanoPage({ params, searchParams }: PageProps) {
  const plan = await prisma.feePlan.findUnique({ where: { id: params.id } })

  if (!plan) {
    return (
      <div>
        <Topbar title="Plano não encontrado" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
          <p className="text-white font-semibold">Plano não encontrado</p>
          <Link href="/admin/taxas" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors">
            Voltar para taxas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar title={`Editar — ${plan.name}`} subtitle="Alterar configuração do plano de taxa" />
      <div className="p-6 max-w-2xl">
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/admin/taxas" className="hover:text-white transition-colors">Taxas</Link>
          <span>/</span>
          <Link href={`/admin/taxas/${plan.id}`} className="hover:text-white transition-colors">{plan.name}</Link>
          <span>/</span>
          <span className="text-white">Editar</span>
        </nav>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Dados do plano</h2>
          </div>
          <EditPlanForm plan={plan} errorKey={searchParams.error ?? null} />
        </div>
      </div>
    </div>
  )
}
