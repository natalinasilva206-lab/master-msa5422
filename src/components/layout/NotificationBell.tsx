'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Notif = {
  id: string
  type: string
  title: string
  body: string
  metadata: string | null
  read: boolean
  createdAt: string
}

const TYPE_ICON: Record<string, string> = {
  CDI_CREDIT: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
}

const TYPE_COLOR: Record<string, string> = {
  CDI_CREDIT: 'text-emerald-400 bg-emerald-500/10',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  return `${d}d atrás`
}

export function NotificationBell() {
  const [open, setOpen]       = useState(false)
  const [notifs, setNotifs]   = useState<Notif[]>([])
  const [unread, setUnread]   = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cliente/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifs(data.notifications ?? [])
      setUnread(data.unreadCount ?? 0)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  async function markRead(id?: string) {
    await fetch('/api/cliente/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { id } : {}),
    })
    setNotifs((prev) => prev.map((n) => id ? (n.id === id ? { ...n, read: true } : n) : { ...n, read: true }))
    setUnread(id ? Math.max(0, unread - 1) : 0)
  }

  function handleOpen() {
    setOpen((v) => !v)
    if (!open) fetchNotifs()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40"
        title="Notificações"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-1 ring-[#080c12]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d1420] border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-white">Notificações</p>
              {unread > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/25 rounded-full">
                  {unread} nova{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={() => markRead()}
                className="text-[10.5px] text-slate-500 hover:text-blue-400 transition-colors"
              >
                Marcar tudo como lido
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/40">
            {loading && notifs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <svg className="w-4 h-4 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <svg className="w-8 h-8 text-slate-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-[12px] text-slate-600 font-medium">Nenhuma notificação</p>
              </div>
            ) : (
              notifs.map((n) => {
                const iconPath = TYPE_ICON[n.type] ?? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                const iconColor = TYPE_COLOR[n.type] ?? 'text-blue-400 bg-blue-500/10'
                let extra: string | null = null
                try {
                  const m = JSON.parse(n.metadata ?? '{}')
                  if (m.newBalance != null) {
                    extra = `Novo saldo CDI: R$ ${parseFloat(m.newBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  }
                } catch {}
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 hover:bg-slate-800/30 transition-colors cursor-pointer ${!n.read ? 'bg-blue-500/3' : ''}`}
                    onClick={() => { if (!n.read) markRead(n.id) }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-[12px] font-semibold leading-none ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                          {!n.read && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{n.body}</p>
                        {extra && (
                          <p className="text-[10.5px] text-emerald-500 mt-0.5 font-medium">{extra}</p>
                        )}
                        <p className="text-[10px] text-slate-700 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
