export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { TYPE_LABEL, TYPE_COLOR, STATUS_LABEL, STATUS_COLOR, STATUS_DOT } from '../constants'
import DisputeActions from './DisputeActions'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDT(d: Date | string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-slate-700/30 last:border-0">
      <span className="text-slate-500 text-xs w-44 shrink-0 pt-0.5">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  )
}

interface PageProps { params: { id: string } }

export default async function DisputeDetailPage({ params }: PageProps) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.id },
    include: { merchant: { select: { id: true, name: true, pendingBalance: true, reservedBalance: true, blockedBalance: true } } },
  })

  if (!dispute) notFound()

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: dispute.id, action: { startsWith: 'DISPUTE_' } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  let docs: string[] = []
  try { docs = JSON.parse(dispute.documents || '[]') } catch { docs = [] }

  const isOverdue = dispute.deadline && new Date(dispute.deadline) < new Date() &&
    !['RESOLVIDO_SELLER','RESOLVIDO_CONTRA','DEVOLVIDO_PARCIAL','FINALIZADO'].includes(dispute.status)

  const auditLabel: Record<string, string> = {
    DISPUTE_OPENED:        'Caso aberto',
    DISPUTE_STATUS_CHANGE: 'Status alterado',
    DISPUTE_BLOCK:         'Saldo bloqueado',
    DISPUTE_USE_RESERVE:   'Reserva utilizada',
    DISPUTE_RELEASE:       'Saldo liberado',
    DISPUTE_NOTE:          'Observação adicionada',
    DISPUTE_DOCUMENT:      'Documento registrado',
    DISPUTE_FIELDS_UPDATE: 'Dados do caso atualizados',
  }

  return (
    <div>
      <Topbar title={`Caso #${dispute.id.slice(0, 8).toUpperCase()}`} subtitle="Central de Disputas e MED" />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/admin/disputas" className="hover:text-white transition-colors">Disputas</Link>
          <span>/</span>
          <span className="text-white">#{dispute.id.slice(0, 8).toUpperCase()}</span>
        </nav>

        {/* Header card */}
        <div className={`rounded-2xl border p-5 flex flex-wrap items-start gap-4 ${
          isOverdue ? 'bg-red-950/20 border-red-700/30' : 'bg-slate-800/40 border-slate-700/50'
        }`}>
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border ${TYPE_COLOR[dispute.type] ?? ''}`}>
                {TYPE_LABEL[dispute.type] ?? dispute.type}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR[dispute.status] ?? ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[dispute.status] ?? 'bg-slate-400'}`} />
                {STATUS_LABEL[dispute.status] ?? dispute.status}
              </span>
              {isOverdue && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2.5 py-1 rounded-full">
                  PRAZO VENCIDO
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">R$ {fmtBRL(dispute.contestedAmount)}</p>
            <p className="text-sm text-slate-400">
              Seller: <Link href={`/admin/clientes/${dispute.merchant.id}`} className="text-slate-200 hover:text-white font-medium">{dispute.merchant.name}</Link>
            </p>
          </div>

          {/* Mini financeiro */}
          <div className="grid grid-cols-3 gap-3 min-w-[300px]">
            {[
              { label: 'Bloqueado neste caso', value: dispute.blockedAmount, color: 'text-red-400' },
              { label: 'Disponível do seller',  value: dispute.merchant.pendingBalance, color: 'text-emerald-400' },
              { label: 'Reservado do seller',   value: dispute.merchant.reservedBalance, color: 'text-amber-400' },
            ].map((c) => (
              <div key={c.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider mb-1">{c.label}</p>
                <p className={`text-sm font-bold tabular-nums ${c.color}`}>R$ {fmtBRL(c.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações do caso */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700/40">
                <p className="text-[13px] font-semibold text-white">Informações do caso</p>
              </div>
              <div className="px-5 py-3">
                <InfoRow label="ID do caso"       value={<span className="font-mono text-xs text-slate-400">{dispute.id}</span>} />
                <InfoRow label="Tipo"             value={TYPE_LABEL[dispute.type] ?? dispute.type} />
                <InfoRow label="Status"           value={STATUS_LABEL[dispute.status] ?? dispute.status} />
                <InfoRow label="Seller"           value={<Link href={`/admin/clientes/${dispute.merchant.id}`} className="text-blue-400 hover:underline">{dispute.merchant.name}</Link>} />
                <InfoRow label="Valor contestado" value={<span className="font-bold text-white">R$ {fmtBRL(dispute.contestedAmount)}</span>} />
                <InfoRow label="Valor bloqueado"  value={<span className={dispute.blockedAmount > 0 ? 'font-bold text-red-400' : 'text-slate-600'}>R$ {fmtBRL(dispute.blockedAmount)}</span>} />
                <InfoRow label="Transação"        value={
                  dispute.saleLogId
                    ? <span className="font-mono text-xs text-slate-300">{dispute.saleLogId}</span>
                    : <span className="text-slate-600 text-xs">Não vinculada</span>
                } />
                <InfoRow label="Data de abertura" value={fmtDT(dispute.openedAt)} />
                <InfoRow label="Prazo de análise" value={
                  dispute.deadline
                    ? <span className={isOverdue ? 'text-red-400 font-semibold' : ''}>{fmtDate(dispute.deadline)}</span>
                    : <span className="text-slate-600 text-xs">Não definido</span>
                } />
                <InfoRow label="Responsável"      value={dispute.assignedTo ?? <span className="text-slate-600 text-xs">Não atribuído</span>} />
                {dispute.resolvedAt && (
                  <InfoRow label="Resolvido em" value={fmtDT(dispute.resolvedAt)} />
                )}
              </div>
            </div>

            {/* Documentos */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">Documentos e evidências</p>
                <span className="text-[10px] text-slate-500">{docs.length} item{docs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-5">
                {docs.length === 0 ? (
                  <p className="text-xs text-slate-600">Nenhum documento registrado ainda.</p>
                ) : (
                  <ul className="space-y-2">
                    {docs.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {doc}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Observações */}
            {dispute.notes && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-700/40">
                  <p className="text-[13px] font-semibold text-white">Observações internas</p>
                </div>
                <div className="p-5">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {dispute.notes}
                  </pre>
                </div>
              </div>
            )}

            {/* Histórico */}
            {auditLogs.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-700/40">
                  <p className="text-[13px] font-semibold text-white">Histórico de ações</p>
                </div>
                <div className="divide-y divide-slate-700/30">
                  {auditLogs.map((log) => {
                    let meta: Record<string, unknown> = {}
                    try { meta = JSON.parse(log.metadata ?? '{}') } catch {}
                    return (
                      <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                        <div className="w-6 h-6 mt-0.5 rounded-md bg-slate-700/60 flex items-center justify-center shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200">
                            {auditLabel[log.action] ?? log.action}
                          </p>
                          {(meta.from || meta.to) ? (
                            <p className="text-[10px] text-slate-600 mt-0.5">
                              {meta.from ? String(meta.from) : ''}{meta.to ? ` → ${String(meta.to)}` : ''}
                              {meta.amount ? ` · R$ ${Number(meta.amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}` : ''}
                            </p>
                          ) : null}
                          {meta.note ? <p className="text-[10px] text-slate-500 mt-0.5 italic">{String(meta.note)}</p> : null}
                          {meta.docName ? <p className="text-[10px] text-slate-500 mt-0.5">📄 {String(meta.docName)}</p> : null}
                        </div>
                        <p className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">
                          {fmtDT(log.createdAt)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="space-y-4">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden sticky top-6">
              <div className="px-5 py-3.5 border-b border-slate-700/40">
                <p className="text-[13px] font-semibold text-white">Ações do ADM</p>
              </div>
              <div className="p-5">
                <DisputeActions
                  disputeId={dispute.id}
                  merchantId={dispute.merchant.id}
                  currentStatus={dispute.status}
                  blockedAmount={dispute.blockedAmount}
                  pendingBalance={dispute.merchant.pendingBalance}
                  reservedBalance={dispute.merchant.reservedBalance}
                  currentNotes={dispute.notes}
                  assignedTo={dispute.assignedTo}
                  deadline={dispute.deadline?.toISOString().slice(0,10) ?? null}
                  saleLogId={dispute.saleLogId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
