'use client'

import { useState } from 'react'

export function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left px-5 py-3.5 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          {title}
          {badge}
        </div>
        <svg
          className={`w-4 h-4 text-slate-600 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-slate-800/40 px-5 py-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}
