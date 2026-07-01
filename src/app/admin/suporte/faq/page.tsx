export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { NewFaqForm, FaqItemRow } from './FaqEditor'

export default async function AdminFaqPage() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const items = await prisma.faqItem.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  const activeCount   = items.filter((i) => i.isActive).length
  const inactiveCount = items.length - activeCount

  // Group by category
  const categories = Array.from(new Set(items.map((i) => i.category))).sort()

  return (
    <div>
      <Topbar
        title="Gestão de FAQ"
        breadcrumb="Casa › Suporte"
        subtitle={`${activeCount} ativa${activeCount !== 1 ? 's' : ''} · ${inactiveCount} desativada${inactiveCount !== 1 ? 's' : ''}`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Header actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/admin/suporte"
              className="text-[11px] text-slate-600 hover:text-slate-400 flex items-center gap-1"
            >
              ← Voltar ao suporte
            </a>
          </div>
          <NewFaqForm />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',      value: items.length,  color: 'text-slate-300' },
            { label: 'Ativas',     value: activeCount,   color: 'text-emerald-400' },
            { label: 'Desativadas',value: inactiveCount, color: 'text-slate-500'  },
          ].map((k) => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`text-[24px] font-bold tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* FAQ list by category */}
        {items.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl flex flex-col items-center justify-center py-14 text-slate-700">
            <p className="text-[13px] font-medium">Nenhuma pergunta cadastrada</p>
            <p className="text-[11px] mt-1">Clique em "Nova pergunta" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat)
              return (
                <div key={cat} className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-white">{cat}</p>
                    <span className="text-[10px] text-slate-600">
                      {catItems.filter((i) => i.isActive).length}/{catItems.length} ativas
                    </span>
                  </div>
                  <div>
                    {catItems.map((item) => (
                      <FaqItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
