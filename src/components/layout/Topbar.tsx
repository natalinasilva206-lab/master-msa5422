interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="bg-slate-950 border-b border-slate-800/60 px-8 py-5">
      <div className="flex items-center justify-between gap-6 min-h-[2.5rem]">
        <div>
          <h1 className="text-white font-bold text-xl tracking-tight leading-none">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 text-sm mt-1.5 leading-none">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
