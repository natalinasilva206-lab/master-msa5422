'use client'

import { useState, useTransition } from 'react'
import { updateProfile, changePassword } from './actions'

type User = { id: string; name: string; email: string; phone: string | null }

const TABS = ['Meu Perfil', 'Alterar Senha', 'Tema', 'Segurança'] as const
type Tab = typeof TABS[number]

export function MinhaContaTabs({ user }: { user: User }) {
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
      {activeTab === 'Tema'          && <TemaTab />}
      {activeTab === 'Segurança'     && <SegurancaTab user={user} />}
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
function PasswordTab() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMessage(null)
    startTransition(async () => {
      const res = await changePassword(fd)
      if (res?.error) setMessage({ type: 'error', text: res.error })
      else {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  const fields = [
    { name: 'currentPassword', label: 'Senha atual',          placeholder: '••••••••' },
    { name: 'newPassword',     label: 'Nova senha',           placeholder: 'Mínimo 8 caracteres' },
    { name: 'confirmPassword', label: 'Confirmar nova senha', placeholder: '••••••••' },
  ]

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-white">Alterar Senha</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Use uma senha forte com ao menos 8 caracteres</p>
      </div>
      <div className="border-t border-slate-800/50" />
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              {f.label}
            </label>
            <input
              type="password"
              name={f.name}
              required
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
              placeholder={f.placeholder}
            />
          </div>
        ))}

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
            ) : 'Alterar Senha'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ─── Tema ─── */
function TemaTab() {
  const [selected, setSelected] = useState<'dark' | 'darker'>('dark')

  const themes = [
    { id: 'dark'   as const, label: 'Dark',        desc: 'Tema padrão',         bg: 'bg-slate-900',   accent: 'bg-blue-600' },
    { id: 'darker' as const, label: 'Dark Profundo', desc: 'Preto intenso',     bg: 'bg-[#080c12]',   accent: 'bg-violet-600' },
  ]

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-white">Tema da Interface</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Escolha a aparência do painel administrativo</p>
      </div>
      <div className="border-t border-slate-800/50" />
      <div className="grid grid-cols-2 gap-3">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`relative rounded-xl p-4 border-2 text-left transition-all ${
              selected === t.id
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-800/60 hover:border-slate-700'
            }`}
          >
            {selected === t.id && (
              <div className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {/* Mini preview */}
            <div className={`w-full h-12 rounded-lg ${t.bg} border border-slate-700/30 mb-3 flex items-center gap-1.5 px-2`}>
              <div className="w-1.5 h-7 bg-slate-800 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className={`h-1.5 w-8 ${t.accent} rounded`} />
                <div className="h-1 w-12 bg-slate-700 rounded" />
              </div>
            </div>
            <p className="text-[12.5px] font-semibold text-slate-200">{t.label}</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>
      <div className="pt-1">
        <button
          onClick={() => {}}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          Aplicar Tema
        </button>
      </div>
    </div>
  )
}

/* ─── Segurança ─── */
function SegurancaTab({ user }: { user: User }) {
  const items = [
    {
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      label: 'Autenticação de dois fatores',
      desc: 'Adicione uma camada extra de segurança',
      badge: { text: 'Em breve', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    },
    {
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      label: 'Sessão atual',
      desc: `Logado como ${user.email}`,
      badge: { text: 'Ativa', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    },
    {
      icon: (
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      label: 'Logs de acesso',
      desc: 'Consulte o histórico de atividades no painel de auditoria',
      badge: null,
      link: '/admin/usuarios',
    },
  ]

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-6 max-w-2xl space-y-5">
      <div>
        <p className="text-[14px] font-semibold text-white">Segurança da Conta</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Gerencie o acesso e a segurança da sua conta</p>
      </div>
      <div className="border-t border-slate-800/50" />
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/30 border border-slate-800/40 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-slate-200">{item.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
            </div>
            {item.badge && (
              <span className={`text-[9.5px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${item.badge.color}`}>
                {item.badge.text}
              </span>
            )}
            {item.link && (
              <a href={item.link} className="text-[11px] text-blue-400 hover:underline shrink-0">Ver →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
