interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#080c12]/95 backdrop-blur-sm border-b border-slate-800/60 px-5 md:px-8 py-4 md:py-5">
      <div className="flex items-center justify-between gap-6 min-h-[2.5rem]">
        <div>
          <h1 className="text-white font-bold text-lg md:text-xl tracking-tight leading-none">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 text-[12px] md:text-sm mt-1.5 leading-none">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
