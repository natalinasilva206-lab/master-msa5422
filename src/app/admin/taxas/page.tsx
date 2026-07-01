export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'

export default async function TaxasPage() {
  const plans = await prisma.feePlan.findMany({ orderBy: { createdAt: 'asc' } })

  return (
    <div>
      <Topbar title="Taxas" subtitle="Planos de taxas e margens da plataforma" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Planos cadastrados</h2>
          <Link
            href="/admin/taxas/novo"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo plano
          </Link>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          {plans.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">Nenhum plano cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Cobrado %</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Cobrado fixo</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Custo %</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Custo fixo</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Margem %</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-slate-300">{p.chargedPercent.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-slate-300">R$ {p.chargedFixed.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-400">{p.costPercent.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-slate-400">R$ {p.costFixed.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="text-green-400 font-semibold">
                          {(p.chargedPercent - p.costPercent).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/taxas/${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-blue-400 hover:text-white hover:bg-blue-600 border border-blue-500/30 hover:border-blue-600 rounded-lg transition-colors"
                        >
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-slate-500 text-xs px-4 pt-3 pb-2">
                {plans.length} {plans.length === 1 ? 'plano cadastrado' : 'planos cadastrados'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
