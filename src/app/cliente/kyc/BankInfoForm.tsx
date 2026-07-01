'use client'

import { useState, useTransition } from 'react'
import { saveBankInfo } from './actions'

const PIX_TYPES = [
  { value: 'CPF', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { value: 'EMAIL', label: 'E-mail', placeholder: 'contato@empresa.com' },
  { value: 'PHONE', label: 'Telefone', placeholder: '+55 11 99999-9999' },
  { value: 'RANDOM', label: 'Chave aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
]

interface Props {
  currentPixKey: string | null
  currentPixKeyType: string | null
  currentBankName: string | null
  disabled?: boolean
}

export function BankInfoForm({ currentPixKey, currentPixKeyType, currentBankName, disabled }: Props) {
  const [editing, setEditing] = useState(!currentPixKey)
  const [pixKey, setPixKey] = useState(currentPixKey ?? '')
  const [pixKeyType, setPixKeyType] = useState(currentPixKeyType ?? 'CPF')
  const [bankName, setBankName] = useState(currentBankName ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, startSave] = useTransition()

  const selectedType = PIX_TYPES.find((t) => t.value === pixKeyType) ?? PIX_TYPES[0]

  function handleSave() {
    if (!pixKey.trim()) { setError('Informe a chave PIX.'); return }
    setError('')
    startSave(async () => {
      const r = await saveBankInfo(pixKey.trim(), pixKeyType, bankName.trim())
      if (r.error) { setError(r.error); return }
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  if (!editing && currentPixKey) {
    return (
      <div className="bg-slate-800/40 border border-emerald-500/20 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-slate-200">
                {PIX_TYPES.find((t) => t.value === currentPixKeyType)?.label ?? currentPixKeyType} · {currentPixKey}
              </p>
              {currentBankName && <p className="text-[10.5px] text-slate-500">{currentBankName}</p>}
            </div>
          </div>
          {!disabled && (
            <button
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 bg-slate-700/60 border border-slate-600/40 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
            >
              Editar
            </button>
          )}
        </div>
        {saved && <p className="text-[10.5px] text-emerald-400 mt-2">Salvo com sucesso!</p>}
      </div>
    )
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
      <p className="text-[10.5px] text-slate-500">
        Informe a chave PIX principal da empresa. Será usada para recebimento de saques aprovados.
      </p>

      {/* PIX Key Type */}
      <div className="flex gap-1 flex-wrap">
        {PIX_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => { setPixKeyType(t.value); setPixKey('') }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              pixKeyType === t.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/60 text-slate-500 hover:text-slate-300 border border-slate-600/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PIX Key input */}
      <div>
        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
          Chave PIX ({selectedType.label})
        </label>
        <input
          type="text"
          value={pixKey}
          onChange={(e) => { setPixKey(e.target.value); setError('') }}
          placeholder={selectedType.placeholder}
          className="w-full bg-slate-900/80 border border-slate-600/60 text-slate-200 text-[13px] font-mono rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder-slate-700 transition"
        />
      </div>

      {/* Bank name */}
      <div>
        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
          Nome do banco (opcional)
        </label>
        <input
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="Ex: Nubank, Itaú, Bradesco..."
          className="w-full bg-slate-900/80 border border-slate-600/60 text-slate-200 text-[13px] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder-slate-700 transition"
        />
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        {currentPixKey && (
          <button
            onClick={() => { setEditing(false); setPixKey(currentPixKey); setPixKeyType(currentPixKeyType ?? 'CPF'); setBankName(currentBankName ?? '') }}
            className="flex-1 py-2 text-[12px] font-semibold text-slate-400 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/40 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar dados bancários'}
        </button>
      </div>
    </div>
  )
}
