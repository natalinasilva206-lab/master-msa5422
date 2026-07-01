'use client'

import { useState, useTransition } from 'react'
import { resetApiKey, revokeApiKey } from './actions'

interface MerchantBrief {
  id: string
  name: string
  email: string
  apiKey: string | null
}

export function MerchantManageDrawer({ merchant }: { merchant: MerchantBrief }) {
  const [open, setOpen]       = useState(false)
  const [confirm, setConfirm] = useState<'reset' | 'revoke' | null>(null)
  const [newKey, setNewKey]   = useState<string | null>(null)
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, start]    = useTransition()

  function close() { if (!confirm) { setOpen(false); setMsg(null); setNewKey(null) } }

  function handleReset() {
    start(async () => {
      const res = await resetApiKey(merchant.id)
      setConfirm(null)
      if (res.ok && res.apiKey) {
        setNewKey(res.apiKey)
        setMsg({ type: 'ok', text: 'API Key resetada com sucesso.' })
      } else {
        setMsg({ type: 'err', text: res.error ?? 'Erro ao resetar.' })
      }
    })
  }

  function handleRevoke() {
    start(async () => {
      const res = await revokeApiKey(merchant.id)
      setConfirm(null)
      if (res.ok) {
        setMsg({ type: 'ok', text: 'API Key revogada. O merchant ficará sem acesso à API.' })
      } else {
        setMsg({ type: 'err', text: res.error ?? 'Erro ao revogar.' })
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
      >
        Gerenciar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} />

          {/* Drawer */}
          <div className="relative w-full max-w-[360px] bg-slate-900 border-l border-slate-800/80 h-full overflow-y-auto shadow-2xl flex flex-col">

            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{merchant.name}</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">{merchant.email}</p>
              </div>
              <button onClick={close} className="text-slate-600 hover:text-white mt-0.5 shrink-0 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 flex-1">

              {/* Feedback */}
              {msg && (
                <div className={`text-[11.5px] px-3 py-2.5 rounded-lg border ${
                  msg.type === 'ok'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {msg.text}
                </div>
              )}

              {/* New key reveal */}
              {newKey && (
                <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Nova API Key — copie agora</p>
                  <code className="text-[10.5px] font-mono text-slate-200 break-all block">{newKey}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }}
                    className="text-[10.5px] text-blue-400 hover:text-blue-300 underline"
                  >
                    Copiar e fechar
                  </button>
                </div>
              )}

              {/* API Key status */}
              <div className="space-y-2">
                <p className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">API Key</p>
                <div className={`text-[11px] px-3 py-2 rounded-lg border ${
                  merchant.apiKey
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800/40 border border-slate-700/40 text-slate-500'
                }`}>
                  {merchant.apiKey ? '✓ Configurada' : '— Sem chave gerada'}
                </div>

                <button
                  onClick={() => setConfirm('reset')}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                >
                  <p className="text-[11.5px] font-semibold text-amber-400">Resetar API Key</p>
                  <p className="text-[10px] text-amber-500/60 mt-0.5">Gera nova chave e invalida a atual</p>
                </button>

                <button
                  onClick={() => setConfirm('revoke')}
                  disabled={isPending || !merchant.apiKey}
                  className="w-full text-left px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                >
                  <p className="text-[11.5px] font-semibold text-red-400">Revogar API Key</p>
                  <p className="text-[10px] text-red-400/60 mt-0.5">Remove a chave — merchant sem acesso até gerar nova</p>
                </button>
              </div>

              {/* Links */}
              <div className="space-y-2">
                <p className="text-[10.5px] font-semibold text-slate-600 uppercase tracking-wider">Navegar</p>
                <a
                  href={`/admin/clientes/${merchant.id}/webhooks`}
                  className="flex items-center gap-2.5 text-[11.5px] text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 px-3 py-2.5 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Gerenciar webhooks
                </a>
                <a
                  href={`/admin/clientes/${merchant.id}`}
                  className="flex items-center gap-2.5 text-[11.5px] text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 px-3 py-2.5 rounded-xl transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Perfil completo do merchant
                </a>
              </div>
            </div>
          </div>

          {/* Confirm modal */}
          {confirm && (
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
              <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
                <p className="text-[13px] font-semibold text-white">
                  {confirm === 'reset' ? 'Resetar API Key?' : 'Revogar API Key?'}
                </p>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">
                  {confirm === 'reset'
                    ? `Uma nova chave será gerada para "${merchant.name}". A chave atual deixará de funcionar imediatamente. O merchant precisará atualizar sua integração.`
                    : `A API Key de "${merchant.name}" será removida. O merchant perderá acesso à API até gerar uma nova chave no painel.`
                  }
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirm === 'reset' ? handleReset : handleRevoke}
                    disabled={isPending}
                    className={`flex-1 text-[11.5px] font-semibold py-2.5 rounded-xl border transition-colors disabled:opacity-40 ${
                      confirm === 'reset'
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/30'
                        : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border-red-500/30'
                    }`}
                  >
                    {isPending ? 'Aguarde…' : confirm === 'reset' ? 'Sim, resetar' : 'Sim, revogar'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    disabled={isPending}
                    className="flex-1 text-[11.5px] font-semibold text-slate-400 hover:text-white border border-slate-700/40 py-2.5 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
