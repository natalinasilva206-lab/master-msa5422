export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { DeleteButton } from './DeleteButton'

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-slate-700/40 last:border-0">
      <span className="text-slate-400 text-sm w-48 shrink-0">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export default async function PlanoDetalhesPage({ params }: PageProps) {
  const plan = await prisma.feePlan.findUnique({ where: { id: params.id } })

  if (!plan) {
    return (
      <div>
        <Topbar title="Plano não encontrado" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
          <p className="text-white font-semibold">Plano não encontrado</p>
          <Link href="/admin/taxas" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors">
            Voltar para taxas
          </Link>
        </div>
      </div>
    )
  }

  const margin = plan.chargedPercent - plan.costPercent
  const marginFixed = plan.chargedFixed - plan.costFixed

  return (
    <div>
      <Topbar title={plan.name} subtitle="Detalhes do plano de taxa" />
      <div className="p-6 space-y-6 max-w-2xl">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/admin/taxas" className="hover:text-white transition-colors">Taxas</Link>
          <span>/</span>
          <span className="text-white">{plan.name}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/taxas"
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
          <Link
            href={`/admin/taxas/${plan.id}/editar`}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Link>
          <DeleteButton id={plan.id} name={plan.name} />
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Configuração do plano</h2>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="Nome" value={plan.name} />
            <InfoRow label="Taxa cobrada (%)" value={`${plan.chargedPercent.toFixed(2)}%`} />
            <InfoRow label="Taxa cobrada fixa" value={`R$ ${plan.chargedFixed.toFixed(2)}`} />
            <InfoRow label="Custo (%)" value={`${plan.costPercent.toFixed(2)}%`} />
            <InfoRow label="Custo fixo" value={`R$ ${plan.costFixed.toFixed(2)}`} />
            <InfoRow
              label="Margem percentual"
              value={<span className="text-green-400 font-semibold">{margin.toFixed(2)}%</span>}
            />
            <InfoRow
              label="Margem fixa"
              value={<span className="text-green-400 font-semibold">R$ {marginFixed.toFixed(2)}</span>}
            />
            <InfoRow label="Criado em" value={new Date(plan.createdAt).toLocaleString('pt-BR')} />
            <InfoRow label="Atualizado em" value={new Date(plan.updatedAt).toLocaleString('pt-BR')} />
            <InfoRow label="ID" value={<span className="font-mono text-slate-500 text-xs">{plan.id}</span>} />
          </div>
        </div>
      </div>
    </div>
  )
}
