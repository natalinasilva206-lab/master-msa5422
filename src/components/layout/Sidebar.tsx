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
}

function I({ d }: { d: string }) {
  return (
    <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const adminGroups: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      {
        label: 'Dashboard',
        href: '/admin/dashboard',
        icon: <I d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      },
    ],
  },
  {
    label: 'Operação',
    items: [
      {
        label: 'Clientes',
        href: '/admin/clientes',
        icon: <I d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
      },
      {
        label: 'Transações',
        href: '#',
        soon: true,
        icon: <I d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
      },
      {
        label: 'Métodos de Pagamento',
        href: '#',
        soon: true,
        icon: <I d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
      },
      {
        label: 'Reembolsos',
        href: '#',
        soon: true,
        icon: <I d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />,
      },
      {
        label: 'Saques',
        href: '#',
        soon: true,
        icon: <I d="M5 10l7-7m0 0l7 7m-7-7v18" />,
      },
      {
        label: 'Chargebacks',
        href: '#',
        soon: true,
        icon: <I d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />,
      },
    ],
  },
  {
    label: 'Infoprodutos',
    items: [
      {
        label: 'Produtos',
        href: '#',
        soon: true,
        icon: <I d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      },
      {
        label: 'Ofertas',
        href: '#',
        soon: true,
        icon: <I d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />,
      },
      {
        label: 'Checkout',
        href: '#',
        soon: true,
        icon: <I d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
      },
      {
        label: 'Afiliados',
        href: '#',
        soon: true,
        icon: <I d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
      },
      {
        label: 'Assinaturas',
        href: '#',
        soon: true,
        icon: <I d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        label: 'Taxas e Planos',
        href: '/admin/taxas',
        icon: <I d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />,
      },
      {
        label: 'CDI e Rendimentos',
        href: '/admin/cdi',
        icon: <I d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
      },
      {
        label: 'Split de Pagamentos',
        href: '#',
        soon: true,
        icon: <I d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />,
      },
      {
        label: 'Antecipação de Recebíveis',
        href: '#',
        soon: true,
        icon: <I d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
      },
      {
        label: 'Conciliação',
        href: '#',
        soon: true,
        icon: <I d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />,
      },
      {
        label: 'Saldo e Cofres',
        href: '#',
        soon: true,
        icon: <I d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
      },
      {
        label: 'Relatórios',
        href: '#',
        soon: true,
        icon: <I d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      },
    ],
  },
  {
    label: 'Segurança',
    items: [
      {
        label: 'Antifraude',
        href: '#',
        soon: true,
        icon: <I d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
      },
      {
        label: 'Segurança',
        href: '#',
        soon: true,
        icon: <I d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
      },
      {
        label: 'Compliance / KYC',
        href: '#',
        soon: true,
        icon: <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
      },
      {
        label: 'Logs de Auditoria',
        href: '#',
        soon: true,
        icon: <I d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
      },
    ],
  },
  {
    label: 'Plataforma',
    items: [
      {
        label: 'Usuários e Permissões',
        href: '#',
        soon: true,
        icon: <I d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      },
      {
        label: 'Integrações / API',
        href: '#',
        soon: true,
        icon: <I d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />,
      },
      {
        label: 'Webhooks',
        href: '#',
        soon: true,
        icon: <I d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
      },
      {
        label: 'Configurações',
        href: '#',
        soon: true,
        icon: (
          <svg className="w-[17px] h-[17px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: 'Suporte',
        href: '#',
        soon: true,
        icon: <I d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      },
    ],
  },
]

const clientGroups: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      {
        label: 'Dashboard',
        href: '/cliente/dashboard',
        icon: <I d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      },
    ],
  },
]

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const initial = userName.charAt(0).toUpperCase()
  const groups = role === 'ADMIN' ? adminGroups : clientGroups

  const checkActive = (item: NavItem) =>
    !item.soon &&
    item.href !== '#' &&
    (pathname === item.href ||
      (item.href !== '/admin/dashboard' &&
        item.href !== '/cliente/dashboard' &&
        pathname.startsWith(item.href)))

  return (
    <aside className="w-[240px] h-full flex flex-col shrink-0 bg-slate-950 border-r border-slate-800/50 overflow-y-auto">

      {/* Logo */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/40 shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="leading-none">
            <p className="text-white font-bold text-sm tracking-tight">Master</p>
            <p className="text-blue-400 text-[11px] font-medium tracking-wide mt-0.5">Pagamentos</p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-800/60 shrink-0" />

      {/* Navigation groups */}
      <nav className="flex-1 px-3 py-3">
        {groups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            <p className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-[0.12em] px-3 mb-1">
              {group.label}
            </p>
            <div className="space-y-px">
              {group.items.map((item) => {
                if (item.soon) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12.5px] text-slate-700 cursor-default select-none"
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </div>
                  )
                }
                const active = checkActive(item)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                      active
                        ? 'bg-blue-600/15 text-blue-400'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className={active ? 'text-blue-400' : ''}>{item.icon}</span>
                    <span className="truncate flex-1">{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User area */}
      <div className="px-3 pb-4 mt-2 shrink-0">
        <div className="mb-3 h-px bg-slate-800/60" />

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-[13px] font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-[13px] font-medium leading-none truncate">{userName}</p>
            <p className="text-slate-500 text-[11px] mt-1 leading-none">
              {role === 'ADMIN' ? 'Administrador' : 'Cliente'}
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2.5 px-3 py-2 mt-1.5 rounded-lg text-[12.5px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair da conta
        </button>
      </div>
    </aside>
  )
}
