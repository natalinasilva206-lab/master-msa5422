'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { setCdiLock, requestEarlyWithdraw } from './actions'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDateBR(iso: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso + 'T12:00:00'))
}
function daysLeft(iso: string): number {
  return Math.ceil((new Date(iso + 'T23:59:59').getTime() - Date.now()) / 86400000)
}
function totalDays(createdAt: string, expiresAt: string): number {
  return Math.ceil((new Date(expiresAt + 'T23:59:59').getTime() - new Date(createdAt).getTime()) / 86400000)
}
function shortId(id: string) {
  return id.slice(-6).toUpperCase()
}

export interface CdiTitulo {
  id: string
  amount: number
  expiresAt: string
  rate: number
  createdAt: string
  pendingRequestId?: string
  pendingAmount?: number
}

interface Props {
  cdiBalance: number
  freeCdiBalance: number
  cdiRate: number
  titulos: CdiTitulo[]
}

const presets = [
  { label: '1m',  months: 1  },
  { label: '3m',  months: 3  },
  { label: '6m',  months: 6  },
  { label: '12m', months: 12 },
  { label: '24m', months: 24 },
]

function addMonths(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

// ── Título card ─────────────────────────────────────────────────────────────
function TituloCard({ titulo, cdiBalance }: { titulo: CdiTitulo; cdiBalance: number }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const days = daysLeft(titulo.expiresAt)
  const total = totalDays(titulo.createdAt, titulo.expiresAt)
  const elapsed = Math.max(0, total - days)
  const progress = Math.min(100, (elapsed / Math.max(total, 1)) * 100)
  const expired = days <= 0

  const rendEstimado = titulo.amount * (Math.pow(1 + titulo.rate / 100, Math.ceil(total / 30)) - 1)
  const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0

  if (titulo.pendingRequestId) {
    return (
      <div className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Título #{shortId(titulo.id)}</span>
              <span className="text-[9px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">Resgate em análise</span>
            </div>
            <p className="text-[16px] font-bold text-white tabular-nums">R$ {formatBRL(titulo.amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9.5px] text-slate-600 mb-0.5">Vencimento</p>
            <p className="text-[11.5px] font-semibold text-slate-400">{formatDateBR(titulo.expiresAt)}</p>
          </div>
        </div>
        <p className="text-[10.5px] text-slate-500">
          Solicitação de resgate de R$ {formatBRL(titulo.pendingAmount ?? titulo.amount)} aguardando aprovação.
        </p>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${expired ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/40 border-slate-700/40'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Título #{shortId(titulo.id)}</span>
            {expired ? (
              <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Vencido — disponível</span>
            ) : (
              <span className="text-[9px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Bloqueado</span>
            )}
          </div>
          <p className="text-[18px] font-bold text-white tabular-nums">R$ {formatBRL(titulo.amount)}</p>
          <p className="text-[10.5px] text-emerald-400 mt-0.5">+R$ {formatBRL(rendEstimado)} estimado</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9.5px] text-slate-600 mb-0.5">{expired ? 'Venceu em' : 'Vence em'}</p>
          <p className="text-[12px] font-semibold text-slate-300">{formatDateBR(titulo.expiresAt)}</p>
          {!expired && (
            <p className="text-[10px] text-slate-600 mt-0.5">{days} dia{days !== 1 ? 's' : ''}</p>
          )}
          <p className="text-[10px] text-slate-600">{titulo.rate.toFixed(2)}%/mês</p>
        </div>
      </div>

      {/* Progress bar */}
      {!expired && (
        <div>
          <div className="h-1 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-700">{formatDateBR(titulo.createdAt.slice(0, 10))}</span>
            <span className="text-[9px] text-slate-700">{formatDateBR(titulo.expiresAt)}</span>
          </div>
        </div>
      )}

      {/* Resgate antecipado */}
      {!expired && (
        <>
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="w-full text-[11px] font-semibold text-slate-500 hover:text-amber-400 border border-slate-700/40 hover:border-amber-500/20 bg-slate-800/40 hover:bg-amber-500/5 py-1.5 rounded-lg transition-colors"
            >
              Solicitar resgate antecipado
            </button>
          ) : (
            <div className="space-y-2.5">
              {success ? (
                <p className="text-[11.5px] text-emerald-400 font-medium text-center py-1">Solicitação enviada! Aguarde aprovação.</p>
              ) : (
                <>
                  <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5">
                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-[10.5px] text-amber-300/80">
                      O resgate antecipado está sujeito a aprovação e pode incorrer em <strong>multa de 10% sobre o valor</strong> resgatado antes do vencimento.
                    </p>
                  </div>
                  <p className="text-[10.5px] text-slate-500">Valor a resgatar antecipadamente:</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 pointer-events-none">R$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => { setAmount(e.target.value); setError('') }}
                        placeholder="0,00"
                        autoFocus
                        className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700/60 text-white text-[13px] font-bold tabular-nums rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/30 transition placeholder-slate-700"
                      />
                    </div>
                    <button onClick={() => setAmount(formatBRL(titulo.amount))} className="text-[10.5px] font-semibold text-slate-400 hover:text-white bg-slate-700/60 px-2.5 py-2 rounded-lg transition-colors">Tudo</button>
                  </div>
                  {error && <p className="text-[10.5px] text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setOpen(false); setError(''); setAmount('') }} className="flex-1 py-1.5 text-[11.5px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/40 rounded-lg transition-colors">Cancelar</button>
                    <button
                      onClick={() => {
                        if (parsedAmount <= 0) { setError('Informe um valor.'); return }
                        if (parsedAmount > titulo.amount) { setError('Maior que o título.'); return }
                        startTransition(async () => {
                          const res = await requestEarlyWithdraw(titulo.id, parsedAmount)
                          if (res.error) { setError(res.error); return }
                          setSuccess(true)
                          setTimeout(() => setOpen(false), 2000)
                        })
                      }}
                      disabled={isPending}
                      className="flex-1 py-1.5 text-[11.5px] font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg transition-colors"
                    >
                      {isPending ? '...' : 'Enviar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Novo título modal ────────────────────────────────────────────────────────
function NovoTituloModal({ freeCdiBalance, cdiRate, onClose }: { freeCdiBalance: number; cdiRate: number; onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [expiresAt, setExpiresAt] = useState(addMonths(6))
  const [preset, setPreset] = useState(6)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  const parsed = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0
  const days = Math.ceil((new Date(expiresAt + 'T23:59:59').getTime() - Date.now()) / 86400000)
  const months = Math.max(1, Math.ceil(days / 30))
  const rendEstimado = parsed > 0 ? parsed * (Math.pow(1 + cdiRate / 100, months) - 1) : 0

  function handlePreset(m: number) {
    setPreset(m)
    setExpiresAt(addMonths(m))
  }

  function handleSubmit() {
    if (parsed <= 0) { setError('Informe um valor.'); return }
    if (parsed > freeCdiBalance) { setError('Valor maior que o saldo CDI livre.'); return }
    if (!expiresAt) { setError('Informe uma data de vencimento.'); return }
    startTransition(async () => {
      const res = await setCdiLock(parsed, expiresAt)
      if (res.error) { setError(res.error); return }
      setSuccess(true)
      setTimeout(() => onClose(), 1800)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0d1420] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white leading-none">Criar Título de Bloqueio</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Livre CDI: R$ {formatBRL(freeCdiBalance)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-white">Título criado!</p>
            <p className="text-[12px] text-slate-500 mt-1.5">R$ {formatBRL(parsed)} bloqueado até {formatDateBR(expiresAt)}.</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">

            {/* Valor */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Valor a bloquear</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-500 pointer-events-none">R$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError('') }}
                  placeholder="0,00"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/60 border border-slate-700/60 text-white text-[15px] font-bold tabular-nums rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition placeholder-slate-700"
                />
              </div>
              <div className="flex justify-end mt-1.5">
                <button onClick={() => setAmount(formatBRL(freeCdiBalance))} className="text-[10.5px] font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Usar tudo disponível (R$ {formatBRL(freeCdiBalance)})
                </button>
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data de vencimento</label>
              {/* Presets */}
              <div className="flex gap-1.5 mb-2">
                {presets.map((p) => (
                  <button
                    key={p.months}
                    onClick={() => handlePreset(p.months)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      preset === p.months && expiresAt === addMonths(p.months)
                        ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={expiresAt}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                onChange={(e) => { setExpiresAt(e.target.value); setPreset(0) }}
                className="w-full px-3 py-2.5 text-[13px] bg-slate-800/60 border border-slate-700/60 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition"
              />
            </div>

            {/* Preview */}
            {parsed > 0 && parsed <= freeCdiBalance && (
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3.5 space-y-2">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Resumo do título</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9.5px] text-slate-600 mb-0.5">Valor</p>
                    <p className="text-[13px] font-bold text-white tabular-nums">R$ {formatBRL(parsed)}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] text-slate-600 mb-0.5">Vencimento</p>
                    <p className="text-[12px] font-bold text-white">{formatDateBR(expiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] text-slate-600 mb-0.5">Rendimento est.</p>
                    <p className="text-[13px] font-bold text-emerald-400 tabular-nums">+R$ {formatBRL(rendEstimado)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600">{cdiRate.toFixed(2)}%/mês · {days} dias · resgate só com aprovação se antecipado</p>
              </div>
            )}

            {error && (
              <p className="text-[11.5px] text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 transition-colors">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={isPending || parsed <= 0 || parsed > freeCdiBalance}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
              >
                {isPending ? 'Criando...' : 'Criar título'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export function CdiLockButton({ cdiBalance, freeCdiBalance, cdiRate, titulos }: Props) {
  const [showModal, setShowModal] = useState(false)

  if (cdiBalance <= 0) return null

  return (
    <>
      <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white">Títulos de Bloqueio CDI</p>
            <p className="text-[10.5px] text-slate-600 mt-0.5">
              {titulos.length > 0
                ? `${titulos.length} título${titulos.length !== 1 ? 's' : ''} ativo${titulos.length !== 1 ? 's' : ''} · CDI livre: R$ ${formatBRL(freeCdiBalance)}`
                : `Bloqueie parte do CDI por prazo definido · livre: R$ ${formatBRL(freeCdiBalance)}`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={freeCdiBalance <= 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold rounded-lg transition-colors ${
              freeCdiBalance > 0
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800/60 border border-slate-700/40 text-slate-600 cursor-not-allowed'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo título
          </button>
        </div>

        {titulos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-700">
            <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-[12.5px] font-medium">Nenhum título criado</p>
            <p className="text-[11px] text-slate-800 mt-1">Crie um título para bloquear parte do CDI por prazo.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {titulos.map((t) => (
              <TituloCard key={t.id} titulo={t} cdiBalance={cdiBalance} />
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <NovoTituloModal
          freeCdiBalance={freeCdiBalance}
          cdiRate={cdiRate}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
