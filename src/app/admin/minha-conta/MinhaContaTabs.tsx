'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { updateProfile, changePassword, saveTheme, revokeAllSessions } from './actions'

type SecurityLog = { id: string; action: string; metadata: string | null; createdAt: Date }

type User = {
  id: string; name: string; email: string; phone: string | null
  theme: string; accentColor: string
  lastLoginAt: Date | null; lastLoginIp: string | null; lastLoginUa: string | null
  createdAt: Date
}

const TABS = ['Meu Perfil', 'Alterar Senha', 'Tema', 'Segurança'] as const
type Tab = typeof TABS[number]

export function MinhaContaTabs({
  user,
  securityLogs,
  tokenIat,
}: {
  user: User
  securityLogs: SecurityLog[]
  tokenIat: number | null
}) {
  const [activeTab, setActiveTab] = useState<Tab>('Meu Perfil')

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/60 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Meu Perfil'   && <ProfileTab user={user} />}
      {activeTab === 'Alterar Senha' && <PasswordTab />}
      {activeTab === 'Tema'          && <TemaTab user={user} />}
      {activeTab === 'Segurança'     && <SegurancaTab user={user} securityLogs={securityLogs} tokenIat={tokenIat} />}
    </div>
  )
}

/* ─── Meu Perfil ─── */
function ProfileTab({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMessage(null)
    startTransition(async () => {
      const res = await updateProfile(fd)
      if (res?.error) setMessage({ type: 'error', text: res.error })
      else setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    })
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-white">Informações Pessoais</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Atualize seus dados cadastrais</p>
      </div>

      {/* Avatar placeholder */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-[22px] font-bold text-white select-none">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-slate-200">{user.name}</p>
          <p className="text-[11px] text-slate-500">{user.email}</p>
          <span className="mt-1 inline-block text-[9.5px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
            Admin
          </span>
        </div>
      </div>

      <div className="border-t border-slate-800/50" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
            Nome completo
          </label>
          <input
            name="name"
            defaultValue={user.name}
            required
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
            placeholder="Seu nome completo"
          />
        </div>

        {/* Telefone */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
            Telefone
          </label>
          <input
            name="phone"
            defaultValue={user.phone ?? ''}
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
            placeholder="+55 (11) 99999-9999"
          />
        </div>

        {/* E-mail (readonly) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
            E-mail
            <span className="ml-2 text-[9.5px] font-normal normal-case text-slate-600 bg-slate-800/60 px-2 py-0.5 rounded">
              somente leitura
            </span>
          </label>
          <div className="relative">
            <input
              readOnly
              value={user.email}
              className="w-full bg-slate-800/30 border border-slate-800/60 rounded-lg px-4 py-2.5 text-[13px] text-slate-500 cursor-not-allowed select-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-[12px] font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {message.text}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </>
            ) : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Alterar Senha ─── */

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

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Muito fraca', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Fraca',       color: 'bg-orange-500' }
  if (score === 3) return { score, label: 'Média',       color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Forte',       color: 'bg-blue-500' }
  return { score, label: 'Muito forte', color: 'bg-emerald-500' }
}

function PasswordField({
  name,
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  name: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  hint?: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 pr-11 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
      {hint}
    </div>
  )
}

function PasswordTab() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage]   = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [current,  setCurrent]  = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [success,  setSuccess]  = useState(false)

  const strength   = getStrength(newPw)
  const mismatch   = confirm.length > 0 && newPw !== confirm
  const matchOk    = confirm.length > 0 && newPw === confirm

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newPw !== confirm) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' })
      return
    }
    if (newPw.length < 8) {
      setMessage({ type: 'error', text: 'A nova senha deve ter ao menos 8 caracteres.' })
      return
    }
    const fd = new FormData(e.currentTarget)
    setMessage(null)
    startTransition(async () => {
      const res = await changePassword(fd)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setSuccess(true)
        // give 3s to read the success message, then sign out (session invalidated server-side)
        setTimeout(() => signOut({ callbackUrl: '/login' }), 3000)
      }
    })
  }, [newPw, confirm])

  if (success) {
    return (
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-8 max-w-2xl flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-white">Senha alterada com sucesso!</p>
          <p className="text-[12px] text-slate-500 mt-1">
            Por segurança, todas as sessões foram encerradas.<br />
            Redirecionando para o login em instantes…
          </p>
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
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-white">Alterar Senha</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Após a alteração, todas as sessões ativas serão encerradas automaticamente
        </p>
      </div>

      <div className="border-t border-slate-800/50" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Senha atual */}
        <PasswordField
          name="currentPassword"
          label="Senha atual"
          placeholder="Digite sua senha atual"
          value={current}
          onChange={setCurrent}
        />

        {/* Nova senha + indicador de força */}
        <PasswordField
          name="newPassword"
          label="Nova senha"
          placeholder="Mínimo 8 caracteres"
          value={newPw}
          onChange={setNewPw}
          hint={
            newPw.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {/* Barra de força */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <div
                      key={s}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        strength.score >= s ? strength.color : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-[10.5px] font-semibold ${
                    strength.score <= 1 ? 'text-red-400'
                    : strength.score === 2 ? 'text-orange-400'
                    : strength.score === 3 ? 'text-yellow-400'
                    : strength.score === 4 ? 'text-blue-400'
                    : 'text-emerald-400'
                  }`}>
                    {strength.label}
                  </p>
                  <div className="flex gap-3 text-[10px] text-slate-600">
                    <span className={newPw.length >= 8 ? 'text-emerald-400' : ''}>8+ chars</span>
                    <span className={/[A-Z]/.test(newPw) ? 'text-emerald-400' : ''}>A–Z</span>
                    <span className={/[0-9]/.test(newPw) ? 'text-emerald-400' : ''}>0–9</span>
                    <span className={/[^A-Za-z0-9]/.test(newPw) ? 'text-emerald-400' : ''}>!@#</span>
                  </div>
                </div>
              </div>
            ) : null
          }
        />

        {/* Confirmar senha */}
        <PasswordField
          name="confirmPassword"
          label="Confirmar nova senha"
          placeholder="Repita a nova senha"
          value={confirm}
          onChange={setConfirm}
          hint={
            confirm.length > 0 ? (
              <p className={`mt-1.5 text-[10.5px] font-medium flex items-center gap-1.5 ${
                matchOk ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {matchOk ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    As senhas coincidem
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    As senhas não coincidem
                  </>
                )}
              </p>
            ) : null
          }
        />

        {/* Requisitos de senha */}
        <div className="bg-slate-800/30 border border-slate-800/50 rounded-lg px-4 py-3 space-y-1.5">
          <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">Requisitos da senha</p>
          {[
            { label: 'Mínimo de 8 caracteres',       ok: newPw.length >= 8 },
            { label: 'Pelo menos uma letra maiúscula', ok: /[A-Z]/.test(newPw) },
            { label: 'Pelo menos um número',          ok: /[0-9]/.test(newPw) },
            { label: 'Pelo menos um caractere especial (!@#$…)', ok: /[^A-Za-z0-9]/.test(newPw) },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                r.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-700'
              }`}>
                {r.ok ? (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-1 h-1 rounded-full bg-slate-700" />
                )}
              </div>
              <span className={`text-[11px] transition-colors ${r.ok ? 'text-slate-300' : 'text-slate-600'}`}>
                {r.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error message */}
        {message && message.type === 'error' && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-[12px] font-medium border bg-red-500/10 border-red-500/20 text-red-400">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message.text}
          </div>
        )}

        <div className="pt-1 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || mismatch || newPw.length < 8 || !current}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Alterando…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Alterar Senha
              </>
            )}
          </button>
          {!current || newPw.length < 8 ? (
            <p className="text-[10.5px] text-slate-600">Preencha todos os campos para continuar</p>
          ) : mismatch ? (
            <p className="text-[10.5px] text-red-500">As senhas não coincidem</p>
          ) : null}
        </div>
      </form>
    </div>
  )
}

/* ─── Tema ─── */
type ThemeId  = 'dark' | 'darker' | 'system' | 'light'
type AccentId = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber'

const THEMES: { id: ThemeId; label: string; desc: string; bgPreview: string; cardPreview: string }[] = [
  { id: 'dark',    label: 'Dark',           desc: 'Padrão — fundo azulado escuro', bgPreview: '#080c12',  cardPreview: '#0f172a' },
  { id: 'darker',  label: 'Dark Profundo',  desc: 'Preto intenso',                bgPreview: '#000000',  cardPreview: '#0a0a0a' },
  { id: 'light',   label: 'Claro',          desc: 'Interface em tons claros',     bgPreview: '#f1f5f9',  cardPreview: '#ffffff' },
  { id: 'system',  label: 'Sistema',        desc: 'Segue a preferência do SO',    bgPreview: 'linear-gradient(135deg,#080c12 50%,#f1f5f9 50%)', cardPreview: '#0f172a' },
]

const ACCENTS: { id: AccentId; label: string; hex500: string; hex600: string }[] = [
  { id: 'blue',    label: 'Azul',     hex500: '#3b82f6', hex600: '#2563eb' },
  { id: 'violet',  label: 'Violeta',  hex500: '#8b5cf6', hex600: '#7c3aed' },
  { id: 'emerald', label: 'Verde',    hex500: '#10b981', hex600: '#059669' },
  { id: 'rose',    label: 'Rosa',     hex500: '#f43f5e', hex600: '#e11d48' },
  { id: 'amber',   label: 'Âmbar',   hex500: '#f59e0b', hex600: '#d97706' },
]

function applyThemeToDom(theme: ThemeId, accent: AccentId) {
  const shell = document.querySelector('.admin-shell') as HTMLElement | null
  if (!shell) return
  // Resolve 'system' to actual theme
  let resolved: ThemeId = theme
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  shell.dataset.theme  = resolved
  shell.dataset.accent = accent
}

function TemaTab({ user }: { user: User }) {
  const [theme,  setTheme]  = useState<ThemeId>(user.theme as ThemeId   ?? 'dark')
  const [accent, setAccent] = useState<AccentId>(user.accentColor as AccentId ?? 'blue')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Preview immediately when selection changes
  useEffect(() => {
    applyThemeToDom(theme, accent)
  }, [theme, accent])

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const res = await saveTheme(theme, accent)
      if (res?.error) {
        setMessage({ type: 'error', text: res.error })
      } else {
        setMessage({ type: 'success', text: 'Tema salvo! As preferências serão mantidas após logout.' })
      }
    })
  }

  const accentObj = ACCENTS.find(a => a.id === accent)!

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Tema */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-[14px] font-semibold text-white">Aparência</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Escolha como o painel será exibido para você</p>
        </div>
        <div className="border-t border-slate-800/50" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const isSelected = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative rounded-xl p-3 border-2 text-left transition-all group ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-800/60 hover:border-slate-700 hover:bg-slate-800/20'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Mini preview */}
                <div
                  className="w-full h-10 rounded-lg mb-2.5 border border-slate-700/20 overflow-hidden flex items-center gap-1 px-1.5"
                  style={{ background: t.bgPreview.startsWith('linear') ? t.bgPreview : t.bgPreview }}
                >
                  <div
                    className="w-2 h-6 rounded-sm opacity-60"
                    style={{ backgroundColor: t.id === 'light' ? '#e2e8f0' : '#1e293b' }}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="h-1 w-5 rounded-full" style={{ backgroundColor: accentObj.hex500 }} />
                    <div
                      className="h-0.5 w-8 rounded-full opacity-40"
                      style={{ backgroundColor: t.id === 'light' ? '#94a3b8' : '#475569' }}
                    />
                    <div
                      className="h-0.5 w-6 rounded-full opacity-20"
                      style={{ backgroundColor: t.id === 'light' ? '#94a3b8' : '#475569' }}
                    />
                  </div>
                </div>
                <p className="text-[11.5px] font-semibold text-slate-200 leading-tight">{t.label}</p>
                <p className="text-[9.5px] text-slate-600 mt-0.5 leading-tight">{t.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cor de destaque */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 space-y-4">
        <div>
          <p className="text-[14px] font-semibold text-white">Cor Principal</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Aplica-se em botões, links ativos e destaques</p>
        </div>
        <div className="border-t border-slate-800/50" />

        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => {
            const isSelected = accent === a.id
            return (
              <button
                key={a.id}
                onClick={() => setAccent(a.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-white/20 bg-white/5'
                    : 'border-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: a.hex500, boxShadow: isSelected ? `0 0 8px ${a.hex500}88` : undefined }}
                />
                <span className={`text-[12px] font-semibold ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                  {a.label}
                </span>
                {isSelected && (
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {/* Live preview strip */}
        <div className="rounded-xl overflow-hidden border border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: accentObj.hex600 }}>
            <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
              </svg>
            </div>
            <span className="text-[12px] font-semibold text-white flex-1">Prévia da cor — botão principal</span>
            <div className="w-2 h-2 rounded-full bg-white/40" />
          </div>
          <div className="bg-slate-800/40 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accentObj.hex500}22` }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentObj.hex500 }} />
            </div>
            <div>
              <div className="text-[11.5px] font-semibold text-slate-200">Link ativo no menu</div>
              <div className="text-[9.5px] mt-0.5" style={{ color: accentObj.hex500 }}>cor de destaque aplicada</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px] font-medium border ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          {isPending ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvando…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Salvar Preferências
            </>
          )}
        </button>
        <p className="text-[10.5px] text-slate-600">A prévia já está ativa — salve para manter após logout</p>
      </div>
    </div>
  )
}

/* ─── helpers ─── */
function fmtDateTime(d: Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtRelative(d: Date | null | undefined) {
  if (!d) return '—'
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60)   return 'agora mesmo'
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d atrás`
  return fmtDateTime(d)
}

function parseMeta(m: string | null): Record<string, string> {
  try { return JSON.parse(m ?? '{}') } catch { return {} }
}

function parseUaClient(ua: string): string {
  let browser = 'Navegador desconhecido'
  if (/Edg\//.test(ua))         browser = 'Microsoft Edge'
  else if (/Chrome\//.test(ua)) browser = 'Google Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/OPR\//.test(ua))    browser = 'Opera'

  let os = ''
  if (/Windows NT/.test(ua))        os = 'Windows'
  else if (/Mac OS X/.test(ua))     os = 'macOS'
  else if (/Android/.test(ua))      os = 'Android'
  else if (/iPhone|iPad/.test(ua))  os = 'iOS'
  else if (/Linux/.test(ua))        os = 'Linux'

  return os ? `${browser} · ${os}` : browser
}

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  LOGIN_SUCCESS:        { label: 'Login realizado',           icon: '→',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  LOGIN_FAILED:         { label: 'Tentativa de login falha',  icon: '✕',  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  CHANGE_PASSWORD:      { label: 'Senha alterada',            icon: '🔑', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  UPDATE_PROFILE:       { label: 'Perfil atualizado',         icon: '✎',  color: 'text-slate-400 bg-slate-700/30 border-slate-700/30' },
  UPDATE_THEME:         { label: 'Tema alterado',             icon: '◑',  color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  SESSION_REVOKED:      { label: 'Sessões encerradas',        icon: '⊘',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  APPROVE_MERCHANT_KYC: { label: 'KYC aprovado',             icon: '✓',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  KYC_REJECTED:         { label: 'KYC rejeitado',            icon: '✕',  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

/* ─── Segurança ─── */
function SegurancaTab({
  user,
  securityLogs,
  tokenIat,
}: {
  user: User
  securityLogs: SecurityLog[]
  tokenIat: number | null
}) {
  const [isPending,   startTransition]  = useTransition()
  const [revoking,    setRevoking]      = useState(false)
  const [revoked,     setRevoked]       = useState(false)
  const [clientUa,    setClientUa]      = useState<string>('')
  const [sessionStart, setSessionStart] = useState<string>('')

  useEffect(() => {
    setClientUa(parseUaClient(navigator.userAgent))
    if (tokenIat) {
      setSessionStart(fmtDateTime(new Date(tokenIat * 1000)))
    }
  }, [tokenIat])

  const lastLoginMeta = parseMeta(securityLogs.find(l => l.action === 'LOGIN_SUCCESS')?.metadata ?? null)

  function handleRevokeAll() {
    setRevoking(true)
    startTransition(async () => {
      await revokeAllSessions()
      setRevoked(true)
      setTimeout(() => signOut({ callbackUrl: '/login' }), 2500)
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Status da conta ── */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 space-y-3">
        <p className="text-[13px] font-semibold text-white">Status da Conta</p>
        <div className="border-t border-slate-800/50" />

        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-[12.5px] font-semibold text-emerald-400">Ativa</span>
            </div>
          </div>

          {/* Perfil */}
          <div className="bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Função</p>
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                Administrador
              </span>
            </div>
          </div>

          {/* Último login */}
          <div className="bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Último Login</p>
            <p className="text-[12px] font-semibold text-slate-200">
              {user.lastLoginAt ? fmtRelative(user.lastLoginAt) : '—'}
            </p>
            {user.lastLoginAt && (
              <p className="text-[10px] text-slate-600 mt-0.5">{fmtDateTime(user.lastLoginAt)}</p>
            )}
          </div>

          {/* IP */}
          <div className="bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">IP do Último Login</p>
            <p className="text-[12px] font-semibold text-slate-200 font-mono">
              {user.lastLoginIp ?? '—'}
            </p>
          </div>

          {/* Dispositivo */}
          <div className="col-span-2 bg-slate-800/30 border border-slate-800/40 rounded-xl p-3.5">
            <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Dispositivo do Último Login</p>
            <p className="text-[12px] font-semibold text-slate-200">
              {user.lastLoginUa ? parseUaClient(user.lastLoginUa) : '—'}
            </p>
            {user.lastLoginUa && (
              <p className="text-[10px] text-slate-600 mt-1 font-mono truncate">{user.lastLoginUa.slice(0, 80)}…</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 2FA ── */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[13px] font-semibold text-slate-200">Autenticação em Dois Fatores (2FA)</p>
              <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Em breve
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Adicione uma segunda camada de verificação via app autenticador (TOTP/FIDO2).
              Disponível em breve — a estrutura de armazenamento está preparada.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sessão ativa ── */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white">Sessão Ativa</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              JWT strategy — uma sessão ativa por token
            </p>
          </div>
          <button
            onClick={handleRevokeAll}
            disabled={isPending || revoked}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {revoked ? 'Encerrando…' : 'Encerrar todas'}
          </button>
        </div>

        {revoked ? (
          <div className="px-5 py-6 text-center">
            <p className="text-[12px] font-semibold text-amber-400">Todas as sessões foram encerradas.</p>
            <p className="text-[10.5px] text-slate-600 mt-1">Redirecionando para o login…</p>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="flex items-start gap-4 p-4 bg-slate-800/30 border border-emerald-500/20 rounded-xl">
              {/* Device icon */}
              <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[12.5px] font-semibold text-slate-200">
                    {clientUa || 'Detectando…'}
                  </p>
                  <span className="flex items-center gap-1 text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    Sessão atual
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-[9.5px] text-slate-600">Login em</span>
                    <p className="text-[11px] text-slate-400">{sessionStart || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-600">IP</span>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {lastLoginMeta.ip ?? user.lastLoginIp ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-600">E-mail</span>
                    <p className="text-[11px] text-slate-400">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-600">Função</span>
                    <p className="text-[11px] text-violet-400 font-semibold">Admin</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-[10px] text-slate-700 text-center">
              Clique em "Encerrar todas" para invalidar o token atual e forçar novo login
            </p>
          </div>
        )}
      </div>

      {/* ── Histórico de segurança ── */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60">
          <p className="text-[13px] font-semibold text-white">Histórico de Segurança</p>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            Últimos {securityLogs.length} eventos registrados
          </p>
        </div>

        {securityLogs.length === 0 ? (
          <div className="px-5 py-10 text-center text-[12px] text-slate-600">
            Nenhum evento de segurança registrado ainda.
            <br />
            <span className="text-[10.5px] text-slate-700">Os eventos aparecerão após o próximo login.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {securityLogs.map((log) => {
              const meta = parseMeta(log.metadata)
              const info = ACTION_META[log.action] ?? { label: log.action, icon: '•', color: 'text-slate-500 bg-slate-800/40 border-slate-700/30' }
              return (
                <div key={log.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                  {/* Icon badge */}
                  <div className={`mt-0.5 w-7 h-7 rounded-lg border flex items-center justify-center text-[12px] shrink-0 ${info.color}`}>
                    {info.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[12px] font-semibold text-slate-200">{info.label}</p>
                      {meta.ip && (
                        <span className="text-[9.5px] text-slate-600 font-mono bg-slate-800/60 px-1.5 py-0.5 rounded">
                          {meta.ip}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {meta.browser && (
                        <span className="text-[10.5px] text-slate-500">{meta.browser}{meta.os ? ` · ${meta.os}` : ''}</span>
                      )}
                      <span className="text-[10px] text-slate-700">{fmtDateTime(new Date(log.createdAt))}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-700 shrink-0 mt-0.5">{fmtRelative(new Date(log.createdAt))}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
