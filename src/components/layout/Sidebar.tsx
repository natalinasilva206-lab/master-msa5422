'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface NavItem {
  label: string
  href: string
  soon?: boolean
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
}

interface SidebarProps {
  role: 'ADMIN' | 'CLIENT'
  userName: string
  badges?: Record<string, number>
}

function I({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg className="w-[16px] h-[16px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
  )
}

const adminGroups: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      {
        label: 'Painel',
        href: '/admin/dashboard',
        icon: <I d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      },
    ],
  },
  {
    label: 'Operações',
    items: [
      {
        label: 'Solicitações KYC',
        href: '/admin/kyc',
        icon: <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
      },
      {
        label: 'Empresas',
        href: '/admin/clientes',
        icon: <I d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        label: 'Transações',
        href: '/admin/transacoes',
        icon: <I d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
      },
      {
        label: 'Saques',
        href: '/admin/saques',
        icon: <I d="M5 10l7-7m0 0l7 7m-7-7v18" />,
      },
      {
        label: 'Antecipações',
        href: '/admin/antecipacoes',
        icon: <I d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
      },
      {
        label: 'CDI e Rendimentos',
        href: '/admin/cdi',
        icon: <I d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
      },
{
        label: 'Taxas e Planos',
        href: '/admin/taxas',
        icon: <I d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
      },
      {
        label: 'BAAS',
        href: '#',
        soon: true,
        icon: <I d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
      },
      {
        label: 'Adquirentes',
        href: '#',
        soon: true,
        icon: <I d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
      },
      {
        label: 'Disputas e MED',
        href: '/admin/disputas',
        icon: <I d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      },
    ],
  },
  {
    label: 'Relatórios',
    items: [
      {
        label: 'Faturamento',
        href: '/admin/faturamento',
        icon: <I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      },
      {
        label: 'Conciliação',
        href: '/admin/conciliacao',
        icon: <I d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
      },
      {
        label: 'Análise Geral',
        href: '/admin/analise',
        icon: <I d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      },
      {
        label: 'Reserva de Risco',
        href: '/admin/risco',
        icon: <I d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      },
      {
        label: 'Master Score',
        href: '/admin/master-score',
        icon: <I d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />,
      },
    ],
  },
  {
    label: 'Gestão',
    items: [
      {
        label: 'Usuários e Permissões',
        href: '/admin/usuarios',
        icon: <I d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      },
      {
        label: 'Integrações / API',
        href: '/admin/integracoes',
        icon: <I d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />,
      },
      {
        label: 'Antifraude',
        href: '/admin/antifraude',
        icon: <I d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      },
      {
        label: 'Central de Suporte',
        href: '/admin/suporte',
        icon: <I d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
      {
        label: 'Minha Conta',
        href: '/admin/minha-conta',
        icon: <I d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
      {
        label: 'Configurações',
        href: '/admin/configuracoes',
        icon: (
          <svg className="w-[16px] h-[16px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
]

const clientGroups: NavGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      {
        label: 'Dashboard',
        href: '/cliente/dashboard',
        icon: <I d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        label: 'Transações',
        href: '/cliente/transacoes',
        icon: <I d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
      },
      {
        label: 'Saques',
        href: '/cliente/saques',
        icon: <I d="M5 10l7-7m0 0l7 7m-7-7v18" />,
      },
      {
        label: 'CDI e Rendimentos',
        href: '/cliente/cdi',
        icon: <I d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
      },
      {
        label: 'Antecipações',
        href: '/cliente/antecipacoes',
        icon: <I d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
      {
        label: 'Extrato',
        href: '/cliente/extrato',
        icon: <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      },
      {
        label: 'Reservas de Risco',
        href: '/cliente/reservas',
        icon: <I d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      },
    ],
  },
  {
    label: 'Minha Conta',
    items: [
      {
        label: 'Minha Conta',
        href: '/cliente/minha-conta',
        icon: <I d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      },
      {
        label: 'Verificação KYC',
        href: '/cliente/kyc',
        icon: <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
      },
      {
        label: 'Meu Plano',
        href: '/cliente/plano',
        icon: <I d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
      },
      {
        label: 'Integrações / API',
        href: '/cliente/integracoes',
        icon: <I d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />,
      },
      {
        label: 'Suporte',
        href: '/cliente/suporte',
        icon: <I d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
    ],
  },
]

export function Sidebar({ role, userName, badges = {} }: SidebarProps) {
  const pathname = usePathname()
  const initial = userName.charAt(0).toUpperCase()
  const groups = role === 'ADMIN' ? adminGroups : clientGroups
  const roleLabel = role === 'ADMIN' ? 'Administração' : 'Área do Seller'

  const checkActive = (item: NavItem) =>
    !item.soon &&
    item.href !== '#' &&
    (pathname === item.href ||
      (item.href !== '/admin/dashboard' &&
        item.href !== '/cliente/dashboard' &&
        pathname.startsWith(item.href)))

  return (
    <aside className="w-[204px] h-full flex flex-col shrink-0 bg-[#0a0f18] border-r border-slate-800/50 overflow-y-auto">

      {/* Logo */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/50 shrink-0">
            <svg className="w-[15px] h-[15px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="leading-none min-w-0">
            <p className="text-white font-bold text-[14px] tracking-tight">MasterPag</p>
            <p className="text-slate-500 text-[11px] mt-0.5 truncate">{roleLabel}</p>
          </div>
        </div>
      </div>

      <div className="mx-3 h-px bg-slate-800/60 shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2.5">
        {groups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em] px-2 mb-1">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map((item) => {
                if (item.soon) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-slate-700 cursor-default select-none"
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </div>
                  )
                }
                const active = checkActive(item)
                const badge = badges[item.href]
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                      active
                        ? 'bg-blue-600/12 text-blue-400'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className={`shrink-0 ${active ? 'text-blue-400' : ''}`}>{item.icon}</span>
                    <span className="truncate flex-1">{item.label}</span>
                    {badge && badge > 0 ? (
                      <span className="ml-auto shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold px-1">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : active ? (
                      <span className="ml-auto w-0.5 h-3.5 rounded-full bg-blue-500 shrink-0" />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User area */}
      <div className="px-2 pb-3 mt-auto shrink-0">
        <div className="mb-2 h-px bg-slate-800/60" />

        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-slate-900/70 border border-slate-800/60 hover:border-slate-700/60 transition-colors cursor-default">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-violet-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-[12px] font-semibold leading-none truncate">{userName}</p>
            <p className="text-slate-600 text-[11px] mt-0.5 leading-none">
              {role === 'ADMIN' ? 'Administrador' : 'Seller'}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sair"
            className="shrink-0 p-1 rounded text-slate-700 hover:text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
