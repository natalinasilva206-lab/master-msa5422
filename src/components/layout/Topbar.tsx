import { NotificationBell } from './NotificationBell'

interface TopbarProps {
  title: string
  subtitle?: string
  breadcrumb?: string
  actions?: React.ReactNode
  lucroHoje?: number | null
  showNotifications?: boolean
}

export function Topbar({ title, subtitle, breadcrumb, actions, lucroHoje, showNotifications }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#080c12]/96 backdrop-blur-sm border-b border-slate-800/60 px-5 md:px-6 py-0">
      <div className="flex items-center gap-3 h-[48px]">

        {/* Title block */}
        <div className="min-w-0 shrink-0">
          {breadcrumb && (
            <p className="text-[10px] text-slate-600 leading-none mb-0.5 truncate">{breadcrumb}</p>
          )}
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-white font-semibold text-[16px] tracking-tight leading-none whitespace-nowrap">{title}</h1>
            {subtitle && (
              <p className="text-slate-500 text-[12px] leading-none truncate max-w-[260px] hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-[200px] hidden lg:block ml-2">
          <div className="relative flex items-center">
            <svg className="absolute left-2.5 w-3 h-3 text-slate-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              readOnly
              className="w-full pl-8 pr-12 py-1.5 bg-slate-800/40 border border-slate-700/40 text-slate-500 placeholder-slate-700 text-[12px] rounded-md cursor-default focus:outline-none select-none"
            />
            <div className="absolute right-2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="text-[9px] text-slate-700 bg-slate-800/80 px-1 py-0.5 rounded font-mono leading-none border border-slate-700/50">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 ml-auto shrink-0">

          {/* Theme toggle */}
          <button className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          {/* Notification bell */}
          {showNotifications ? (
            <NotificationBell />
          ) : (
            <button className="relative w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          )}

          {/* Lucro hoje widget */}
          {lucroHoje !== undefined && lucroHoje !== null && (
            <div className="hidden md:flex items-center gap-2 ml-1 pl-3 border-l border-slate-800/60">
              <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${lucroHoje >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {lucroHoje >= 0 ? '↑' : '↓'}
              </div>
              <div className="leading-none">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Lucro hoje</p>
                <p className={`text-[12px] font-semibold tabular-nums mt-0.5 ${lucroHoje >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lucroHoje >= 0 ? '+' : '−'}R$ {Math.abs(lucroHoje).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Actions slot */}
          {actions && (
            <div className="flex items-center gap-2 pl-1">
              {actions}
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
