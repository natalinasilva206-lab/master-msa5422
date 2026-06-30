'use client'

import { useState, useTransition } from 'react'
import { setCdiLock, requestEarlyWithdraw } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateBR(iso: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso + 'T12:00:00'))
}

function addMonths(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso + 'T23:59:59').getTime() - Date.now()) / 86400000)
}

const presets = [
  { label: '1 mês',    months: 1  },
  { label: '3 meses',  months: 3  },
  { label: '6 meses',  months: 6  },
  { label: '12 meses', months: 12 },
  { label: '24 meses', months: 24 },
]

interface Props {
  cdiBalance: number
  cdiRate: number
  lockExpiresAt: string | null       // active lock date (ISO)
  pendingRequest: { id: string; amount: number } | null
}

export function CdiLockButton({ cdiBalance, cdiRate, lockExpiresAt, pendingRequest }: Props) {
  const [mode, setMode] = useState<'idle' | 'setLock' | 'earlyWithdraw'>('idle')
  const [months, setMonths] = useState(6)
  const [customDate, setCustomDate] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isLocked = lockExpiresAt !== null && daysLeft(lockExpiresAt) > 0
  const days = lockExpiresAt ? daysLeft(lockExpiresAt) : null
  const expiresFormatted = lockExpiresAt ? formatDateBR(lockExpiresAt) : null

  const projectedDate = customDate || addMonths(months)
  const rendEstimado = cdiBalance * (Math.pow(1 + cdiRate / 100, months) - 1)

  function handleSetLock() {
    startTransition(async () => {
      const res = await setCdiLock(months, projectedDate)
      if (res.error) { setError(res.error); return }
      setSuccess(`CDI bloqueado até ${formatDateBR(projectedDate)}`)
      setTimeout(() => { setSuccess(null); setMode('idle') }, 2000)
    })
  }

  const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0

  function handleEarlyRequest() {
    if (parsedAmount <= 0) { setError('Informe um valor.'); return }
    if (parsedAmount > cdiBalance) { setError('Valor maior que o saldo em CDI.'); return }
    startTransition(async () => {
      const res = await requestEarlyWithdraw(parsedAmount)
      if (res.error) { setError(res.error); return }
      setSuccess('Solicitação enviada. Aguarde aprovação do administrador.')
      setTimeout(() => { setSuccess(null); setMode('idle') }, 2500)
    })
  }

  // ── Estado: pendingRequest ──────────────────────────────────────────────────
  if (pendingRequest) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-amber-300">Resgate antecipado em análise</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              R$ {formatBRL(pendingRequest.amount)} · aguardando aprovação do administrador
            </p>
          </div>
        </div>
        <span className="text-[10.5px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          Pendente
        </span>
      </div>
    )
  }

  // ── Estado: bloqueado ───────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-[12.5px] font-semibold text-blue-300">CDI bloqueado até {expiresFormatted}</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {days} dia{days !== 1 ? 's' : ''} restante{days !== 1 ? 's' : ''} · resgate automático na data de vencimento
              </p>
            </div>
          </div>
          <button
            onClick={() => { setMode('earlyWithdraw'); setError('') }}
            className="text-[11.5px] font-semibold text-slate-400 hover:text-amber-400 border border-slate-700/60 hover:border-amber-500/30 bg-slate-800/60 hover:bg-amber-500/5 px-3 py-1.5 rounded-lg transition-colors"
          >
            Solicitar resgate antecipado
          </button>
        </div>

        {/* Form resgate antecipado */}
        {mode === 'earlyWithdraw' && (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Solicitação de resgate antecipado</p>
            <p className="text-[11px] text-slate-500">
              O resgate antecipado precisa ser aprovado pelo administrador. Sujeito a análise.
            </p>

            {success ? (
              <p className="text-[12px] text-emerald-400 font-medium">{success}</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 pointer-events-none">R$</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setError('') }}
                      placeholder="0,00"
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700/60 text-white text-[13px] font-bold tabular-nums rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition placeholder-slate-700"
                    />
                  </div>
                  <button
                    onClick={() => setAmount(formatBRL(cdiBalance))}
                    className="text-[10.5px] font-semibold text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2.5 py-2 rounded-lg transition-colors"
                  >
                    Tudo
                  </button>
                </div>

                {error && <p className="text-[11px] text-red-400">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setMode('idle'); setError(''); setAmount('') }}
                    className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEarlyRequest}
                    disabled={isPending || parsedAmount <= 0}
                    className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors"
                  >
                    {isPending ? 'Enviando...' : 'Enviar solicitação'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Estado: sem bloqueio ────────────────────────────────────────────────────
  if (cdiBalance <= 0) return null

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800/60 text-slate-500 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[12.5px] font-semibold text-slate-300">Bloquear CDI por prazo</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Garanta o rendimento por um período definido</p>
          </div>
        </div>
        <button
          onClick={() => { setMode(mode === 'setLock' ? 'idle' : 'setLock'); setError('') }}
          className="text-[11.5px] font-semibold text-slate-400 hover:text-blue-400 border border-slate-700/60 hover:border-blue-500/30 bg-slate-800/60 hover:bg-blue-500/5 px-3 py-1.5 rounded-lg transition-colors"
        >
          {mode === 'setLock' ? 'Cancelar' : 'Definir prazo'}
        </button>
      </div>

      {mode === 'setLock' && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-4">

          {success ? (
            <p className="text-[12px] text-emerald-400 font-semibold text-center py-2">{success}</p>
          ) : (
            <>
              {/* Presets */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Escolha o prazo</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.months}
                      onClick={() => { setMonths(p.months); setCustomDate('') }}
                      className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        months === p.months && !customDate
                          ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                          : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Ou escolha uma data específica</p>
                <input
                  type="date"
                  value={customDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-2 text-[12px] bg-slate-900 border border-slate-700/60 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Preview */}
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Projeção do bloqueio</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <p className="text-[10px] text-slate-600">Vencimento</p>
                    <p className="text-[13px] font-bold text-white">{formatDateBR(projectedDate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600">Rendimento estimado</p>
                    <p className="text-[13px] font-bold text-emerald-400">+R$ {formatBRL(rendEstimado)}</p>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-600 mt-1">
                  Resgate só liberado na data ou com aprovação do administrador.
                </p>
              </div>

              {error && <p className="text-[11px] text-red-400">{error}</p>}

              <button
                onClick={handleSetLock}
                disabled={isPending}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
              >
                {isPending ? 'Bloqueando...' : `Confirmar bloqueio até ${formatDateBR(projectedDate)}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
