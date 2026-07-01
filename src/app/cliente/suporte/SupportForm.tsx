'use client'

import { useState, useTransition } from 'react'
import { sendSupportTicket } from './actions'

const SUBJECTS = [
  'Dúvida sobre saque',
  'Problema com CDI',
  'Antecipação de recebíveis',
  'Integração / API',
  'Verificação de conta (KYC)',
  'Upgrade de plano',
  'Outro',
]

export function SupportForm({ plano }: { plano: string }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!subject) { setError('Selecione um assunto.'); return }
    if (message.trim().length < 10) { setError('Mensagem muito curta.'); return }
    setError('')
    startTransition(async () => {
      const res = await sendSupportTicket(subject, message)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setMessage('')
      setSubject('')
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-[15px] font-bold text-white">Mensagem enviada!</p>
        <p className="text-[12px] text-slate-500 mt-1.5">Nossa equipe responderá em até 8 horas úteis.</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-[11.5px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
        >
          Enviar outra mensagem
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">

      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Assunto
        </label>
        <select
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setError('') }}
          className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/60 text-slate-300 text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition"
        >
          <option value="">Selecione o assunto…</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          Mensagem
        </label>
        <textarea
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError('') }}
          placeholder="Descreva sua dúvida ou problema com o máximo de detalhes…"
          rows={5}
          className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[13px] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition placeholder-slate-700 resize-none"
        />
        <p className="text-[10px] text-slate-700 mt-1 text-right">{message.length} caracteres</p>
      </div>

      {error && (
        <p className="text-[11.5px] text-red-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || !subject || message.trim().length < 10}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Enviando…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Enviar Mensagem
          </>
        )}
      </button>

    </div>
  )
}
