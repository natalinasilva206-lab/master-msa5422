type AccentKey = 'blue' | 'green' | 'amber' | 'red' | 'purple'

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  trend?: { value: string; positive: boolean }
  icon: React.ReactNode
  accent?: string
}

const accentConfig: Record<AccentKey, { icon: string; dot: string }> = {
  blue:   { icon: 'bg-blue-500/10 text-blue-400',     dot: 'bg-blue-400' },
  green:  { icon: 'bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  amber:  { icon: 'bg-amber-500/10 text-amber-400',   dot: 'bg-amber-400' },
  red:    { icon: 'bg-red-500/10 text-red-400',       dot: 'bg-red-400' },
  purple: { icon: 'bg-purple-500/10 text-purple-400', dot: 'bg-purple-400' },
}

export function StatCard({ title, value, subtitle, trend, icon, accent = 'blue' }: StatCardProps) {
  const cfg = accentConfig[accent as AccentKey] ?? accentConfig.blue

  return (
    <div className="relative bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-800/40 hover:border-slate-700/70 transition-all duration-200 overflow-hidden">
      <div className={`absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.icon}`}>
        {icon}
      </div>
      <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-3 pr-12">{title}</p>
      <p className="text-[28px] font-bold text-white leading-none tabular-nums">{value}</p>
      {subtitle && <p className="text-[11px] text-slate-600 mt-2">{subtitle}</p>}
      {trend && (
        <div className={`inline-flex items-center gap-1 mt-3 text-[11px] font-semibold ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  )
}
