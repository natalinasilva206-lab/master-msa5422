'use client'

import { useState, useTransition } from 'react'
import { approveAntecipacao, rejectAntecipacao } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  id: string
  merchantName: string
  plan: string
  requestedAmount: number
  feePercent: number
  feeAmount: number
  netAmount: number
  notes: string | null
  createdAt: string
}

export function AntecipacaoRow({ id, merchantName, plan, requestedAmount, feePercent, feeAmount, netAmount, notes, createdAt }: Props) {
  const [status, setStatus] = useState<'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected'>('idle')
  const [customFee, setCustomFee]       = useState(String(feePercent))
  const [adminNotes, setAdminNotes]     = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')
  const [processing, startProcess] = useTransition()

  const parsedFee   = Math.max(0, Math.min(20, parseFloat(customFee) || 0))
  const computedFee = Math.round(requestedAmount * (parsedFee / 100) * 100) / 100
  const computedNet = Math.round((requestedAmount - computedFee) * 100) / 100

  function handleConfirmApprove() {
    startProcess(async () => {
      const r = await approveAntecipacao(id, adminNotes, parsedFee)
      if (r?.error) setError(r.error)
      else setStatus('approved')
    })
  }

  function handleConfirmReject() {
    startProcess(async () => {
      const r = await rejectAntecipacao(id, rejectReason)
      if (r?.error) setError(r.error)
      else setStatus('rejected')
    })
  }

  const done = status === 'approved' || status === 'rejected'

  return (
    <>
      <tr className={`hover:bg-slate-800/25 transition-colors ${done ? 'opacity-40' : ''}`}>
        <td className="px-5 py-3.5">
          <div>
            <p className="text-[13px] font-semibold text-white">{merchantName}</p>
            <p className="text-[10.5px] text-slate-500">
              {plan} · Taxa solicitada {feePercent}% · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(createdAt))}
            </p>
            {notes && <p className="text-[10px] text-slate-600 mt-0.5 italic">"{notes}"</p>}
          </div>
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="text-[13px] font-semibold text-amber-400 tabular-nums">R$ {formatBRL(requestedAmount)}</span>
        </td>
        <td className="px-4 py-3.5 text-right hidden md:table-cell">
          <span className="text-[12px] text-red-400 tabular-nums">−R$ {formatBRL(feeAmount)}</span>
        </td>
        <td className="px-5 py-3.5 text-right">
          <span className="text-[13px] font-bold text-emerald-400 tabular-nums">R$ {formatBRL(netAmount)}</span>
        </td>
        <td className="px-4 py-3.5 text-right">
          {status === 'approved' && (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Aprovado</span>
          )}
          {status === 'rejected' && (
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">Rejeitado</span>
          )}
          {status === 'idle' && (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => setStatus('approving')}
                className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full transition-colors"
              >
                Aprovar
              </button>
              <button
                onClick={() => setStatus('rejecting')}
                className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 px-2.5 py-1 rounded-full transition-colors"
              >
                Rejeitar
              </button>
            </div>
          )}
          {(status === 'approving' || status === 'rejecting') && (
            <button
              onClick={() => setStatus('idle')}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          )}
        </td>
      </tr>

      {/* Inline approve form */}
      {status === 'approving' && (
        <tr className="bg-emerald-500/5 border-l-2 border-emerald-500/30">
          <td colSpan={5} className="px-5 py-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Confirmar aprovação — {merchantName}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Taxa (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={customFee}
                      onChange={(e) => setCustomFee(e.target.value)}
                      className="w-24 px-3 py-1.5 bg-slate-800 border border-slate-700/60 text-white text-[12px] font-mono rounded-lg focus:outline-none focus:border-emerald-500/40"
                    />
                    <span className="text-[10.5px] text-slate-500">
                      Taxa: −R$ {formatBRL(computedFee)}<br />
                      Líquido: <span className="text-emerald-400 font-semibold">R$ {formatBRL(computedNet)}</span>
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Observação (opcional)</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Nota interna sobre esta aprovação..."
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700/60 text-slate-200 text-[12px] rounded-lg focus:outline-none focus:border-emerald-500/40 placeholder-slate-600"
                  />
                </div>
              </div>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmApprove}
                  disabled={processing}
                  className="px-4 py-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processando…' : `Confirmar aprovação · R$ ${formatBRL(computedNet)}`}
                </button>
                <button onClick={() => setStatus('idle')} className="px-3 py-1.5 text-[12px] text-slate-500 hover:text-slate-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Inline reject form */}
      {status === 'rejecting' && (
        <tr className="bg-red-500/5 border-l-2 border-red-500/30">
          <td colSpan={5} className="px-5 py-4">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Rejeitar solicitação — {merchantName}</p>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Motivo (será exibido ao seller)</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Saldo de cartão insuficiente, aguarde liberação natural..."
                  className="w-full max-w-md px-3 py-1.5 bg-slate-800 border border-slate-700/60 text-slate-200 text-[12px] rounded-lg focus:outline-none focus:border-red-500/40 placeholder-slate-600"
                />
              </div>
              {error && <p className="text-[11px] text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmReject}
                  disabled={processing}
                  className="px-4 py-1.5 text-[12px] font-semibold text-red-400 bg-red-500/15 border border-red-500/25 hover:bg-red-500/25 rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processando…' : 'Confirmar rejeição'}
                </button>
                <button onClick={() => setStatus('idle')} className="px-3 py-1.5 text-[12px] text-slate-500 hover:text-slate-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
