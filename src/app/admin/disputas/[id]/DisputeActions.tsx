'use client'

import { useTransition, useState } from 'react'
import {
  updateDisputeStatus,
  blockForDispute,
  useReserveForDispute,
  releaseBlockedForDispute,
  addDisputeNote,
  addDisputeDocument,
  updateDisputeFields,
  DisputeStatus,
} from '../actions'
import { STATUS_LABEL, ALL_STATUSES } from '../constants'

interface Props {
  disputeId:      string
  merchantId:     string
  currentStatus:  string
  blockedAmount:  number
  pendingBalance: number
  reservedBalance:number
  currentNotes:   string | null
  assignedTo:     string | null
  deadline:       string | null
  saleLogId:      string | null
}

export default function DisputeActions({
  disputeId, merchantId, currentStatus, blockedAmount,
  pendingBalance, reservedBalance, currentNotes,
  assignedTo, deadline, saleLogId,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null)

  const [tab, setTab] = useState<'status'|'saldo'|'nota'|'doc'|'meta'>('status')
  const [newStatus, setNewStatus]   = useState<DisputeStatus>(currentStatus as DisputeStatus)
  const [statusNote, setStatusNote] = useState('')
  const [blockAmt, setBlockAmt]     = useState('')
  const [reserveAmt, setReserveAmt] = useState('')
  const [releaseAmt, setReleaseAmt] = useState('')
  const [note, setNote]             = useState('')
  const [docName, setDocName]       = useState('')
  const [metaAssigned, setMetaAssigned] = useState(assignedTo ?? '')
  const [metaDeadline, setMetaDeadline] = useState(deadline ?? '')
  const [metaSaleLog,  setMetaSaleLog]  = useState(saleLogId ?? '')

  function go(fn: () => Promise<{ error?: string; ok?: boolean }>) {
    setMsg(null)
    startTransition(async () => {
      const res = await fn()
      if (res.error) setMsg({ text: res.error })
      else setMsg({ ok: true, text: 'Operação realizada com sucesso.' })
    })
  }

  const tabs = [
    { id: 'status', label: 'Status' },
    { id: 'saldo',  label: 'Saldo' },
    { id: 'nota',   label: 'Observação' },
    { id: 'doc',    label: 'Documento' },
    { id: 'meta',   label: 'Dados' },
  ] as const

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMsg(null) }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Status ── */}
      {tab === 'status' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Novo status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as DisputeStatus)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Observação (opcional)</label>
            <textarea
              rows={2}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Justificativa da mudança de status..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
          <button
            disabled={isPending || newStatus === currentStatus}
            onClick={() => go(() => updateDisputeStatus(disputeId, newStatus, statusNote || undefined))}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isPending ? 'Salvando...' : 'Atualizar status'}
          </button>
        </div>
      )}

      {/* ── Saldo ── */}
      {tab === 'saldo' && (
        <div className="space-y-5">
          {/* Bloquear saldo disponível */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Bloquear saldo disponível → bloqueado
              <span className="ml-2 text-slate-500 font-normal">disponível: R$ {pendingBalance.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="number" min="0.01" step="0.01"
                value={blockAmt}
                onChange={(e) => setBlockAmt(e.target.value)}
                placeholder="0,00"
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
              />
              <button
                disabled={isPending || !blockAmt}
                onClick={() => go(() => blockForDispute(disputeId, parseFloat(blockAmt) || 0))}
                className="bg-red-700/60 hover:bg-red-700 disabled:opacity-50 text-red-300 text-sm font-medium px-4 py-2 rounded-lg border border-red-600/40 transition-colors whitespace-nowrap"
              >
                Bloquear
              </button>
            </div>
          </div>

          {/* Usar reserva */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Usar saldo reservado → bloqueado
              <span className="ml-2 text-slate-500 font-normal">reservado: R$ {reservedBalance.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="number" min="0.01" step="0.01"
                value={reserveAmt}
                onChange={(e) => setReserveAmt(e.target.value)}
                placeholder="0,00"
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              />
              <button
                disabled={isPending || !reserveAmt}
                onClick={() => go(() => useReserveForDispute(disputeId, parseFloat(reserveAmt) || 0))}
                className="bg-amber-700/50 hover:bg-amber-700 disabled:opacity-50 text-amber-300 text-sm font-medium px-4 py-2 rounded-lg border border-amber-600/40 transition-colors whitespace-nowrap"
              >
                Usar reserva
              </button>
            </div>
          </div>

          {/* Liberar bloqueado */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Liberar bloqueado → disponível
              <span className="ml-2 text-slate-500 font-normal">bloqueado neste caso: R$ {blockedAmount.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="number" min="0.01" step="0.01"
                value={releaseAmt}
                onChange={(e) => setReleaseAmt(e.target.value)}
                placeholder="0,00"
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                disabled={isPending || !releaseAmt || blockedAmount <= 0}
                onClick={() => go(() => releaseBlockedForDispute(disputeId, parseFloat(releaseAmt) || 0))}
                className="bg-emerald-700/50 hover:bg-emerald-700 disabled:opacity-50 text-emerald-300 text-sm font-medium px-4 py-2 rounded-lg border border-emerald-600/40 transition-colors whitespace-nowrap"
              >
                Liberar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Observação ── */}
      {tab === 'nota' && (
        <div className="space-y-3">
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Adicione uma observação interna ao caso..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            disabled={isPending || !note.trim()}
            onClick={() => { go(() => addDisputeNote(disputeId, note)); setNote('') }}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isPending ? 'Salvando...' : 'Adicionar observação'}
          </button>
        </div>
      )}

      {/* ── Documento ── */}
      {tab === 'doc' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Registre o nome/referência de documentos e evidências recebidos (prints, e-mails, arquivos).</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="ex: Comprovante PIX 01/07, Print WhatsApp, Contestação Banco"
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              disabled={isPending || !docName.trim()}
              onClick={() => { go(() => addDisputeDocument(disputeId, docName)); setDocName('') }}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              {isPending ? '...' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Dados ── */}
      {tab === 'meta' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Responsável interno</label>
              <input
                type="text"
                value={metaAssigned}
                onChange={(e) => setMetaAssigned(e.target.value)}
                placeholder="Nome ou e-mail"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prazo de análise</label>
              <input
                type="date"
                value={metaDeadline}
                onChange={(e) => setMetaDeadline(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">ID da transação vinculada</label>
              <input
                type="text"
                value={metaSaleLog}
                onChange={(e) => setMetaSaleLog(e.target.value)}
                placeholder="AuditLog ID da transação"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
          <button
            disabled={isPending}
            onClick={() => go(() => updateDisputeFields(disputeId, {
              assignedTo: metaAssigned || undefined,
              deadline:   metaDeadline || undefined,
              saleLogId:  metaSaleLog,
            }))}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {isPending ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
    </div>
  )
}
