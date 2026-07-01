interface TopbarProps {
  title: string
  subtitle?: string
  breadcrumb?: string
  actions?: React.ReactNode
  lucroHoje?: number | null
}

export function Topbar({ title, subtitle, breadcrumb, actions, lucroHoje }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#080c12]/96 backdrop-blur-sm border-b border-slate-800/60 px-5 md:px-6 py-0">
      <div className="flex items-center gap-3 h-[52px]">

        {/* Title block */}
        <div className="min-w-0 shrink-0">
          {breadcrumb && (
            <p className="text-[12px] text-slate-600 mb-0.5 leading-none">{breadcrumb}</p>
          )}
          <h1 className="text-white font-bold text-[22px] tracking-tight leading-none">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 text-[14px] mt-0.5 leading-none truncate max-w-xs">{subtitle}</p>
          )}
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-[240px] hidden lg:block ml-3">
          <div className="relative flex items-center">
            <svg className="absolute left-2.5 w-3 h-3 text-slate-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              readOnly
              className="w-full pl-8 pr-14 py-1.5 bg-slate-800/40 border border-slate-700/40 text-slate-500 placeholder-slate-700 text-[13px] rounded-lg cursor-default focus:outline-none select-none"
            />
            <div className="absolute right-2 flex items-center gap-0.5 pointer-events-none">
              <kbd className="text-[10px] text-slate-700 bg-slate-800 px-1 py-0.5 rounded font-mono leading-none border border-slate-700/60">⌘</kbd>
              <kbd className="text-[10px] text-slate-700 bg-slate-800 px-1 py-0.5 rounded font-mono leading-none border border-slate-700/60">K</kbd>
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">

          {/* Theme toggle */}
          <button className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-800/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          {/* Notification bell */}
          <button className="relative w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
            <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-blue-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center px-0.5 ring-1 ring-[#080c12]">
              4
            </span>
          </button>

          {/* Lucro hoje widget */}
          {lucroHoje !== undefined && lucroHoje !== null && (
            <div className="hidden md:flex items-center gap-2.5 ml-1 pl-3 border-l border-slate-800/60">
              <div className="text-right leading-none">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Lucro Hoje</p>
                <p className={`text-[14px] font-bold tabular-nums mt-0.5 ${lucroHoje >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {lucroHoje >= 0 ? '+' : '−'}R$ {Math.abs(lucroHoje).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${lucroHoje >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {lucroHoje >= 0 ? '↑' : '↓'}
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
