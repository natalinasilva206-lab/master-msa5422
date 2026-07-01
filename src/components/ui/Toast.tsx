'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Variant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  variant: Variant
}

interface ToastCtx {
  toast: (message: string, variant?: Variant) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

const STYLE: Record<Variant, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error:   'border-red-500/30 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  info:    'border-blue-500/30 bg-blue-500/10 text-blue-300',
}

const ICON: Record<Variant, string> = {
  success: 'M5 13l4 4L19 7',
  error:   'M6 18L18 6M6 6l12 12',
  warning: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

function ToastItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(t.id), 4000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [t.id, onRemove])

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm
        bg-[#0d1420]/95 min-w-[260px] max-w-[340px] animate-toast-in ${STYLE[t.variant]}`}
    >
      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={ICON[t.variant]} />
      </svg>
      <p className="text-[13px] font-medium leading-snug flex-1">{t.message}</p>
      <button
        onClick={() => onRemove(t.id)}
        className="shrink-0 text-current opacity-40 hover:opacity-70 transition-opacity mt-0.5"
        aria-label="Fechar"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, variant: Variant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => {
      const next = [...prev, { id, message, variant }]
      return next.slice(-3)
    })
  }, [])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}
