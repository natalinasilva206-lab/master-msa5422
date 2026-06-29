interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
