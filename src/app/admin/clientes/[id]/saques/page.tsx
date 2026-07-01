export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import SellerTabs from '../SellerTabs'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  WITHDRAW_REQUEST:  { label: 'Solicitado',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  WITHDRAW_APPROVED: { label: 'Aprovado',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  WITHDRAW_DENIED:   { label: 'Recusado',    color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

interface PageProps {
  params: { id: string }
}

export default async function SellerSaquesPage({ params }: PageProps) {
  const merchant = await prisma.merchant.findUnique({ where: { id: params.id }, select: { id: true, name: true } })
  if (!merchant) notFound()

  const allLogs = await prisma.auditLog.findMany({
    where: {
      entityId: merchant.id,
      action: { in: ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED', 'WITHDRAW_DENIED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Group: match approved/denied to their request
  type SaqueEntry = {
    id: string
    requestedAt: string
    amount: number
    pixKey: string
    pixKeyType: string
    bankName: string
    status: string
    resolvedAt: string | null
    reason: string | null
  }

  const requestMap = new Map<string, SaqueEntry>()
  for (const log of allLogs) {
    try {
      const meta = JSON.parse(log.metadata ?? '{}')
      if (log.action === 'WITHDRAW_REQUEST') {
        requestMap.set(log.id, {
          id: log.id,
          requestedAt: log.createdAt.toISOString(),
          amount: parseFloat(meta.amount ?? 0),
          pixKey: meta.pixKey ?? '—',
          pixKeyType: meta.pixKeyType ?? '—',
          bankName: meta.bankName ?? '—',
          status: 'WITHDRAW_REQUEST',
          resolvedAt: null,
          reason: null,
        })
      } else if (log.action === 'WITHDRAW_APPROVED' || log.action === 'WITHDRAW_DENIED') {
        const reqId = meta.requestId ?? ''
        const entry = requestMap.get(reqId)
        if (entry) {
          entry.status = log.action
          entry.resolvedAt = log.createdAt.toISOString()
          entry.reason = meta.reason ?? null
        }
      }
    } catch {}
  }

  const saques = Array.from(requestMap.values()).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())

  const totalSolicitado = saques.reduce((a, s) => a + s.amount, 0)
  const totalAprovado   = saques.filter((s) => s.status === 'WITHDRAW_APPROVED').reduce((a, s) => a + s.amount, 0)
  const pendentes       = saques.filter((s) => s.status === 'WITHDRAW_REQUEST').length

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Saques do seller" />

      <div className="p-4 xl:p-6 space-y-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">Clientes</Link>
          <span>/</span>
          <Link href={`/admin/clientes/${merchant.id}`} className="hover:text-white transition-colors">{merchant.name}</Link>
          <span>/</span>
          <span className="text-white">Saques</span>
        </nav>

        <SellerTabs merchantId={merchant.id} />

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pendentes', value: pendentes.toString(), color: pendentes > 0 ? 'text-amber-400' : 'text-slate-400' },
            { label: 'Total solicitado', value: `R$ ${formatBRL(totalSolicitado)}`, color: 'text-white' },
            { label: 'Total aprovado', value: `R$ ${formatBRL(totalAprovado)}`, color: 'text-emerald-400' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
              <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Histórico de Saques</p>
            <p className="text-[10.5px] text-slate-600 mt-0.5">{saques.length} solicitaç{saques.length !== 1 ? 'ões' : 'ão'}</p>
          </div>
          {saques.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-700">
              <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              <p className="text-[13px] font-medium">Nenhum saque encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Chave PIX</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Resolvido em</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {saques.map((s) => {
                    const sm = STATUS_META[s.status] ?? STATUS_META['WITHDRAW_REQUEST']
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="text-[12px] text-slate-300">{new Date(s.requestedAt).toLocaleDateString('pt-BR')}</p>
                          <p className="text-[10px] text-slate-600">{new Date(s.requestedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sm.color}`}>{sm.label}</span>
                          {s.reason && <p className="text-[10px] text-slate-600 mt-0.5 max-w-[140px] truncate">{s.reason}</p>}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <p className="text-[12px] text-slate-300 font-mono">{s.pixKey}</p>
                          <p className="text-[10px] text-slate-600">{s.pixKeyType} · {s.bankName}</p>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <p className="text-[12px] text-slate-500">
                            {s.resolvedAt ? new Date(s.resolvedAt).toLocaleDateString('pt-BR') : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <p className={`text-[13px] font-bold tabular-nums ${s.status === 'WITHDRAW_APPROVED' ? 'text-emerald-400' : s.status === 'WITHDRAW_DENIED' ? 'text-red-400' : 'text-amber-400'}`}>
                            R$ {formatBRL(s.amount)}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Link href="/admin/saques" className="text-[12px] text-blue-400 hover:text-blue-300 transition-colors">
            Ver todos os saques no painel global →
          </Link>
        </div>
      </div>
    </div>
  )
}
