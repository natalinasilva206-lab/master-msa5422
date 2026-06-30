interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#080c12]/95 backdrop-blur-sm border-b border-slate-800/60 px-5 md:px-8 py-3.5">
      <div className="flex items-center gap-4 min-h-[2.25rem]">

        {/* Title */}
        <div className="min-w-0 shrink-0">
          <h1 className="text-white font-bold text-[17px] tracking-tight leading-none">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 text-[11.5px] mt-1 leading-none truncate max-w-xs">{subtitle}</p>
          )}
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-[260px] hidden lg:block ml-2">
          <div className="relative flex items-center">
            <svg className="absolute left-3 w-3.5 h-3.5 text-slate-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              readOnly
              className="w-full pl-9 pr-14 py-1.5 bg-slate-800/50 border border-slate-700/50 text-slate-500 placeholder-slate-600 text-[12.5px] rounded-lg cursor-default focus:outline-none select-none"
            />
            <div className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none">
              <kbd className="text-[9px] text-slate-600 bg-slate-700/60 px-1.5 py-0.5 rounded font-mono leading-none">⌘</kbd>
              <kbd className="text-[9px] text-slate-600 bg-slate-700/60 px-1.5 py-0.5 rounded font-mono leading-none">K</kbd>
            </div>
          </div>
        </div>

        {/* Right: bell + actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button className="relative w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
            <svg className="w-[17px] h-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-1 ring-[#080c12]" />
          </button>

          {actions && (
            <div className="hidden sm:flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
