'use client'

import { useState, useTransition } from 'react'
import { replyTicket, updateTicketStatus, updateTicketPriority, addInternalNote } from './actions'

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

interface Props {
  ticketId: string
  sellerName: string
  status: string
  priority: string
}

export function TicketActions({ ticketId, sellerName, status, priority }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'reply' | 'note' | 'status'>('reply')
  const [text, setText] = useState('')
  const [curStatus, setCurStatus] = useState(status)
  const [curPriority, setCurPriority] = useState(priority)
  const [result, setResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  return (
    <div className="shrink-0 flex flex-col items-end gap-2 min-w-[120px]">
      {/* Status + priority */}
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[curPriority] ?? PRIORITY_COLORS['MEDIA']}`}>
          {curPriority}
        </span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[curStatus] ?? STATUS_COLORS['ABERTO']}`}>
          {STATUS_LABELS[curStatus] ?? curStatus}
        </span>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
      >
        {open ? 'Fechar ↑' : 'Responder →'}
      </button>

      {open && (
        <div className="w-[300px] bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800/60">
            {([['reply', 'Resposta'], ['note', 'Nota interna'], ['status', 'Status']] as const).map(([t, label]) => (
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

          <div className="p-3 space-y-2.5">
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

            {tab === 'status' && (
              <div className="space-y-3">
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
          </div>
        </div>
      )}
    </div>
  )
}
