'use client'

import { useState, useTransition } from 'react'
import { replyTicket, updateTicketStatus, updateTicketPriority, addInternalNote, assumeTicket, assignTicket } from './actions'
import { formatSlaRemaining } from '@/lib/sla'

const STATUS_LABELS: Record<string, string> = {
  ABERTO:             'Aberto',
  EM_ANALISE:         'Em análise',
  AGUARDANDO_CLIENTE: 'Aguard. cliente',
  RESPONDIDO:         'Respondido',
  FECHADO:            'Fechado',
  REABERTO:           'Reaberto',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO:             'text-amber-400  bg-amber-500/10  border-amber-500/20',
  EM_ANALISE:         'text-blue-400   bg-blue-500/10   border-blue-500/20',
  AGUARDANDO_CLIENTE: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  RESPONDIDO:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  FECHADO:            'text-slate-500  bg-slate-700/30  border-slate-700/30',
  REABERTO:           'text-orange-400 bg-orange-500/10 border-orange-500/20',
}

const PRIORITY_COLORS: Record<string, string> = {
  BAIXA:   'text-slate-400  border-slate-700/40',
  MEDIA:   'text-blue-400   border-blue-500/30',
  ALTA:    'text-amber-400  border-amber-500/30',
  URGENTE: 'text-red-400    border-red-500/30',
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

interface AdminUser { id: string; name: string }
interface Message   {
  id: string
  senderId: string
  senderRole: string
  message: string
  isInternalNote: boolean
  createdAt: Date | string
}

interface Props {
  ticketId:    string
  sellerName:  string
  status:      string
  priority:    string
  slaDueAt?:   string | null
  assignedTo?: string | null
  currentAdminId:   string
  currentAdminName: string
  adminList:   AdminUser[]
  messages:    Message[]
}

export function TicketActions({
  ticketId,
  sellerName,
  status,
  priority,
  slaDueAt,
  assignedTo,
  currentAdminId,
  currentAdminName,
  adminList,
  messages,
}: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState<'reply' | 'note' | 'status' | 'history'>('reply')
  const [text, setText] = useState('')
  const [curStatus,   setCurStatus]   = useState(status)
  const [curPriority, setCurPriority] = useState(priority)
  const [curAssigned, setCurAssigned] = useState(assignedTo ?? '')
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const assignedAdmin = adminList.find((a) => a.id === curAssigned)

  function handleSubmitMessage() {
    startTransition(async () => {
      const r = tab === 'note'
        ? await addInternalNote(ticketId, text)
        : await replyTicket(ticketId, text)
      if (r.error) { setResult('err:' + r.error); return }
      setResult('ok')
      setText('')
      if (tab === 'reply') setCurStatus('RESPONDIDO')
      setTimeout(() => { setOpen(false); setResult(null) }, 1400)
    })
  }

  function handleStatusSave() {
    startTransition(async () => {
      const r = await updateTicketStatus(ticketId, curStatus)
      if (r.error) { setResult('err:' + r.error); return }
      setResult('ok')
      setTimeout(() => setResult(null), 1400)
    })
  }

  function handlePriorityChange(p: string) {
    setCurPriority(p)
    startTransition(async () => { await updateTicketPriority(ticketId, p) })
  }

  function handleAssume() {
    startTransition(async () => {
      const r = await assumeTicket(ticketId)
      if (r.error) { setResult('err:' + r.error); return }
      setCurAssigned(currentAdminId)
      setCurStatus('EM_ANALISE')
      setResult('ok')
      setTimeout(() => setResult(null), 1400)
    })
  }

  function handleAssignChange(adminId: string) {
    setCurAssigned(adminId)
    startTransition(async () => { await assignTicket(ticketId, adminId || null) })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => setOpen(!open)}
        className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
          open ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {open ? '✕ Fechar' : 'Gerenciar'}
      </button>

      {open && (
        <div className="w-[360px] bg-slate-950 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden" style={{ marginRight: 0 }}>
          {/* Tabs */}
          <div className="flex border-b border-slate-800/60">
            {([
              ['reply',   'Resposta'],
              ['note',    'Nota int.'],
              ['status',  'Gerenciar'],
              ['history', 'Histórico'],
            ] as const).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-[10px] font-semibold py-2.5 transition-colors ${
                  tab === t
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-2.5 max-h-[440px] overflow-y-auto">

            {/* ── Reply / Note ── */}
            {(tab === 'reply' || tab === 'note') && (
              <>
                {tab === 'note' && (
                  <p className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                    Nota interna — seller não verá
                  </p>
                )}
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); setResult(null) }}
                  rows={4}
                  placeholder={tab === 'reply' ? `Responder a ${sellerName}…` : 'Observação interna…'}
                  className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50"
                />
                {result === 'ok' && <p className="text-[11px] text-emerald-400">✓ {tab === 'reply' ? 'Resposta enviada!' : 'Nota salva!'}</p>}
                {result?.startsWith('err:') && <p className="text-[11px] text-red-400">{result.slice(4)}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitMessage}
                    disabled={isPending || !text.trim()}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
                  >
                    {isPending ? 'Enviando…' : tab === 'reply' ? 'Enviar resposta' : 'Salvar nota'}
                  </button>
                  <button onClick={() => setOpen(false)} className="px-2 text-[11px] text-slate-500 hover:text-slate-300">
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {/* ── Gerenciar (status + prioridade + responsável + SLA) ── */}
            {tab === 'status' && (
              <div className="space-y-3">

                {/* SLA */}
                {slaDueAt && curStatus !== 'FECHADO' && (
                  <SlaBlock slaDueAt={slaDueAt} />
                )}

                {/* Status */}
                <div>
                  <p className="text-[9.5px] text-slate-600 mb-1.5 font-semibold uppercase tracking-wider">Status</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(STATUS_LABELS).map(([s, label]) => (
                      <button
                        key={s}
                        onClick={() => setCurStatus(s)}
                        className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-colors ${
                          curStatus === s
                            ? STATUS_COLORS[s]
                            : 'text-slate-600 border-slate-700/30 hover:border-slate-600/40 hover:text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-[9.5px] text-slate-600 mb-1.5 font-semibold uppercase tracking-wider">Prioridade</p>
                  <div className="flex gap-1.5">
                    {(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePriorityChange(p)}
                        className={`flex-1 text-[9.5px] font-bold py-1 rounded-lg border transition-colors ${
                          curPriority === p
                            ? PRIORITY_COLORS[p]
                            : 'text-slate-600 border-slate-700/30 hover:text-slate-400'
                        }`}
                      >
                        {p[0] + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Responsável */}
                <div>
                  <p className="text-[9.5px] text-slate-600 mb-1.5 font-semibold uppercase tracking-wider">Responsável</p>
                  <div className="flex gap-1.5">
                    {curAssigned !== currentAdminId && (
                      <button
                        onClick={handleAssume}
                        disabled={isPending}
                        className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 disabled:opacity-40 transition-colors"
                      >
                        Assumir
                      </button>
                    )}
                    <select
                      value={curAssigned}
                      onChange={(e) => handleAssignChange(e.target.value)}
                      className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500/50"
                    >
                      <option value="">Sem responsável</option>
                      {adminList.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}{a.id === currentAdminId ? ' (eu)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {result === 'ok' && <p className="text-[11px] text-emerald-400">✓ Atualizado!</p>}
                {result?.startsWith('err:') && <p className="text-[11px] text-red-400">{result.slice(4)}</p>}
                <button
                  onClick={handleStatusSave}
                  disabled={isPending || curStatus === status}
                  className="w-full py-1.5 text-[11px] font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition-colors"
                >
                  {isPending ? 'Salvando…' : 'Aplicar status'}
                </button>
              </div>
            )}

            {/* ── Histórico (full thread, incl. internal notes) ── */}
            {tab === 'history' && (
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <p className="text-[11px] text-slate-600 text-center py-4">Nenhuma mensagem ainda.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
                        m.isInternalNote
                          ? 'bg-amber-500/5 border border-amber-500/15'
                          : m.senderRole === 'ADMIN'
                          ? 'bg-blue-500/5 border border-blue-500/15'
                          : 'bg-slate-800/40 border border-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-bold uppercase ${
                          m.isInternalNote ? 'text-amber-400' : m.senderRole === 'ADMIN' ? 'text-blue-400' : 'text-slate-400'
                        }`}>
                          {m.isInternalNote ? 'Nota interna' : m.senderRole === 'ADMIN' ? 'Suporte' : sellerName}
                        </span>
                        <span className="text-[9px] text-slate-700">{formatDate(m.createdAt)}</span>
                      </div>
                      <p className="text-slate-300">{m.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ── SLA block (shown inside Gerenciar tab) ────────────────────────────────────

function SlaBlock({ slaDueAt }: { slaDueAt: string }) {
  const due    = new Date(slaDueAt)
  const now    = new Date()
  const diffMs = due.getTime() - now.getTime()
  const overdue = diffMs < 0
  const warning = !overdue && diffMs < 2 * 3_600_000

  const label = formatSlaRemaining(slaDueAt)
  const color = overdue
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : warning
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'

  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${color}`}>
      <span className="text-[12px] shrink-0">⏱</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold">{label}</p>
        <p className="text-[9px] opacity-60">
          Vence: {due.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
