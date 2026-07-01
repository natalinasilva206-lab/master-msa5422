'use client'

import { useState } from 'react'

interface FaqItemData {
  id:       string
  question: string
  answer:   string
  category: string
}

interface Props { items: FaqItemData[] }

export function FaqSearch({ items }: Props) {
  const [q,    setQ]    = useState('')
  const [cat,  setCat]  = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const categories = Array.from(new Set(items.map((i) => i.category))).sort()

  const filtered = items.filter((item) => {
    const matchesCat = !cat || item.category === cat
    const matchesQ   = !q   || item.question.toLowerCase().includes(q.toLowerCase()) ||
                               item.answer.toLowerCase().includes(q.toLowerCase())
    return matchesCat && matchesQ
  })

  const grouped = categories.reduce<Record<string, FaqItemData[]>>((acc, c) => {
    const inCat = filtered.filter((i) => i.category === c)
    if (inCat.length > 0) acc[c] = inCat
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
          </svg>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nas perguntas…"
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-xl pl-9 pr-3 py-2.5 text-[12px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-3 py-2.5 text-[12px] text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-700">
          <p className="text-[13px] font-medium">Nenhum resultado encontrado</p>
          <p className="text-[11px] mt-1">Tente palavras diferentes ou abra um chamado</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, faqs]) => (
          <div key={category}>
            <p className="text-[10.5px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-1">{category}</p>
            <div className="space-y-1">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpen(open === faq.id ? null : faq.id)}
                    className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <p className="text-[12.5px] font-semibold text-slate-200">{faq.question}</p>
                    <svg
                      className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${open === faq.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open === faq.id && (
                    <div className="px-4 pb-4 border-t border-slate-800/40 pt-3">
                      <p className="text-[12px] text-slate-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
