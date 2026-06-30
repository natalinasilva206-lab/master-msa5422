export const dynamic = 'force-dynamic'

import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import CreateDisputeForm from '../CreateDisputeForm'

export default async function NovaDisputaPage() {
  let merchants: { id: string; name: string }[] = []
  try {
    merchants = await prisma.merchant.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  } catch (e) {
    console.error('[NovaDisputaPage]', e)
  }

  return (
    <div>
      <Topbar title="Abrir novo caso" subtitle="Central de Disputas e MED" />
      <div className="p-6 max-w-3xl space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <a href="/admin/disputas" className="hover:text-white transition-colors">Disputas</a>
          <span>/</span>
          <span className="text-white">Novo caso</span>
        </nav>
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <CreateDisputeForm merchants={merchants} />
        </div>
      </div>
    </div>
  )
}
