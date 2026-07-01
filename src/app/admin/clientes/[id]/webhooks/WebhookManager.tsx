'use client'

import { useState, useTransition } from 'react'
import { createWebhook, toggleWebhook, deleteWebhook, rotateWebhookSecret } from './actions'

const ALL_EVENTS = [
  { value: 'payment.approved',   label: 'Pagamento aprovado' },
  { value: 'payment.refused',    label: 'Pagamento recusado' },
  { value: 'refund.created',     label: 'Reembolso criado' },
  { value: 'chargeback.opened',  label: 'Chargeback aberto' },
  { value: 'med.opened',         label: 'MED Pix aberto' },
  { value: 'dispute.updated',    label: 'Disputa atualizada' },
  { value: 'balance.updated',    label: 'Saldo atualizado' },
  { value: 'withdrawal.created', label: 'Saque solicitado' },
  { value: 'withdrawal.paid',    label: 'Saque pago' },
  { value: 'withdrawal.rejected', label: 'Saque rejeitado' },
  { value: 'reserve.released',   label: 'Reserva liberada' },
  { value: 'cdi.credited',       label: 'CDI creditado' },
  { value: 'merchant.activated', label: 'Conta ativada' },
  { value: 'merchant.blocked',   label: 'Conta bloqueada' },
]

interface Endpoint {
  id: string
  url: string
  events: string
  secret: string
  active: boolean
  createdAt: Date
}

export function WebhookManager({ merchantId, endpoints }: { merchantId: string; endpoints: Endpoint[] }) {
  const [adding, setAdding]     = useState(false)
  const [url, setUrl]           = useState('')
  const [events, setEvents]     = useState<string[]>([])
  const [error, setError]       = useState('')
  const [isPending, start]      = useTransition()
  const [revealId, setRevealId] = useState<string | null>(null)

  function toggleEvent(e: string) {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])
  }

  function handleCreate() {
    if (!url.trim()) { setError('URL obrigatória.'); return }
    if (!url.startsWith('https://')) { setError('URL deve usar HTTPS.'); return }
    setError('')
    start(async () => {
      try {
        await createWebhook(merchantId, url, events)
        setUrl(''); setEvents([]); setAdding(false)
      } catch (e: any) { setError(e?.message ?? 'Erro.') }
    })
  }

  function fmtDate(d: Date) {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
  }

  return (
    <div className="space-y-4">
      {/* Existing endpoints */}
      {endpoints.length === 0 && !adding && (
        <div className="flex flex-col items-center justify-center py-10 text-slate-700">
          <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-[12.5px] font-medium">Nenhum webhook configurado</p>
        </div>
      )}

      {endpoints.map((ep) => {
        let evts: string[] = []
        try { evts = JSON.parse(ep.events) } catch {}
        return (
          <div key={ep.id} className={`border rounded-xl p-4 space-y-2 ${ep.active ? 'border-slate-700/60 bg-slate-800/20' : 'border-slate-800/40 opacity-60'}`}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${ep.active ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-slate-500 bg-slate-800/60 border border-slate-700/40'}`}>
                    {ep.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="text-[10px] text-slate-600">{fmtDate(ep.createdAt)}</span>
                </div>
                <p className="text-[12.5px] font-mono text-slate-300 truncate">{ep.url}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => start(() => toggleWebhook(ep.id, merchantId, !ep.active))}
                  disabled={isPending}
                  className="text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  {ep.active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => { if (confirm('Excluir este endpoint?')) start(() => deleteWebhook(ep.id, merchantId)) }}
                  disabled={isPending}
                  className="text-[10px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40"
                >
                  Excluir
                </button>
              </div>
            </div>

            {evts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {evts.map((e) => (
                  <span key={e} className="text-[9.5px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    {ALL_EVENTS.find((ae) => ae.value === e)?.label ?? e}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-slate-600 font-mono truncate flex-1">
                Secret: {revealId === ep.id ? ep.secret : '••••••••••••••••••••••••'}
              </p>
              <button onClick={() => setRevealId(revealId === ep.id ? null : ep.id)} className="text-[10px] text-slate-500 hover:text-slate-300 shrink-0">
                {revealId === ep.id ? 'Ocultar' : 'Revelar'}
              </button>
              <button
                onClick={() => { if (confirm('Rotacionar secret? O secret atual deixará de funcionar.')) start(() => rotateWebhookSecret(ep.id, merchantId)) }}
                disabled={isPending}
                className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 shrink-0 disabled:opacity-40"
              >
                Rotacionar
              </button>
            </div>
          </div>
        )
      })}

      {/* Add new */}
      {adding ? (
        <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-4 space-y-3">
          <p className="text-[12px] font-semibold text-white">Novo Endpoint</p>
          <div>
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">URL (HTTPS)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError('') }}
              placeholder="https://seu-site.com/webhook"
              className="mt-1 w-full text-[12.5px] font-mono bg-slate-800/60 border border-slate-700/60 text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Eventos (vazio = todos)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_EVENTS.map((ev) => (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={`text-[10.5px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    events.includes(ev.value)
                      ? 'text-blue-400 bg-blue-500/15 border-blue-500/30'
                      : 'text-slate-500 bg-slate-800/60 border-slate-700/40 hover:border-slate-600/60'
                  }`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={isPending} className="text-[11.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded-xl transition-colors">
              {isPending ? 'Criando…' : 'Criar Endpoint'}
            </button>
            <button onClick={() => { setAdding(false); setUrl(''); setEvents([]); setError('') }} className="text-[11.5px] font-semibold text-slate-500 hover:text-slate-300 px-3 py-2 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold text-blue-400 hover:text-blue-300 border border-dashed border-blue-500/25 hover:border-blue-500/40 rounded-xl py-3 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Endpoint
        </button>
      )}
    </div>
  )
}
