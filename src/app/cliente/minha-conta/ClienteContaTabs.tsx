'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import {
  updateSellerProfile,
  updateMerchantInfo,
  changeSellerPassword,
  revokeSellerSessions,
  saveSellerTheme,
} from './actions'

/* ── Types ── */
type SecurityLog = { id: string; action: string; metadata: string | null; createdAt: Date }
type Merchant = {
  id: string; name: string; email: string; document: string
  type: string; status: string; plan: string
  balance: number; pendingBalance: number; cdiRate: number
  tradeName: string | null; commercialPhone: string | null
  website: string | null; instagram: string | null
  segment: string | null; address: string | null
  legalRepresentative: string | null
  createdAt: Date
}
type User = {
  id: string; name: string; email: string; phone: string | null
  theme: string; accentColor: string
  lastLoginAt: Date | null; lastLoginIp: string | null; lastLoginUa: string | null
  createdAt: Date
}

const TABS = ['Meu Perfil', 'Empresa', 'Alterar Senha', 'Segurança', 'Preferências'] as const
type Tab = typeof TABS[number]

/* ── Root ── */
export function ClienteContaTabs({
  user,
  merchant,
  securityLogs,
  tokenIat,
}: {
  user: User
  merchant: Merchant | null
  securityLogs: SecurityLog[]
  tokenIat: number | null
}) {
  const [activeTab, setActiveTab] = useState<Tab>('Meu Perfil')

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-900/60 border border-slate-800/60 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Meu Perfil'   && <PerfilTab user={user} merchant={merchant} />}
      {activeTab === 'Empresa'      && <EmpresaTab merchant={merchant} securityLogs={securityLogs} />}
      {activeTab === 'Alterar Senha' && <SenhaTab />}
      {activeTab === 'Segurança'    && <SegurancaTab user={user} securityLogs={securityLogs} tokenIat={tokenIat} />}
      {activeTab === 'Preferências' && <PreferenciasTab user={user} />}
    </div>
  )
}

/* ────────────────────── helpers ────────────────────── */

function Alert({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-[12px] font-medium border ${
      type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
      {type === 'success' ? (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {text}
    </div>
  )
}

function SaveButton({ isPending, label = 'Salvar Alterações' }: { isPending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
    >
      {isPending ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Salvando…
        </>
      ) : label}
    </button>
  )
}

function Field({
  label, name, defaultValue = '', placeholder = '', readOnly = false, type = 'text',
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string; readOnly?: boolean; type?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
        {readOnly && (
          <span className="ml-2 text-[9.5px] font-normal normal-case text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded">
            somente leitura
          </span>
        )}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          readOnly={readOnly}
          placeholder={readOnly ? undefined : placeholder}
          className={`w-full rounded-lg px-4 py-2.5 text-[13px] transition focus:outline-none ${
            readOnly
              ? 'bg-slate-800/30 border border-slate-800/60 text-slate-500 cursor-not-allowed select-none'
              : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 placeholder-slate-600 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30'
          }`}
        />
        {readOnly && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-white">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="border-t border-slate-800/50" />
      {children}
    </div>
  )
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE:  { label: 'Ativa',       color: 'text-emerald-400', dot: 'bg-emerald-400' },
  REVIEW:  { label: 'Em revisão',  color: 'text-amber-400',   dot: 'bg-amber-400'   },
  BLOCKED: { label: 'Bloqueada',   color: 'text-red-400',     dot: 'bg-red-400'     },
}
const TYPE_LABELS: Record<string, string> = {
  ECOMMERCE:    'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
  SERVICOS:     'Prestador de Serviços',
  MARKETPLACE:  'Marketplace',
}

/* ──────────── Meu Perfil ──────────── */
function PerfilTab({ user, merchant }: { user: User; merchant: Merchant | null }) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const initials = (user.name || 'U').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const sm       = STATUS_META[merchant?.status ?? 'REVIEW'] ?? STATUS_META['REVIEW']

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateSellerProfile(fd)
      if (res?.error) setMsg({ type: 'error', text: res.error })
      else            setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    })
  }

  return (
    <Card title="Meu Perfil" subtitle="Dados pessoais do responsável pela conta">
      {/* Avatar row */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-[20px] font-bold text-white select-none shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-200">{user.name}</p>
          <p className="text-[11px] text-slate-500">{user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              Seller
            </span>
            {merchant && (
              <span className={`flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                sm.color
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                {sm.label}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/40" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome do responsável" name="name" defaultValue={user.name} placeholder="Seu nome completo" />
        <Field label="Telefone"            name="phone" defaultValue={user.phone ?? ''} placeholder="+55 (11) 99999-9999" />
        <Field label="E-mail de acesso"    name="email" defaultValue={user.email} readOnly />

        <div className="bg-slate-800/30 border border-slate-800/40 rounded-lg px-4 py-3 text-[11px] text-slate-600">
          Para alterar o e-mail de acesso, entre em contato com o suporte.
        </div>

        {msg && <Alert type={msg.type} text={msg.text} />}
        <div className="pt-1">
          <SaveButton isPending={isPending} />
        </div>
      </form>
    </Card>
  )
}

/* ──────────── Empresa ──────────── */

type ChangeEntry = { field: string; label: string; from: string | null; to: string | null }
type EmpresaAuditLog = { id: string; action: string; metadata: string | null; createdAt: Date }

function EmpresaTab({
  merchant,
  securityLogs,
}: {
  merchant: Merchant | null
  securityLogs: EmpresaAuditLog[]
}) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const sm = STATUS_META[merchant?.status ?? 'REVIEW'] ?? STATUS_META['REVIEW']
  const isApproved = merchant?.status === 'ACTIVE'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateMerchantInfo(fd)
      if (res?.error) {
        setMsg({ type: 'error', text: res.error })
      } else if ((res as any)?.statusChangedToReview) {
        setMsg({ type: 'success', text: 'Alterações salvas. Dados sensíveis entrarão em análise antes de serem aplicados.' })
      } else {
        setMsg({ type: 'success', text: 'Informações da empresa atualizadas com sucesso!' })
      }
    })
  }

  if (!merchant) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-10 max-w-2xl text-center text-[12px] text-slate-600">
        Nenhuma empresa vinculada a esta conta.
      </div>
    )
  }

  // Audit logs specifically for merchant changes
  const merchantLogs = securityLogs.filter(l => l.action === 'UPDATE_MERCHANT_INFO')

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── KYC / read-only header ── */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white">Dados Cadastrais</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">Validados pelo KYC — somente leitura</p>
          </div>
          <div className={`flex items-center gap-1.5 text-[10.5px] font-semibold ${sm.color}`}>
            <span className={`w-2 h-2 rounded-full ${sm.dot}`} />
            {sm.label}
          </div>
        </div>
        <div className="divide-y divide-slate-800/40">
          {[
            { label: 'Razão Social',    value: merchant.name },
            { label: 'CNPJ / CPF',     value: merchant.document },
            { label: 'E-mail da empresa', value: merchant.email },
            { label: 'Plano atual',     value: merchant.plan },
            { label: 'Taxa CDI/mês',   value: `${merchant.cdiRate.toFixed(2)}%` },
            { label: 'Membro desde',   value: new Date(merchant.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-600 shrink-0">{label}</p>
              <p className="text-[12.5px] text-slate-300 font-medium text-right">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Editable fields ── */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-[13px] font-semibold text-white">Informações Editáveis</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Alterações em endereço e responsável legal podem gerar revisão de cadastro
          </p>
        </div>
        <div className="border-t border-slate-800/50" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Nome Fantasia"
              name="tradeName"
              defaultValue={merchant.tradeName ?? ''}
              placeholder="Ex.: Loja ABC"
            />
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Tipo de Negócio
              </label>
              <select
                name="type"
                defaultValue={merchant.type}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 text-[13px] text-slate-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
              >
                {Object.entries(TYPE_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val} className="bg-slate-900">{lbl}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Segmento"
              name="segment"
              defaultValue={merchant.segment ?? ''}
              placeholder="Ex.: Moda feminina"
            />
            <Field
              label="Telefone Comercial"
              name="commercialPhone"
              defaultValue={merchant.commercialPhone ?? ''}
              placeholder="+55 (11) 3000-0000"
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Site"
              name="website"
              defaultValue={merchant.website ?? ''}
              placeholder="https://exemplo.com.br"
            />
            <Field
              label="Instagram"
              name="instagram"
              defaultValue={merchant.instagram ?? ''}
              placeholder="@seuinstagram"
            />
          </div>

          {/* Sensitive fields — shown with warning */}
          <div className="rounded-xl bg-slate-800/20 border border-slate-800/40 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[10.5px] text-amber-400 font-semibold">
                Campos abaixo são sensíveis — alterações geram revisão de cadastro{isApproved ? '' : ' (conta já em análise)'}
              </p>
            </div>
            <Field
              label="Endereço Comercial"
              name="address"
              defaultValue={merchant.address ?? ''}
              placeholder="Rua, número, bairro, cidade — UF"
            />
            <Field
              label="Responsável Legal"
              name="legalRepresentative"
              defaultValue={merchant.legalRepresentative ?? ''}
              placeholder="Nome completo do sócio/responsável"
            />
          </div>

          {msg && <Alert type={msg.type} text={msg.text} />}

          <div className="pt-1">
            <SaveButton isPending={isPending} />
          </div>
        </form>
      </div>

      {/* ── Change history ── */}
      {merchantLogs.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen(o => !o)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
          >
            <div>
              <p className="text-[13px] font-semibold text-white">Histórico de Alterações</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{merchantLogs.length} registro{merchantLogs.length !== 1 ? 's' : ''}</p>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {historyOpen && (
            <div className="divide-y divide-slate-800/40">
              {merchantLogs.map((log) => {
                let meta: { changes?: ChangeEntry[]; updatedAt?: string; sensitiveReview?: boolean } = {}
                try { meta = JSON.parse(log.metadata ?? '{}') } catch {}
                const changes: ChangeEntry[] = meta.changes ?? []

                return (
                  <div key={log.id} className="px-5 py-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-6 h-6 rounded-md bg-slate-700/50 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <p className="text-[12px] font-semibold text-slate-200">
                          {changes.length} campo{changes.length !== 1 ? 's' : ''} alterado{changes.length !== 1 ? 's' : ''}
                        </p>
                        {meta.sensitiveReview && (
                          <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Em análise
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-600">
                          {new Date(log.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Field-level diff */}
                    {changes.length > 0 && (
                      <div className="rounded-lg overflow-hidden border border-slate-800/50">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-slate-800/40">
                              <th className="text-left px-3 py-2 text-[9.5px] font-bold uppercase tracking-widest text-slate-600">Campo</th>
                              <th className="text-left px-3 py-2 text-[9.5px] font-bold uppercase tracking-widest text-slate-600">Anterior</th>
                              <th className="text-left px-3 py-2 text-[9.5px] font-bold uppercase tracking-widest text-slate-600">Novo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/30">
                            {changes.map((c, i) => (
                              <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                                <td className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">{c.label}</td>
                                <td className="px-3 py-2 text-red-400/70 max-w-[160px] truncate">
                                  {c.from ?? <span className="text-slate-700 italic">vazio</span>}
                                </td>
                                <td className="px-3 py-2 text-emerald-400 max-w-[160px] truncate">
                                  {c.to ?? <span className="text-slate-700 italic">removido</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Support note */}
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3.5 flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p className="text-[12px] font-semibold text-amber-400">Dados protegidos pelo KYC</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Razão Social, CNPJ/CPF e e-mail da empresa só podem ser alterados pelo suporte.
            {' '}<a href="/cliente/suporte" className="text-amber-400 hover:underline">Abrir chamado</a>
          </p>
        </div>
      </div>
    </div>
  )
}

/* ──────────── Alterar Senha ──────────── */

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function getStrength(pw: string) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)         s++
  if (pw.length >= 12)        s++
  if (/[A-Z]/.test(pw))      s++
  if (/[0-9]/.test(pw))      s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { score: 1, label: 'Muito fraca',  color: 'bg-red-500' },
    { score: 2, label: 'Fraca',        color: 'bg-orange-500' },
    { score: 3, label: 'Média',        color: 'bg-yellow-400' },
    { score: 4, label: 'Forte',        color: 'bg-blue-500' },
    { score: 5, label: 'Muito forte',  color: 'bg-emerald-500' },
  ]
  return map.find(m => s <= m.score) ?? map[4]
}

function PwField({ name, label, placeholder, value, onChange }: {
  name: string; label: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 pr-11 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

function SenhaTab() {
  const [isPending, startTransition] = useTransition()
  const [current,  setCurrent]  = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [msg,      setMsg]      = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [success,  setSuccess]  = useState(false)

  const strength  = getStrength(newPw)
  const mismatch  = confirm.length > 0 && newPw !== confirm
  const matchOk   = confirm.length > 0 && newPw === confirm

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newPw !== confirm) { setMsg({ type: 'error', text: 'As senhas não coincidem.' }); return }
    if (newPw.length < 8)  { setMsg({ type: 'error', text: 'Mínimo 8 caracteres.' }); return }
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await changeSellerPassword(fd)
      if (res?.error) setMsg({ type: 'error', text: res.error })
      else { setSuccess(true); setTimeout(() => signOut({ callbackUrl: '/login' }), 3000) }
    })
  }, [newPw, confirm])

  if (success) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-10 max-w-2xl flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-white">Senha alterada com sucesso!</p>
          <p className="text-[12px] text-slate-500 mt-1">Todas as sessões foram encerradas por segurança.<br />Redirecionando para o login…</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Aguarde…
        </div>
      </div>
    )
  }

  return (
    <Card title="Alterar Senha" subtitle="Após a alteração, todas as sessões ativas serão encerradas">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PwField name="currentPassword" label="Senha atual"          placeholder="Digite sua senha atual" value={current}  onChange={setCurrent} />
        <div>
          <PwField name="newPassword"     label="Nova senha"           placeholder="Mínimo 8 caracteres"   value={newPw}    onChange={setNewPw} />
          {newPw.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-all ${(strength.score ?? 0) >= s ? strength.color : 'bg-slate-800'}`} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-semibold text-slate-400">{strength.label}</p>
                <div className="flex gap-3 text-[10px] text-slate-600">
                  {[['8+','length'],['A–Z','upper'],['0–9','digit'],['!@#','special']].map(([lbl, key]) => (
                    <span key={key} className={
                      (key === 'length'  && newPw.length >= 8)        ? 'text-emerald-400' :
                      (key === 'upper'   && /[A-Z]/.test(newPw))      ? 'text-emerald-400' :
                      (key === 'digit'   && /[0-9]/.test(newPw))      ? 'text-emerald-400' :
                      (key === 'special' && /[^A-Za-z0-9]/.test(newPw)) ? 'text-emerald-400' : ''
                    }>{lbl}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <PwField name="confirmPassword" label="Confirmar nova senha" placeholder="Repita a nova senha"     value={confirm}  onChange={setConfirm} />
          {confirm.length > 0 && (
            <p className={`mt-1.5 text-[10.5px] font-medium flex items-center gap-1.5 ${matchOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {matchOk
                ? <><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Senhas coincidem</>
                : <><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>Senhas não coincidem</>
              }
            </p>
          )}
        </div>

        {msg && <Alert type={msg.type} text={msg.text} />}

        <div className="pt-1 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || mismatch || newPw.length < 8 || !current}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            {isPending
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Alterando…</>
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  Alterar Senha
                </>
            }
          </button>
        </div>
      </form>
    </Card>
  )
}

/* ──────────── Segurança ──────────── */

function fmtDT(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtRel(d: Date | null | undefined) {
  if (!d) return '—'
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)    return 'agora mesmo'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d atrás`
  return fmtDT(d)
}
function parseMeta(m: string | null): Record<string, string> {
  try { return JSON.parse(m ?? '{}') } catch { return {} }
}
function parseUa(ua: string) {
  let b = 'Navegador desconhecido'
  if (/Edg\//.test(ua))          b = 'Microsoft Edge'
  else if (/Chrome\//.test(ua))  b = 'Google Chrome'
  else if (/Safari\//.test(ua))  b = 'Safari'
  else if (/Firefox\//.test(ua)) b = 'Firefox'
  else if (/OPR\//.test(ua))     b = 'Opera'
  let os = ''
  if (/Windows NT/.test(ua))       os = 'Windows'
  else if (/Mac OS X/.test(ua))    os = 'macOS'
  else if (/Android/.test(ua))     os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua))       os = 'Linux'
  return os ? `${b} · ${os}` : b
}

const SEC_META: Record<string, { label: string; icon: string; color: string }> = {
  LOGIN_SUCCESS:        { label: 'Login realizado',          icon: '→', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  LOGIN_FAILED:         { label: 'Tentativa de login falha', icon: '✕', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  CHANGE_PASSWORD:      { label: 'Senha alterada',           icon: '🔑',color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  UPDATE_PROFILE:       { label: 'Perfil atualizado',        icon: '✎', color: 'text-slate-400 bg-slate-700/30 border-slate-700/30' },
  UPDATE_MERCHANT_INFO: { label: 'Empresa atualizada',       icon: '✎', color: 'text-slate-400 bg-slate-700/30 border-slate-700/30' },
  UPDATE_THEME:         { label: 'Tema alterado',            icon: '◑', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  SESSION_REVOKED:      { label: 'Sessões encerradas',       icon: '⊘', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
}

function SegurancaTab({ user, securityLogs, tokenIat }: {
  user: User; securityLogs: SecurityLog[]; tokenIat: number | null
}) {
  const [isPending, startTransition]  = useTransition()
  const [revoked,   setRevoked]       = useState(false)
  const [clientUa,  setClientUa]      = useState('')
  const [sessionStart, setSessionStart] = useState('')

  useEffect(() => {
    setClientUa(parseUa(navigator.userAgent))
    if (tokenIat) setSessionStart(fmtDT(new Date(tokenIat * 1000)))
  }, [tokenIat])

  const lastLoginMeta = parseMeta(securityLogs.find(l => l.action === 'LOGIN_SUCCESS')?.metadata ?? null)

  function handleRevoke() {
    startTransition(async () => {
      await revokeSellerSessions()
      setRevoked(true)
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2500)
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Status + last login */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-3">
        <p className="text-[13px] font-semibold text-white">Status da Conta</p>
        <div className="border-t border-slate-800/50" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Status',         node: <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />Ativa</span> },
            { label: 'Função',         node: <span className="text-[9.5px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Seller</span> },
            { label: 'Último login',   node: <div><p className="text-[12px] font-semibold text-slate-200">{fmtRel(user.lastLoginAt)}</p><p className="text-[10px] text-slate-600">{fmtDT(user.lastLoginAt)}</p></div> },
            { label: 'IP',             node: <span className="text-[12px] font-semibold text-slate-200 font-mono">{user.lastLoginIp ?? '—'}</span> },
          ].map(({ label, node }) => (
            <div key={label} className="bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
              <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">{label}</p>
              {node}
            </div>
          ))}
          <div className="col-span-2 bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Dispositivo do Último Login</p>
            <p className="text-[12px] font-semibold text-slate-200">{user.lastLoginUa ? parseUa(user.lastLoginUa) : '—'}</p>
          </div>
        </div>
      </div>

      {/* 2FA */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-slate-200">Autenticação em Dois Fatores</p>
            <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Em breve</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Proteção extra com app autenticador (TOTP). Disponível em breve.</p>
        </div>
      </div>

      {/* Active session */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-white">Sessão Ativa</p>
          <button
            onClick={handleRevoke}
            disabled={isPending || revoked}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {revoked ? 'Encerrando…' : 'Encerrar sessão'}
          </button>
        </div>
        {revoked ? (
          <div className="px-5 py-6 text-center">
            <p className="text-[12px] font-semibold text-amber-400">Sessão encerrada. Redirecionando para o login…</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="flex items-start gap-3.5 p-4 bg-slate-800/30 border border-emerald-500/20 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12.5px] font-semibold text-slate-200">{clientUa || 'Detectando…'}</p>
                  <span className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Ativa
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-[9.5px] text-slate-600">Login em</span><p className="text-[11px] text-slate-400">{sessionStart || '—'}</p></div>
                  <div><span className="text-[9.5px] text-slate-600">IP</span><p className="text-[11px] text-slate-400 font-mono">{lastLoginMeta.ip ?? user.lastLoginIp ?? '—'}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60">
          <p className="text-[13px] font-semibold text-white">Histórico de Segurança</p>
          <p className="text-[10.5px] text-slate-500 mt-0.5">Últimos {securityLogs.length} eventos registrados</p>
        </div>
        {securityLogs.length === 0 ? (
          <div className="px-5 py-10 text-center text-[12px] text-slate-600">
            Nenhum evento registrado. Os eventos aparecerão após o próximo login.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {securityLogs.map((log) => {
              const meta = parseMeta(log.metadata)
              const info = SEC_META[log.action] ?? { label: log.action, icon: '•', color: 'text-slate-500 bg-slate-800/40 border-slate-700/30' }
              return (
                <div key={log.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                  <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center text-[11px] shrink-0 ${info.color}`}>
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-semibold text-slate-200">{info.label}</p>
                      {meta.ip && <span className="text-[9.5px] text-slate-600 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">{meta.ip}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {meta.browser && <span className="text-[10.5px] text-slate-500">{meta.browser}{meta.os ? ` · ${meta.os}` : ''}</span>}
                      <span className="text-[10px] text-slate-700">{fmtDT(new Date(log.createdAt))}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-700 shrink-0 mt-0.5">{fmtRel(new Date(log.createdAt))}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────── Preferências ──────────── */

type ThemeId  = 'dark' | 'darker' | 'system' | 'light'
type AccentId = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber'

const THEMES: { id: ThemeId; label: string; desc: string; bg: string }[] = [
  { id: 'dark',    label: 'Dark',          desc: 'Padrão — fundo azulado',   bg: '#080c12' },
  { id: 'darker',  label: 'Dark Profundo', desc: 'Preto intenso',            bg: '#000000' },
  { id: 'light',   label: 'Claro',         desc: 'Interface em tons claros', bg: '#f1f5f9' },
  { id: 'system',  label: 'Sistema',       desc: 'Segue o SO',               bg: 'linear-gradient(135deg,#080c12 50%,#f1f5f9 50%)' },
]
const ACCENTS: { id: AccentId; label: string; hex: string }[] = [
  { id: 'blue',    label: 'Azul',    hex: '#3b82f6' },
  { id: 'violet',  label: 'Violeta', hex: '#8b5cf6' },
  { id: 'emerald', label: 'Verde',   hex: '#10b981' },
  { id: 'rose',    label: 'Rosa',    hex: '#f43f5e' },
  { id: 'amber',   label: 'Âmbar',  hex: '#f59e0b' },
]

function applyTheme(theme: ThemeId, accent: AccentId) {
  const shell = document.querySelector('.admin-shell') as HTMLElement | null
  if (!shell) return
  let resolved: ThemeId = theme
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  shell.dataset.theme  = resolved
  shell.dataset.accent = accent
}

function PreferenciasTab({ user }: { user: User }) {
  const [theme,  setTheme]  = useState<ThemeId>(user.theme as ThemeId   ?? 'dark')
  const [accent, setAccent] = useState<AccentId>(user.accentColor as AccentId ?? 'blue')
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { applyTheme(theme, accent) }, [theme, accent])

  function handleSave() {
    setMsg(null)
    startTransition(async () => {
      const res = await saveSellerTheme(theme, accent)
      if (res?.error) setMsg({ type: 'error', text: res.error })
      else            setMsg({ type: 'success', text: 'Preferências salvas! Serão mantidas após logout.' })
    })
  }

  const accentHex = ACCENTS.find(a => a.id === accent)?.hex ?? '#3b82f6'

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Theme */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-[14px] font-semibold text-white">Aparência</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Escolha como o painel será exibido para você</p>
        </div>
        <div className="border-t border-slate-800/50" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const sel = theme === t.id
            return (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={`relative rounded-xl p-3 border-2 text-left transition-all ${sel ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800/60 hover:border-slate-700'}`}
              >
                {sel && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                )}
                <div className="w-full h-9 rounded-lg mb-2.5 border border-slate-700/20 overflow-hidden"
                  style={{ background: t.bg }} />
                <p className="text-[11.5px] font-semibold text-slate-200">{t.label}</p>
                <p className="text-[9.5px] text-slate-600 mt-0.5">{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Accent */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-[14px] font-semibold text-white">Cor Principal</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Cor usada em botões e destaques</p>
        </div>
        <div className="border-t border-slate-800/50" />
        <div className="flex flex-wrap gap-2.5">
          {ACCENTS.map((a) => {
            const sel = accent === a.id
            return (
              <button key={a.id} onClick={() => setAccent(a.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${sel ? 'border-white/20 bg-white/5' : 'border-slate-800/50 hover:border-slate-700'}`}
              >
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: a.hex, boxShadow: sel ? `0 0 8px ${a.hex}88` : undefined }} />
                <span className={`text-[12px] font-semibold ${sel ? 'text-slate-200' : 'text-slate-500'}`}>{a.label}</span>
              </button>
            )
          })}
        </div>
        {/* Preview strip */}
        <div className="rounded-xl overflow-hidden border border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: accentHex }}>
            <span className="text-[12px] font-semibold text-white flex-1">Prévia — botão principal</span>
          </div>
        </div>
      </div>

      {msg && <Alert type={msg.type} text={msg.text} />}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          {isPending
            ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Salvando…</>
            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Salvar Preferências</>
          }
        </button>
        <p className="text-[10.5px] text-slate-600">Prévia ativa — salve para manter após logout</p>
      </div>
    </div>
  )
}
