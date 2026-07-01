'use client'

import { useState, useTransition } from 'react'
import { createFaq, updateFaq, toggleFaq, deleteFaq } from './actions'

const FAQ_CATEGORIES = ['Geral', 'CDI e Rendimentos', 'Saques', 'Recebíveis', 'Conta', 'Integrações', 'Planos']

interface FaqItemData {
  id: string; question: string; answer: string
  category: string; isActive: boolean; order: number
}

// ── New FAQ form ──────────────────────────────────────────────────────────────

export function NewFaqForm() {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')
  const [a, setA]       = useState('')
  const [cat, setCat]   = useState('Geral')
  const [ord, setOrd]   = useState('0')
  const [err, setErr]   = useState('')
  const [ok,  setOk]    = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const r = await createFaq(q, a, cat, parseInt(ord) || 0)
      if (r.error) { setErr(r.error); return }
      setOk(true); setQ(''); setA(''); setCat('Geral'); setOrd('0')
      setTimeout(() => { setOk(false); setOpen(false) }, 1200)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11.5px] font-semibold px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nova pergunta
      </button>
    )
  }

  return (
    <div className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-5 space-y-3">
      <p className="text-[12.5px] font-semibold text-white">Nova pergunta</p>
      <FaqFields q={q} setQ={setQ} a={a} setA={setA} cat={cat} setCat={setCat} ord={ord} setOrd={setOrd} />
      {err && <p className="text-[11px] text-red-400">{err}</p>}
      {ok  && <p className="text-[11px] text-emerald-400">✓ Criada!</p>}
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={isPending} className="px-4 py-1.5 text-[11.5px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white">
          {isPending ? 'Salvando…' : 'Criar'}
        </button>
        <button onClick={() => setOpen(false)} className="text-[11.5px] text-slate-500 hover:text-slate-300 px-2">Cancelar</button>
      </div>
    </div>
  )
}

// ── Edit existing FAQ item ────────────────────────────────────────────────────

export function FaqItemRow({ item }: { item: FaqItemData }) {
  const [editing, setEditing] = useState(false)
  const [q, setQ]             = useState(item.question)
  const [a, setA]             = useState(item.answer)
  const [cat, setCat]         = useState(item.category)
  const [ord, setOrd]         = useState(String(item.order))
  const [err, setErr]         = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const r = await updateFaq(item.id, q, a, cat, parseInt(ord) || 0)
      if (r.error) { setErr(r.error); return }
      setEditing(false)
    })
  }

  function handleToggle() {
    startTransition(async () => { await toggleFaq(item.id, !item.isActive) })
  }

  function handleDelete() {
    if (!confirm('Excluir esta pergunta?')) return
    startTransition(async () => { await deleteFaq(item.id) })
  }

  return (
    <div className={`px-5 py-4 border-b border-slate-800/40 last:border-0 ${!item.isActive ? 'opacity-50' : ''}`}>
      {!editing ? (
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] text-slate-600 font-mono">#{item.order}</span>
                <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded">{item.category}</span>
                {!item.isActive && <span className="text-[9px] text-slate-600">desativado</span>}
              </div>
              <p className="text-[12.5px] font-semibold text-slate-200">{item.question}</p>
              <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.answer}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={handleToggle} disabled={isPending}
                className={`text-[9.5px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                  item.isActive
                    ? 'text-slate-400 border-slate-700/40 hover:text-amber-400 hover:border-amber-500/30'
                    : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                }`}
              >
                {item.isActive ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => setEditing(true)}
                className="text-[9.5px] font-semibold px-2 py-1 rounded-lg border border-slate-700/40 text-slate-400 hover:text-white hover:border-blue-500/30 transition-colors"
              >
                Editar
              </button>
              <button onClick={handleDelete} disabled={isPending}
                className="text-[9.5px] font-semibold px-2 py-1 rounded-lg border border-slate-700/40 text-slate-600 hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <FaqFields q={q} setQ={setQ} a={a} setA={setA} cat={cat} setCat={setCat} ord={ord} setOrd={setOrd} />
          {err && <p className="text-[11px] text-red-400">{err}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isPending}
              className="px-4 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white"
            >
              {isPending ? 'Salvando…' : 'Salvar'}
            </button>
            <button onClick={() => setEditing(false)} className="text-[11px] text-slate-500 hover:text-slate-300 px-2">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared field set ──────────────────────────────────────────────────────────

function FaqFields({ q, setQ, a, setA, cat, setCat, ord, setOrd }: {
  q: string; setQ: (v: string) => void
  a: string; setA: (v: string) => void
  cat: string; setCat: (v: string) => void
  ord: string; setOrd: (v: string) => void
}) {
  const inp = 'w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50'
  const lbl = 'block text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-1'

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1fr_auto_80px] gap-2">
        <div>
          <label className={lbl}>Categoria</label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inp}>
            {FAQ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Ordem</label>
          <input type="number" value={ord} onChange={(e) => setOrd(e.target.value)} min={0} className={`${inp} w-16`} />
        </div>
      </div>
      <div>
        <label className={lbl}>Pergunta</label>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Como…?" className={inp} />
      </div>
      <div>
        <label className={lbl}>Resposta</label>
        <textarea value={a} onChange={(e) => setA(e.target.value)} rows={3} placeholder="Resposta completa…" className={`${inp} resize-none`} />
      </div>
    </div>
  )
}
