'use client'

import { useState, useTransition } from 'react'
import { submitKycDocument, removeKycDocument, type KycDoc } from './actions'

const DOC_TYPES = [
  { type: 'IDENTITY', label: 'Documento de Identidade', desc: 'RG ou CNH (frente e verso)', required: true, icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2' },
  { type: 'COMPANY', label: 'Documentação da Empresa', desc: 'Contrato Social, MEI ou Cartão CNPJ', required: true, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { type: 'ADDRESS', label: 'Comprovante de Endereço', desc: 'Conta de luz, água ou aluguel (últimos 3 meses)', required: true, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { type: 'SELFIE', label: 'Selfie com Documento', desc: 'Foto segurando RG/CNH ao lado do rosto', required: true, icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
  { type: 'BANK', label: 'Comprovante Bancário', desc: 'Extrato ou confirmação de chave PIX', required: false, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
]

interface Props {
  existingDocs: KycDoc[]
  disabled?: boolean
}

export function SubmitDocForm({ existingDocs, disabled }: Props) {
  const [openType, setOpenType] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [submitting, startSubmit] = useTransition()
  const [removing, startRemove] = useTransition()
  const [success, setSuccess] = useState<string | null>(null)

  const docMap = new Map(existingDocs.map((d) => [d.type, d]))

  function open(type: string) {
    setOpenType(type)
    setUrl('')
    setError('')
    setSuccess(null)
  }

  function handleSubmit(type: string, label: string) {
    if (!url.trim()) { setError('Informe o link do documento.'); return }
    setError('')
    startSubmit(async () => {
      const r = await submitKycDocument(type, label, url.trim())
      if (r.error) { setError(r.error); return }
      setSuccess(type)
      setOpenType(null)
      setUrl('')
    })
  }

  function handleRemove(type: string) {
    startRemove(async () => {
      await removeKycDocument(type)
    })
  }

  return (
    <div className="space-y-2">
      {DOC_TYPES.map((dt) => {
        const submitted = docMap.get(dt.type)
        const isOpen = openType === dt.type
        const justSaved = success === dt.type

        return (
          <div
            key={dt.type}
            className={`border rounded-xl overflow-hidden transition-colors ${
              submitted ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/40 border-slate-700/40'
            }`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${submitted ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/60 text-slate-500'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={dt.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-slate-200">{dt.label}</p>
                  {dt.required && <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">Obrigatório</span>}
                  {!dt.required && <span className="text-[9px] font-bold text-slate-600 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded-full">Opcional</span>}
                </div>
                <p className="text-[10.5px] text-slate-600 mt-0.5">{dt.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {submitted ? (
                  <>
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Enviado
                    </span>
                    {!disabled && (
                      <button
                        onClick={() => handleRemove(dt.type)}
                        disabled={removing}
                        className="text-[10px] text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        Remover
                      </button>
                    )}
                    {!disabled && (
                      <button
                        onClick={() => open(dt.type)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 bg-slate-700/60 border border-slate-600/40 px-2 py-1 rounded-md transition-colors"
                      >
                        Substituir
                      </button>
                    )}
                  </>
                ) : (
                  !disabled && (
                    <button
                      onClick={() => isOpen ? setOpenType(null) : open(dt.type)}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isOpen ? 'Cancelar' : '+ Enviar'}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Submitted URL preview */}
            {submitted && (
              <div className="px-4 pb-3">
                <a
                  href={submitted.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10.5px] font-mono text-blue-400/70 hover:text-blue-300 truncate block max-w-full transition-colors"
                >
                  {submitted.url}
                </a>
              </div>
            )}

            {/* URL input form */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-700/30 bg-slate-900/40 space-y-2">
                <p className="text-[10px] text-slate-500 mt-2">
                  Envie o link do Google Drive, Dropbox ou qualquer URL pública do documento.
                </p>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError('') }}
                    placeholder="https://drive.google.com/file/..."
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(dt.type, dt.label) }}
                    className="flex-1 bg-slate-800/80 border border-slate-600/60 text-slate-200 text-[12px] font-mono rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 placeholder-slate-700 transition"
                  />
                  <button
                    onClick={() => handleSubmit(dt.type, dt.label)}
                    disabled={submitting}
                    className="shrink-0 px-3 py-2 text-[11.5px] font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition-colors"
                  >
                    {submitting ? '...' : 'Salvar'}
                  </button>
                </div>
                {error && <p className="text-[10.5px] text-red-400">{error}</p>}
                {justSaved && <p className="text-[10.5px] text-emerald-400">Documento salvo com sucesso!</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
