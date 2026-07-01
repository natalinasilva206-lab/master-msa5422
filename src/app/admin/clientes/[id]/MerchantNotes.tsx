'use client'

import { useState, useTransition } from 'react'
import { saveMerchantNotes } from '../actions'

interface Props {
  merchantId: string
  initialNotes: string
}

export function MerchantNotes({ merchantId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [saved, setSaved] = useState(false)
  const [saving, startSave] = useTransition()

  function handleSave() {
    startSave(async () => {
      await saveMerchantNotes(merchantId, notes)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setSaved(false) }}
        rows={3}
        placeholder="Adicione uma anotação ou observação interna sobre esta empresa..."
        className="w-full bg-slate-900/80 border border-slate-700/50 text-slate-200 text-[13px] rounded-lg px-4 py-3 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none transition"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {saved && <p className="text-[11.5px] text-emerald-400">Anotação salva.</p>}
      </div>
    </div>
  )
}
