export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

const planColor: Record<string, string> = {
  Start:  'bg-slate-400',
  Growth: 'bg-blue-500',
  Prime:  'bg-purple-500',
  Black:  'bg-white',
}

export default async function TaxasPage() {
  const plans = await prisma.feePlan.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div>
      <Topbar
        title="Taxas e Planos"
        breadcrumb="Casa › Gestão"
        subtitle="Planos de taxas e margens da plataforma"
      />
      <div className="p-4 xl:p-6 space-y-4">

        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Planos cadastrados</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {plans.length > 0
                  ? `${plans.length} plano${plans.length > 1 ? 's' : ''} cadastrado${plans.length > 1 ? 's' : ''}`
                  : 'Nenhum plano cadastrado ainda'}
              </p>
            </div>
            <Link
              href="/admin/taxas/novo"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo plano
            </Link>
          </div>

          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <p className="text-[12.5px] font-medium">Nenhum plano cadastrado</p>
              <p className="text-[11px] text-slate-800 mt-1">Crie um plano para definir taxas e margens.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {['Plano', 'Cobrado %', 'Cobrado fixo', 'Custo %', 'Custo fixo', 'Margem %', ''].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${h === '' ? '' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {plans.map((p) => {
                    const margem = p.chargedPercent - p.costPercent
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${planColor[p.name] ?? 'bg-slate-500'}`} />
                            <span className="text-[13px] font-semibold text-slate-200">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[13px] font-semibold text-slate-200 tabular-nums font-mono">{p.chargedPercent.toFixed(2)}%</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-slate-400 tabular-nums font-mono">R$ {p.chargedFixed.toFixed(2)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-slate-500 tabular-nums font-mono">{p.costPercent.toFixed(2)}%</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-slate-500 tabular-nums font-mono">R$ {p.costFixed.toFixed(2)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[13px] font-semibold tabular-nums font-mono ${margem > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {margem.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/admin/taxas/${p.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-slate-800/50">
                <span className="text-[11px] text-slate-700">
                  {plans.length} {plans.length === 1 ? 'plano cadastrado' : 'planos cadastrados'}
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
