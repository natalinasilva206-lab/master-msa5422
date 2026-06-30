'use client'

import { useTransition, useState } from 'react'
import { updateReserveStatus, triggerCronRelease, ReserveStatus } from './actions'

export interface ReserveEntry {
  id:            string
  saleLogId:     string
  amount:        number
  saleAmount:    number
  reservePercent:number
  releaseDays:   number
  saleDate:      string   // ISO
  releaseAt:     string   // ISO
  status:        string
  releasedAt:    string | null
  notes:         string | null
}

interface Props {
  merchantId: string
  entries:    ReserveEntry[]
}

const statusMeta: Record<string, { label: string; color: string; dot: string }> = {
  RESERVADO:  { label: 'Reservado',          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  dot: 'bg-amber-400' },
  LIBERADO:   { label: 'Liberado',           color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  BLOQUEADO:  { label: 'Bloqueado',          color: 'text-red-400 bg-red-500/10 border-red-500/20',        dot: 'bg-red-400' },
  DISPUTA:    { label: 'Usado em disputa',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' },
  CANCELADO:  { label: 'Cancelado manualmente', color: 'text-slate-400 bg-slate-700/30 border-slate-600/30', dot: 'bg-slate-500' },
}

const statusOptions: ReserveStatus[] = ['RESERVADO', 'LIBERADO', 'BLOQUEADO', 'DISPUTA', 'CANCELADO']

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function isOverdue(releaseAt: string, status: string) {
  return status === 'RESERVADO' && new Date(releaseAt) <= new Date()
}

export default function ReserveCalendar({ merchantId, entries }: Props) {
  const [isPending, startTransition] = useTransition()
  const [cronMsg, setCronMsg] = useState<string | null>(null)
  const [rowMsg, setRowMsg] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<ReserveStatus>('RESERVADO')
  const [editNotes, setEditNotes] = useState('')

  function openEdit(e: ReserveEntry) {
    setEditing(e.id)
    setEditStatus(e.status as ReserveStatus)
    setEditNotes(e.notes ?? '')
    setRowMsg({})
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      const res = await updateReserveStatus(id, merchantId, editStatus, editNotes || undefined)
      if (res.error) setRowMsg((p) => ({ ...p, [id]: res.error! }))
      else { setEditing(null); setRowMsg((p) => ({ ...p, [id]: 'Salvo!' })) }
    })
  }

  function runCron() {
    setCronMsg(null)
    startTransition(async () => {
      const res = await triggerCronRelease()
      if (res.error) setCronMsg(`Erro: ${res.error}`)
      else setCronMsg(`${res.processed} reserva(s) liberada(s) automaticamente.`)
    })
  }

  const totalReservado = entries.filter((e) => e.status === 'RESERVADO').reduce((s, e) => s + e.amount, 0)
  const totalLiberado  = entries.filter((e) => e.status === 'LIBERADO').reduce((s, e) => s + e.amount, 0)
  const overdueCount   = entries.filter((e) => isOverdue(e.releaseAt, e.status)).length

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Reservas ativas',  value: entries.filter((e) => e.status === 'RESERVADO').length,  color: 'text-amber-400' },
          { label: 'Total reservado',  value: `R$ ${fmtBRL(totalReservado)}`, color: 'text-amber-300' },
          { label: 'Total liberado',   value: `R$ ${fmtBRL(totalLiberado)}`,  color: 'text-emerald-400' },
          { label: 'Aguardando liberar', value: overdueCount, color: overdueCount > 0 ? 'text-red-400' : 'text-slate-500' },
        ].map((c) => (
          <div key={c.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
            <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
            <p className={`text-[15px] font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Cron trigger */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={runCron}
          disabled={isPending}
          className="flex items-center gap-2 bg-emerald-700/50 hover:bg-emerald-700 border border-emerald-600/40 disabled:opacity-50 text-emerald-300 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isPending ? 'Processando...' : 'Processar liberações automáticas agora'}
        </button>
        {cronMsg && <p className="text-xs text-emerald-400">{cronMsg}</p>}
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Nenhuma reserva registrada ainda.<br />
          <span className="text-xs text-slate-600">Reservas são criadas automaticamente a cada venda aprovada.</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/60">
                {['ID transação', 'Data venda', 'Valor reservado', 'Venda bruta', 'Percentual', 'Prazo', 'Liberação prevista', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {entries.map((e) => {
                const meta  = statusMeta[e.status] ?? statusMeta.RESERVADO
                const over  = isOverdue(e.releaseAt, e.status)
                const isEd  = editing === e.id
                return (
                  <tr key={e.id} className={`hover:bg-slate-800/30 transition-colors ${over ? 'bg-red-950/10' : ''}`}>
                    {/* ID */}
                    <td className="px-3 py-3">
                      <span className="font-mono text-[10px] text-slate-500">{e.saleLogId.slice(0, 8)}…</span>
                    </td>
                    {/* Data venda */}
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-300">{fmt(e.saleDate)}</td>
                    {/* Valor reservado */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-amber-300 tabular-nums">R$ {fmtBRL(e.amount)}</span>
                    </td>
                    {/* Venda bruta */}
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-400 tabular-nums">R$ {fmtBRL(e.saleAmount)}</td>
                    {/* Percentual */}
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-400">{e.reservePercent}%</td>
                    {/* Prazo */}
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-400">{e.releaseDays}d</td>
                    {/* Liberação prevista */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${over ? 'text-red-400' : 'text-slate-300'}`}>
                        {fmt(e.releaseAt)}
                        {over && <span className="ml-1 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">VENCIDA</span>}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      {e.releasedAt && (
                        <p className="text-[9px] text-slate-600 mt-0.5">{fmt(e.releasedAt)}</p>
                      )}
                    </td>
                    {/* Ações */}
                    <td className="px-3 py-3">
                      {isEd ? (
                        <div className="space-y-2 min-w-[200px]">
                          <select
                            value={editStatus}
                            onChange={(ev) => setEditStatus(ev.target.value as ReserveStatus)}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{statusMeta[s].label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Observação (opcional)"
                            value={editNotes}
                            onChange={(ev) => setEditNotes(ev.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(e.id)}
                              disabled={isPending}
                              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                            >
                              {isPending ? '...' : 'Salvar'}
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                          {rowMsg[e.id] && (
                            <p className={`text-[10px] ${rowMsg[e.id].startsWith('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
                              {rowMsg[e.id]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(e)}
                            className="text-[10px] text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 px-2.5 py-1 rounded transition-colors"
                          >
                            Editar
                          </button>
                          {e.status === 'RESERVADO' && (
                            <button
                              onClick={() => { openEdit(e); setEditStatus('LIBERADO') }}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-600/40 hover:border-emerald-500 bg-emerald-500/5 px-2.5 py-1 rounded transition-colors"
                            >
                              Liberar
                            </button>
                          )}
                          {rowMsg[e.id] && !isEd && (
                            <span className="text-[10px] text-emerald-400">{rowMsg[e.id]}</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
