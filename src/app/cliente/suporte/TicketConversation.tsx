'use client'

import { useState, useTransition } from 'react'
import { replyToTicket } from './actions'

interface Message {
  id: string
  senderRole: string
  message: string
  createdAt: string
}

interface Props {
  ticketId:    string
  messages:    Message[]
  isClosed:    boolean
  sellerName:  string
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

export function TicketConversation({ ticketId, messages, isClosed, sellerName }: Props) {
  const [open,      setOpen]     = useState(false)
  const [reply,     setReply]    = useState('')
  const [showReply, setShowReply] = useState(false)
  const [result,    setResult]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleReply() {
    startTransition(async () => {
      const r = await replyToTicket(ticketId, reply)
      if (r.error) { setResult('err:' + r.error); return }
      setResult('ok')
      setReply('')
      setShowReply(false)
      setTimeout(() => setResult(null), 2000)
    })
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
      >
        {open ? '↑ Fechar conversa' : '↓ Ver conversa'}
        <span className="text-slate-600 font-normal">({messages.length} msg{messages.length !== 1 ? 's' : ''})</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2.5">
          {/* Thread */}
          {messages.map((m) => {
            const isAdmin = m.senderRole === 'ADMIN'
            return (
              <div
                key={m.id}
                className={`rounded-xl px-4 py-3 ${
                  isAdmin
                    ? 'bg-blue-500/5 border border-blue-500/15 ml-4'
                    : 'bg-slate-800/40 border border-slate-700/30 mr-4'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isAdmin ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {isAdmin ? 'S' : sellerName[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className={`text-[10px] font-semibold ${isAdmin ? 'text-blue-400' : 'text-slate-400'}`}>
                    {isAdmin ? 'Suporte Master' : sellerName}
                  </span>
                  <span className="text-[9.5px] text-slate-700 ml-auto">{formatDate(m.createdAt)}</span>
                </div>
                <p className="text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-wrap">{m.message}</p>
              </div>
            )
          })}

          {/* Reply area */}
          {!isClosed && (
            <div className="pt-1">
              {!showReply ? (
                <button
                  onClick={() => setShowReply(true)}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Responder
                </button>
              ) : (
                <div className="space-y-2 bg-slate-900/60 border border-slate-800/60 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Sua resposta</p>
                  <textarea
                    value={reply}
                    onChange={(e) => { setReply(e.target.value); setResult(null) }}
                    rows={3}
                    placeholder="Digite sua mensagem…"
                    className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-blue-500/50"
                  />
                  {result === 'ok' && <p className="text-[11px] text-emerald-400">✓ Resposta enviada!</p>}
                  {result?.startsWith('err:') && <p className="text-[11px] text-red-400">{result.slice(4)}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleReply}
                      disabled={isPending || reply.trim().length < 2}
                      className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
                    >
                      {isPending ? 'Enviando…' : 'Enviar'}
                    </button>
                    <button onClick={() => { setShowReply(false); setReply('') }} className="text-[11px] text-slate-500 hover:text-slate-300">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isClosed && (
            <p className="text-[10.5px] text-slate-700 text-center py-2">
              Este chamado foi encerrado. Abra um novo chamado se precisar de mais ajuda.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
