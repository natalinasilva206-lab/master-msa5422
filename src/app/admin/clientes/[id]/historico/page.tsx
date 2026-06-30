export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import SellerTabs from '../SellerTabs'

interface PageProps { params: { id: string } }

function fmtDT(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ACTION_LABEL: Record<string, string> = {
  RISK_RESERVE_SET:      'Reserva separada (manual)',
  RISK_BLOCK_SET:        'Saldo bloqueado',
  RISK_FUTURE_SET:       'Liberação futura agendada',
  RISK_RELEASE:          'Saldo liberado',
  RISK_AUTO_RESERVE:     'Reserva automática (venda)',
  BALANCE_ADJUST:        'Venda aprovada',
  RISK_CONFIG_UPDATE:    'Configuração de risco alterada',
  RESERVE_STATUS_CHANGE: 'Status de reserva alterado',
  DISPUTE_OPENED:        'Caso aberto',
  DISPUTE_STATUS_CHANGE: 'Status de disputa alterado',
  DISPUTE_BLOCK:         'Saldo bloqueado (disputa)',
  DISPUTE_USE_RESERVE:   'Reserva usada em disputa',
  DISPUTE_RELEASE:       'Saldo desbloqueado (disputa)',
  DISPUTE_NOTE:          'Observação adicionada',
  DISPUTE_DOCUMENT:      'Documento registrado',
  DISPUTE_FIELDS_UPDATE: 'Dados do caso atualizados',
}

const ACTION_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  RISK_RESERVE_SET:      { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  RISK_BLOCK_SET:        { bg: 'bg-red-500/10',      text: 'text-red-400',     dot: 'bg-red-400' },
  RISK_FUTURE_SET:       { bg: 'bg-blue-500/10',     text: 'text-blue-400',    dot: 'bg-blue-400' },
  RISK_RELEASE:          { bg: 'bg-emerald-500/10',  text: 'text-emerald-400', dot: 'bg-emerald-400' },
  RISK_AUTO_RESERVE:     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   dot: 'bg-amber-400' },
  BALANCE_ADJUST:        { bg: 'bg-emerald-500/10',  text: 'text-emerald-400', dot: 'bg-emerald-400' },
  RISK_CONFIG_UPDATE:    { bg: 'bg-slate-700/40',    text: 'text-slate-400',   dot: 'bg-slate-500' },
  RESERVE_STATUS_CHANGE: { bg: 'bg-indigo-500/10',   text: 'text-indigo-400',  dot: 'bg-indigo-400' },
  DISPUTE_OPENED:        { bg: 'bg-orange-500/10',   text: 'text-orange-400',  dot: 'bg-orange-400' },
  DISPUTE_STATUS_CHANGE: { bg: 'bg-purple-500/10',   text: 'text-purple-400',  dot: 'bg-purple-400' },
  DISPUTE_BLOCK:         { bg: 'bg-red-500/10',      text: 'text-red-400',     dot: 'bg-red-400' },
  DISPUTE_USE_RESERVE:   { bg: 'bg-rose-500/10',     text: 'text-rose-400',    dot: 'bg-rose-400' },
  DISPUTE_RELEASE:       { bg: 'bg-emerald-500/10',  text: 'text-emerald-400', dot: 'bg-emerald-400' },
  DISPUTE_NOTE:          { bg: 'bg-slate-700/30',    text: 'text-slate-400',   dot: 'bg-slate-500' },
  DISPUTE_DOCUMENT:      { bg: 'bg-slate-700/30',    text: 'text-slate-400',   dot: 'bg-slate-500' },
  DISPUTE_FIELDS_UPDATE: { bg: 'bg-slate-700/30',    text: 'text-slate-400',   dot: 'bg-slate-500' },
}

const DEFAULT_COLOR = { bg: 'bg-slate-700/30', text: 'text-slate-400', dot: 'bg-slate-500' }

interface AuditEntry {
  id:        string
  action:    string
  entity:    string
  entityId:  string | null
  createdAt: Date
  meta:      Record<string, unknown>
}

function MetaGrid({ meta }: { meta: Record<string, unknown> }) {
  const rows: { label: string; value: string; mono?: boolean }[] = []

  if (meta.adminName)  rows.push({ label: 'Feito por',  value: String(meta.adminName) })
  if (meta.adminEmail) rows.push({ label: 'E-mail ADM', value: String(meta.adminEmail), mono: true })
  if (meta.ip)         rows.push({ label: 'IP',         value: String(meta.ip), mono: true })
  if (meta.reason)     rows.push({ label: 'Motivo',     value: String(meta.reason) })
  if (meta.notes)      rows.push({ label: 'Obs.',       value: String(meta.notes) })

  const before = meta.before as Record<string, unknown> | undefined
  const after  = meta.after  as Record<string, unknown> | undefined

  if (before && after) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    for (const k of keys) {
      const bv = before[k]
      const av = after[k]
      if (bv !== undefined && av !== undefined && bv !== av) {
        const fmt = (v: unknown) =>
          typeof v === 'number' ? `R$ ${fmtBRL(v)}` : String(v)
        rows.push({ label: k, value: `${fmt(bv)} → ${fmt(av)}` })
      }
    }
  } else {
    if (meta.amount !== undefined) {
      rows.push({ label: 'Valor', value: `R$ ${fmtBRL(Number(meta.amount))}`, mono: true })
    }
    if (meta.from && meta.to) {
      rows.push({ label: 'Fluxo', value: `${meta.from} → ${meta.to}` })
    }
    if (meta.from && !meta.to) {
      rows.push({ label: 'De', value: String(meta.from) })
    }
  }

  if (meta.releaseDate) {
    rows.push({ label: 'Data de liberação', value: String(meta.releaseDate) })
  }

  if (meta.note)    rows.push({ label: 'Texto', value: String(meta.note) })
  if (meta.docName) rows.push({ label: 'Documento', value: String(meta.docName) })

  if (rows.length === 0) return null

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-2 text-[10.5px]">
          <span className="text-slate-600 w-28 shrink-0">{r.label}</span>
          <span className={`text-slate-300 ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export default async function HistoricoRiscoPage({ params }: PageProps) {
  const merchant = await prisma.merchant.findUnique({
    where:  { id: params.id },
    select: { id: true, name: true },
  })
  if (!merchant) notFound()

  type LogRow = { id: string; action: string; entity: string; entityId: string | null; createdAt: Date; metadata: string | null }

  // 1. Direct risk audit logs on this merchant
  const merchantLogs: LogRow[] = await prisma.auditLog.findMany({
    where: {
      entityId: merchant.id,
      action: {
        in: [
          'RISK_RESERVE_SET', 'RISK_BLOCK_SET', 'RISK_FUTURE_SET', 'RISK_RELEASE',
          'RISK_AUTO_RESERVE', 'BALANCE_ADJUST', 'RISK_CONFIG_UPDATE',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  }).catch(() => [])

  // 2. Reserve release status change logs (metadata contains merchantId)
  const reserveLogs: LogRow[] = await prisma.auditLog.findMany({
    where: { action: 'RESERVE_STATUS_CHANGE', entity: 'ReserveRelease' },
    orderBy: { createdAt: 'desc' },
    take: 500,
  }).catch(() => [])

  const filteredReserveLogs = reserveLogs.filter((l) => {
    try { return (JSON.parse(l.metadata ?? '{}') as any).merchantId === merchant.id } catch { return false }
  })

  // 3. Dispute audit logs for this merchant's disputes
  const disputes = await prisma.dispute.findMany({
    where:  { merchantId: merchant.id },
    select: { id: true },
  }).catch(() => [] as { id: string }[])

  const disputeIds = disputes.map((d) => d.id)
  const disputeLogs: LogRow[] = disputeIds.length > 0
    ? await prisma.auditLog.findMany({
        where: { entityId: { in: disputeIds }, action: { startsWith: 'DISPUTE_' } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }).catch(() => [])
    : []

  // Merge and sort all logs
  const allRaw = [...merchantLogs, ...filteredReserveLogs, ...disputeLogs]
  allRaw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const entries: AuditEntry[] = allRaw.map((l) => {
    let meta: Record<string, unknown> = {}
    try { meta = JSON.parse(l.metadata ?? '{}') } catch {}
    return { id: l.id, action: l.action, entity: l.entity, entityId: l.entityId, createdAt: l.createdAt, meta }
  })

  // Group by date (day)
  const byDay = new Map<string, AuditEntry[]>()
  for (const e of entries) {
    const day = new Date(e.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(e)
  }

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Histórico de Risco" />

      <div className="p-6 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-5">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">Clientes</Link>
          <span>/</span>
          <Link href={`/admin/clientes/${merchant.id}`} className="hover:text-white transition-colors">{merchant.name}</Link>
          <span>/</span>
          <span className="text-white">Histórico de Risco</span>
        </nav>

        <SellerTabs merchantId={merchant.id} />

        {entries.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <div className="w-12 h-12 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-semibold text-slate-400">Nenhuma ação registrada</p>
            <p className="text-xs mt-1">Ações de risco, reservas e disputas serão listadas aqui.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(byDay.entries()).map(([day, dayEntries]) => (
              <div key={day}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-widest">{day}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[10px] text-slate-600">{dayEntries.length} evento{dayEntries.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  {dayEntries.map((e) => {
                    const colors = ACTION_COLOR[e.action] ?? DEFAULT_COLOR
                    const label  = ACTION_LABEL[e.action] ?? e.action
                    const isDispute = e.action.startsWith('DISPUTE_')

                    return (
                      <div key={e.id} className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-4 py-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-2 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                                {label}
                              </span>
                              {isDispute && (
                                <Link
                                  href={`/admin/disputas/${e.entityId}`}
                                  className="text-[10px] text-blue-500 hover:text-blue-400 underline"
                                >
                                  Ver caso →
                                </Link>
                              )}
                              <span className="text-[10.5px] text-slate-600 ml-auto tabular-nums">{fmtDT(e.createdAt)}</span>
                            </div>

                            <MetaGrid meta={e.meta} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
