'use client'

import { useState, useTransition } from 'react'
import { setRiskBalance, type RiskAction } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  merchantId: string
  pendingBalance: number
  reservedBalance: number
  blockedBalance: number
  futureBalance: number
  releaseLogs: { id: string; amount: number; releaseDate: string; reason: string }[]
}

type PanelMode = 'reserve' | 'block' | 'future' | 'release_reserved' | 'release_blocked' | 'release_future' | null

const BLOCK_REASONS = [
  'Chargeback recebido',
  'MED Pix em disputa',
  'Solicitação de reembolso',
  'Análise manual de risco',
  'Suspeita de fraude',
  'Limite de crédito excedido',
  'Outro',
]

const RESERVE_REASONS = [
  'Reserva padrão de risco',
  'Volume acima do histórico',
  'Produto de alto risco',
  'Período de onboarding',
  'Solicitação compliance',
  'Outro',
]

export function RiskPanel({ merchantId, pendingBalance, reservedBalance, blockedBalance, futureBalance, releaseLogs }: Props) {
  const [mode, setMode]       = useState<PanelMode>(null)
  const [amount, setAmount]   = useState('')
  const [reason, setReason]   = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [isPending, start]    = useTransition()

  const totalProtected = reservedBalance + blockedBalance + futureBalance

  function reset() {
    setAmount('')
    setReason('')
    setReleaseDate('')
    setError('')
    setSuccess('')
  }

  function openMode(m: PanelMode) {
    reset()
    setMode(m)
  }

  function handleSubmit() {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0) { setError('Informe um valor válido.'); return }
    if (!reason.trim()) { setError('Informe o motivo.'); return }
    if (mode === 'future' && !releaseDate) { setError('Informe a data de liberação.'); return }
    setError('')
    setSuccess('')
    start(async () => {
      const res = await setRiskBalance(merchantId, mode as RiskAction, parsed, reason, releaseDate || undefined)
      if (res.error) { setError(res.error); return }
      setSuccess('Operação realizada com sucesso.')
      reset()
      setMode(null)
    })
  }

  const modeLabel: Record<NonNullable<PanelMode>, string> = {
    reserve:         'Separar como Reserva de Risco',
    block:           'Bloquear Saldo',
    future:          'Agendar Liberação Futura',
    release_reserved:'Liberar Saldo Reservado',
    release_blocked: 'Liberar Saldo Bloqueado',
    release_future:  'Liberar Saldo Futuro',
  }

  const modeReasons: Record<NonNullable<PanelMode>, string[]> = {
    reserve:          RESERVE_REASONS,
    block:            BLOCK_REASONS,
    future:           RESERVE_REASONS,
    release_reserved: ['Risco eliminado', 'Período de retenção encerrado', 'Análise concluída sem irregularidades', 'Outro'],
    release_blocked:  ['Disputa resolvida', 'Chargeback revertido', 'MED encerrado', 'Reembolso processado', 'Outro'],
    release_future:   ['Data de liberação antecipada', 'Liberação programada executada', 'Outro'],
  }

  const isRelease = mode?.startsWith('release_')
  const maxAmount = isRelease
    ? mode === 'release_reserved' ? reservedBalance
      : mode === 'release_blocked' ? blockedBalance
      : futureBalance
    : pendingBalance

  return (
    <div className="space-y-4">

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: 'Saldo Disponível',
            value: pendingBalance,
            color: 'text-emerald-400',
            border: 'border-emerald-500/20',
            icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
            iconBg: 'bg-emerald-500/10 text-emerald-400',
            sub: 'livre para saque',
          },
          {
            label: 'Saldo Reservado',
            value: reservedBalance,
            color: 'text-amber-400',
            border: 'border-amber-500/20',
            icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
            iconBg: 'bg-amber-500/10 text-amber-400',
            sub: 'reserva de risco',
          },
          {
            label: 'Saldo Bloqueado',
            value: blockedBalance,
            color: 'text-red-400',
            border: 'border-red-500/20',
            icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
            iconBg: 'bg-red-500/10 text-red-400',
            sub: 'chargeback / MED / fraude',
          },
          {
            label: 'Próximas Liberações',
            value: futureBalance,
            color: 'text-blue-400',
            border: 'border-blue-500/15',
            icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            iconBg: 'bg-blue-500/10 text-blue-400',
            sub: `${releaseLogs.length} agendamento${releaseLogs.length !== 1 ? 's' : ''}`,
          },
          {
            label: 'Total Protegido',
            value: totalProtected,
            color: totalProtected > 0 ? 'text-purple-400' : 'text-slate-600',
            border: 'border-purple-500/15',
            icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
            iconBg: 'bg-purple-500/10 text-purple-400',
            sub: 'reserva + bloqueado + futuro',
          },
        ].map((c) => (
          <div key={c.label} className={`bg-slate-800/50 border ${c.border} rounded-xl p-3.5`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${c.iconBg}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
              </svg>
            </div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{c.label}</p>
            <p className={`text-[15px] font-bold tabular-nums leading-none ${c.color}`}>R$ {formatBRL(c.value)}</p>
            <p className="text-[9.5px] text-slate-600 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {([
          { m: 'reserve'  as PanelMode, label: 'Separar Reserva',  color: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10',   icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
          { m: 'block'    as PanelMode, label: 'Bloquear',          color: 'border-red-500/30 text-red-400 hover:bg-red-500/10',         icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
          { m: 'future'   as PanelMode, label: 'Agendar Liberação', color: 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10',     icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
        ] as { m: PanelMode; label: string; color: string; icon: string }[]).map((b) => (
          <button
            key={b.m!}
            onClick={() => openMode(b.m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-all ${b.color} ${mode === b.m ? 'ring-1 ring-current' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={b.icon} />
            </svg>
            {b.label}
          </button>
        ))}
        {/* Release buttons — only shown if there's something to release */}
        {reservedBalance > 0 && (
          <button onClick={() => openMode('release_reserved')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-all border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 ${mode === 'release_reserved' ? 'ring-1 ring-emerald-400' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
            Liberar Reserva
          </button>
        )}
        {blockedBalance > 0 && (
          <button onClick={() => openMode('release_blocked')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-all border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 ${mode === 'release_blocked' ? 'ring-1 ring-emerald-400' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
            Liberar Bloqueio
          </button>
        )}
        {futureBalance > 0 && (
          <button onClick={() => openMode('release_future')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-all border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 ${mode === 'release_future' ? 'ring-1 ring-emerald-400' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
            Liberar Futuro
          </button>
        )}
      </div>

      {/* Action Form */}
      {mode && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <p className="text-[12.5px] font-semibold text-white">{modeLabel[mode]}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Valor (máx: R$ {formatBRL(maxAmount)})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500">R$</span>
                <input
                  type="number"
                  min="0"
                  max={maxAmount}
                  step="0.01"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError('') }}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-900/60 border border-slate-600/60 text-white text-[13px] font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Motivo</label>
              <select
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/60 text-slate-300 text-[12.5px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              >
                <option value="">Selecione o motivo…</option>
                {modeReasons[mode].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {mode === 'future' && (
            <div>
              <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Data de liberação</label>
              <input
                type="date"
                value={releaseDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => { setReleaseDate(e.target.value); setError('') }}
                className="px-3 py-2.5 bg-slate-900/60 border border-slate-600/60 text-white text-[12.5px] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
              />
            </div>
          )}

          {error && (
            <p className="text-[11.5px] text-red-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </p>
          )}

          {success && (
            <p className="text-[11.5px] text-emerald-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={isPending || !amount || !reason || (mode === 'future' && !releaseDate)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[12px] font-semibold transition-colors flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processando…
                </>
              ) : 'Confirmar'}
            </button>
            <button
              onClick={() => { setMode(null); reset() }}
              className="px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 text-[12px] font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Agendamentos futuros */}
      {releaseLogs.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/40">
            <p className="text-[12px] font-semibold text-white">Liberações Agendadas</p>
          </div>
          <div className="divide-y divide-slate-700/30">
            {releaseLogs.map((l) => (
              <div key={l.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-medium text-slate-200">{l.reason}</p>
                  <p className="text-[10px] text-slate-600">
                    Liberação prevista: <span className="text-blue-400 font-semibold">{new Date(l.releaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                  </p>
                </div>
                <p className="text-[13px] font-bold text-blue-400 tabular-nums shrink-0">R$ {formatBRL(l.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
