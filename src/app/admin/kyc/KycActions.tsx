'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { approveMerchant, rejectMerchant, requestCall, requestAdjustment } from './actions'

type AuditEntry = {
  id: string
  action: string
  createdAt: string
  metadata: string | null
  userName: string | null
}

type MerchantData = {
  id: string
  name: string
  email: string
  document: string
  type: string
  status: string
  plan: string
  balance: number
  pendingBalance: number
  cdiRate: number
  createdAt: string
  kycSubStatus: string
  userName: string | null
  userEmail: string | null
  auditHistory: AuditEntry[]
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
  SERVICOS: 'Prestador de Serviços',
  MARKETPLACE: 'Marketplace',
}

const actionLabel: Record<string, string> = {
  APPROVE_MERCHANT_KYC: 'KYC Aprovado',
  BLOCK_MERCHANT_KYC: 'KYC Bloqueado',
  KYC_REJECTED: 'KYC Rejeitado',
  KYC_CALL_REQUESTED: 'Call Solicitado',
  KYC_ADJUSTMENT_REQUESTED: 'Ajuste Solicitado',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const subStatusLabel: Record<string, string> = {
  EM_ANALISE: 'Em Análise',
  AGUARDANDO_CALL: 'Aguardando Call',
  AJUSTE_SOLICITADO: 'Ajuste Solicitado',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
}

const subStatusStyle: Record<string, string> = {
  EM_ANALISE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  AGUARDANDO_CALL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  AJUSTE_SOLICITADO: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  APROVADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJEITADO: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export function KycActions({ merchant }: { merchant: MerchantData }) {
  const [showMenu, setShowMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'pessoal' | 'empresa' | 'bancario' | 'historico'>('pessoal')
  const [note, setNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [approving, startApprove] = useTransition()
  const [rejecting, startReject] = useTransition()
  const [calling, startCall] = useTransition()
  const [adjusting, startAdjust] = useTransition()
  const pending = approving || rejecting || calling || adjusting

  const canAction = ['EM_ANALISE', 'AGUARDANDO_CALL', 'AJUSTE_SOLICITADO'].includes(merchant.kycSubStatus)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function openModal(tab: typeof activeTab = 'pessoal', withNote = false) {
    setActiveTab(tab)
    setShowNoteInput(withNote)
    setNote('')
    setShowModal(true)
    setShowMenu(false)
  }

  function closeModal() {
    setShowModal(false)
    setShowNoteInput(false)
    setNote('')
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu((s) => !s)}
          disabled={pending}
          className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-[11.5px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/40 transition-colors disabled:opacity-40"
        >
          {pending ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
          ) : (
            <>
              Ações
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-10 z-30 w-56 bg-[#0d1117] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden">
            {/* Ver Detalhes */}
            <div className="p-1.5">
              <button
                onClick={() => openModal('pessoal')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-medium text-slate-200 hover:bg-slate-800/80 flex items-center gap-3 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </span>
                Ver Detalhes
              </button>
            </div>

            {canAction && (
              <>
                <div className="h-px bg-slate-800/60 mx-2" />
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { startApprove(() => approveMerchant(merchant.id)); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-medium text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    Aprovar
                  </button>
                  <button
                    onClick={() => openModal('pessoal', true)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-medium text-amber-400 hover:bg-amber-500/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </span>
                    Solicitar Ajustes
                  </button>
                  <button
                    onClick={() => { startCall(() => requestCall(merchant.id)); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-medium text-blue-400 hover:bg-blue-500/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </span>
                    Solicitar Call
                  </button>
                </div>
                <div className="h-px bg-slate-800/60 mx-2" />
                <div className="p-1.5">
                  <button
                    onClick={() => { startReject(() => rejectMerchant(merchant.id)); setShowMenu(false) }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </span>
                    Rejeitar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="w-full max-w-2xl bg-[#0d1117] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <p className="text-[14px] font-semibold text-white">Análise de KYC — {merchant.name}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${subStatusStyle[merchant.kycSubStatus] ?? subStatusStyle['EM_ANALISE']}`}>
                  {subStatusLabel[merchant.kycSubStatus] ?? merchant.kycSubStatus}
                </span>
              </div>
              <button onClick={closeModal} className="text-slate-600 hover:text-slate-400 transition-colors mt-1 shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800/60 px-6 gap-1">
              {(['pessoal', 'empresa', 'bancario', 'historico'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-[12px] font-semibold border-b-2 transition-colors -mb-px ${
                    activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {tab === 'pessoal' ? 'Pessoal' : tab === 'empresa' ? 'Empresa' : tab === 'bancario' ? 'Bancário' : 'Histórico'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6 max-h-[55vh] overflow-y-auto">
              {activeTab === 'pessoal' && (
                <div className="space-y-0 divide-y divide-slate-800/40">
                  {[
                    { label: 'Nome completo', value: merchant.name },
                    { label: 'CPF / CNPJ', value: merchant.document },
                    { label: 'E-mail da empresa', value: merchant.email },
                    { label: 'Responsável (usuário)', value: merchant.userName ?? '—' },
                    { label: 'E-mail de login', value: merchant.userEmail ?? '—' },
                    { label: 'Cadastrado em', value: new Date(merchant.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3">
                      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{row.label}</p>
                      <p className="text-[12.5px] text-slate-300 text-right">{row.value}</p>
                    </div>
                  ))}

                  {showNoteInput && (
                    <div className="pt-4 space-y-2">
                      <label className="block text-[10.5px] font-semibold text-amber-500 uppercase tracking-widest">Descreva o ajuste necessário</label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-900/80 border border-amber-500/30 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder-slate-700 focus:outline-none focus:border-amber-500/60 resize-none"
                        placeholder="Ex: Documento ilegível, selfie sem o documento em mãos..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => { setShowNoteInput(false); setNote('') }} className="flex-1 py-2 text-[12px] font-semibold text-slate-400 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 rounded-lg transition-colors">
                          Cancelar
                        </button>
                        <button
                          onClick={() => { if (note.trim()) { startAdjust(() => requestAdjustment(merchant.id, note)); closeModal() } }}
                          disabled={!note.trim() || adjusting}
                          className="flex-1 py-2 text-[12px] font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 rounded-lg transition-colors"
                        >
                          {adjusting ? 'Enviando...' : 'Enviar Solicitação'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'empresa' && (
                <div className="divide-y divide-slate-800/40">
                  {[
                    { label: 'Razão Social', value: merchant.name },
                    { label: 'CNPJ / CPF', value: merchant.document },
                    { label: 'Tipo de negócio', value: typeLabel[merchant.type] ?? merchant.type },
                    { label: 'Plano', value: merchant.plan },
                    { label: 'Saldo CDI', value: `R$ ${formatBRL(merchant.balance)}` },
                    { label: 'Saldo Disponível', value: `R$ ${formatBRL(merchant.pendingBalance)}` },
                    { label: 'Taxa CDI/mês', value: `${merchant.cdiRate.toFixed(2)}%` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-3">
                      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{row.label}</p>
                      <p className="text-[12.5px] text-slate-300 text-right">{row.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'bancario' && (
                <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                  <svg className="w-10 h-10 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <p className="text-[13px] font-medium">Dados bancários não cadastrados</p>
                  <p className="text-[11px] text-slate-800 mt-1">O seller ainda não vinculou uma conta bancária.</p>
                </div>
              )}

              {activeTab === 'historico' && (
                <div>
                  {merchant.auditHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                      <p className="text-[13px] font-medium">Sem histórico de ações KYC</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/40">
                      {merchant.auditHistory.map((log) => {
                        let noteMeta: string | null = null
                        try { noteMeta = JSON.parse(log.metadata ?? '{}').note ?? null } catch {}
                        return (
                          <div key={log.id} className="flex items-start gap-3 py-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-slate-300">{actionLabel[log.action] ?? log.action}</p>
                              {noteMeta && <p className="text-[11px] text-slate-500 mt-0.5 italic">"{noteMeta}"</p>}
                              <p className="text-[10px] text-slate-700 mt-0.5">
                                {new Date(log.createdAt).toLocaleString('pt-BR')}
                                {log.userName ? ` · ${log.userName}` : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {canAction && !showNoteInput && (
              <div className="px-6 py-4 border-t border-slate-800/60 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Solicitar Ajustes
                </button>
                <button
                  onClick={() => { startCall(() => requestCall(merchant.id)); closeModal() }}
                  disabled={calling}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {calling ? 'Solicitando...' : 'Solicitante Chamado'}
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => { startReject(() => rejectMerchant(merchant.id)); closeModal() }}
                  disabled={rejecting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  {rejecting ? '...' : 'Rejeitar'}
                </button>
                <button
                  onClick={() => { startApprove(() => approveMerchant(merchant.id)); closeModal() }}
                  disabled={approving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {approving ? 'Aprovando...' : 'Aprovar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
