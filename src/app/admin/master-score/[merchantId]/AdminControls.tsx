'use client'

import { useState, useTransition } from 'react'
import {
  setMonitorado,
  setEstrategico,
  setNivelManual,
  setBeneficioCongelado,
  ignorarSugestaoScore,
  aplicarSugestaoScore,
  saveScoreObservacao,
} from '../actions'

type ScoreLevel = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'
type SugestaoStatus = 'pendente' | 'ignorada' | 'aplicada'

interface Props {
  merchantId:         string
  monitorado:         boolean
  estrategico:        boolean
  beneficioCongelado: boolean
  nivelManual:        string | null
  sugestaoStatus:     SugestaoStatus
  observacaoInterna:  string | null
}

type ActionKey =
  | 'observacao'
  | 'monitorado_on' | 'monitorado_off'
  | 'estrategico_on' | 'estrategico_off'
  | 'nivel_manual'
  | 'beneficio_congelar' | 'beneficio_descongelar'
  | 'sugestao_ignorar' | 'sugestao_aplicar'

const NIVEIS: ScoreLevel[] = ['Diamante', 'Ouro', 'Prata', 'Bronze']

const nivelColor: Record<ScoreLevel, string> = {
  Diamante: 'text-cyan-300',
  Ouro:     'text-amber-300',
  Prata:    'text-slate-300',
  Bronze:   'text-orange-400',
}

export default function AdminControls({
  merchantId,
  monitorado,
  estrategico,
  beneficioCongelado,
  nivelManual,
  sugestaoStatus,
  observacaoInterna,
}: Props) {
  const [pending, startTransition] = useTransition()

  // State local dos flags (atualizado otimisticamente)
  const [flags, setFlags] = useState({
    monitorado,
    estrategico,
    beneficioCongelado,
    nivelManual,
    sugestaoStatus,
    observacaoInterna,
  })

  // Qual ação está expandida aguardando motivo
  const [active, setActive] = useState<ActionKey | null>(null)
  const [motivo, setMotivo] = useState('')
  const [novoNivel, setNovoNivel] = useState<ScoreLevel | ''>(nivelManual as ScoreLevel ?? '')
  const [novaObs, setNovaObs] = useState(observacaoInterna ?? '')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function openAction(key: ActionKey) {
    setActive(key)
    setMotivo('')
    setFeedback(null)
  }

  function cancel() {
    setActive(null)
    setMotivo('')
  }

  async function executar() {
    if (!motivo.trim()) return
    const m = motivo.trim()

    startTransition(async () => {
      let res: { ok: boolean; error?: string }

      if (active === 'observacao') {
        res = await saveScoreObservacao(merchantId, novaObs, m)
        if (res.ok) setFlags(f => ({ ...f, observacaoInterna: novaObs }))
      } else if (active === 'monitorado_on') {
        res = await setMonitorado(merchantId, true, m)
        if (res.ok) setFlags(f => ({ ...f, monitorado: true }))
      } else if (active === 'monitorado_off') {
        res = await setMonitorado(merchantId, false, m)
        if (res.ok) setFlags(f => ({ ...f, monitorado: false }))
      } else if (active === 'estrategico_on') {
        res = await setEstrategico(merchantId, true, m)
        if (res.ok) setFlags(f => ({ ...f, estrategico: true }))
      } else if (active === 'estrategico_off') {
        res = await setEstrategico(merchantId, false, m)
        if (res.ok) setFlags(f => ({ ...f, estrategico: false }))
      } else if (active === 'nivel_manual') {
        const nivel = novoNivel || null
        res = await setNivelManual(merchantId, nivel, m)
        if (res.ok) setFlags(f => ({ ...f, nivelManual: nivel }))
      } else if (active === 'beneficio_congelar') {
        res = await setBeneficioCongelado(merchantId, true, m)
        if (res.ok) setFlags(f => ({ ...f, beneficioCongelado: true }))
      } else if (active === 'beneficio_descongelar') {
        res = await setBeneficioCongelado(merchantId, false, m)
        if (res.ok) setFlags(f => ({ ...f, beneficioCongelado: false }))
      } else if (active === 'sugestao_ignorar') {
        res = await ignorarSugestaoScore(merchantId, m)
        if (res.ok) setFlags(f => ({ ...f, sugestaoStatus: 'ignorada' }))
      } else if (active === 'sugestao_aplicar') {
        res = await aplicarSugestaoScore(merchantId, m)
        if (res.ok) setFlags(f => ({ ...f, sugestaoStatus: 'aplicada' }))
      } else {
        res = { ok: false, error: 'Ação desconhecida' }
      }

      if (res.ok) {
        setFeedback({ ok: true, msg: 'Ação registrada com auditoria.' })
        setActive(null)
        setMotivo('')
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Erro ao executar ação' })
      }
    })
  }

  const sugestaoMeta: Record<SugestaoStatus, { label: string; cls: string }> = {
    pendente: { label: 'Pendente',  cls: 'text-slate-400 bg-slate-700/40 border-slate-600/30' },
    ignorada: { label: 'Ignorada',  cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    aplicada: { label: 'Aplicada',  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-white">Controle Manual do ADM</p>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            Toda ação gera auditoria com ADM responsável, data/hora, valor anterior e motivo obrigatório
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {flags.monitorado         && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20">Monitorado</span>}
          {flags.estrategico        && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-purple-400 bg-purple-500/10 border-purple-500/20">Estratégico</span>}
          {flags.beneficioCongelado && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-orange-400 bg-orange-500/10 border-orange-500/20">Benefício Congelado</span>}
          {flags.nivelManual        && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-600/40 bg-slate-800/60 ${nivelColor[flags.nivelManual as ScoreLevel]}`}>Nível: {flags.nivelManual} (manual)</span>}
        </div>
      </div>

      {/* Status atual dos flags */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-800/40">
        {([
          { label: 'Monitoramento',    value: flags.monitorado ? 'Ativo' : 'Inativo',          cls: flags.monitorado ? 'text-blue-400' : 'text-slate-600' },
          { label: 'Seller Estratégico', value: flags.estrategico ? 'Sim' : 'Não',             cls: flags.estrategico ? 'text-purple-400' : 'text-slate-600' },
          { label: 'Benefício',        value: flags.beneficioCongelado ? 'Congelado' : 'Ativo', cls: flags.beneficioCongelado ? 'text-orange-400' : 'text-emerald-500' },
          { label: 'Sugestão',         value: sugestaoMeta[flags.sugestaoStatus].label,         cls: sugestaoMeta[flags.sugestaoStatus].cls.split(' ')[0] },
        ] as const).map((s) => (
          <div key={s.label} className="bg-slate-900/50 px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-[13px] font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Ações */}
      <div className="divide-y divide-slate-800/40">

        {/* Observação interna */}
        <ActionRow
          label="Adicionar / editar observação interna"
          description="Texto livre visível apenas para o ADM no painel do seller"
          icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          isActive={active === 'observacao'}
          onOpen={() => { setNovaObs(flags.observacaoInterna ?? ''); openAction('observacao') }}
          onCancel={cancel}
          btnLabel="Editar Observação"
          btnCls="text-slate-300 border-slate-600/50 hover:border-slate-500 hover:bg-slate-800/50"
        >
          <textarea
            rows={3}
            value={novaObs}
            onChange={(e) => setNovaObs(e.target.value)}
            placeholder="Observação interna sobre o seller..."
            className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-600 mb-3"
          />
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

        {/* Monitorado */}
        <ActionRow
          label={flags.monitorado ? 'Remover monitoramento' : 'Marcar como monitorado'}
          description="Sellers monitorados recebem destaque no painel e são acompanhados de perto"
          icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          isActive={active === 'monitorado_on' || active === 'monitorado_off'}
          onOpen={() => openAction(flags.monitorado ? 'monitorado_off' : 'monitorado_on')}
          onCancel={cancel}
          btnLabel={flags.monitorado ? 'Remover Monitoramento' : 'Ativar Monitoramento'}
          btnCls={flags.monitorado ? 'text-slate-400 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/40' : 'text-blue-400 border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/5'}
          badge={flags.monitorado ? { label: 'Ativo', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' } : undefined}
        >
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

        {/* Estratégico */}
        <ActionRow
          label={flags.estrategico ? 'Remover classificação estratégica' : 'Marcar como seller estratégico'}
          description="Sellers estratégicos têm prioridade de atendimento e políticas diferenciadas"
          icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          isActive={active === 'estrategico_on' || active === 'estrategico_off'}
          onOpen={() => openAction(flags.estrategico ? 'estrategico_off' : 'estrategico_on')}
          onCancel={cancel}
          btnLabel={flags.estrategico ? 'Remover Classificação' : 'Marcar como Estratégico'}
          btnCls={flags.estrategico ? 'text-slate-400 border-slate-700/40 hover:border-slate-600 hover:bg-slate-800/40' : 'text-purple-400 border-purple-500/30 hover:border-purple-500/50 hover:bg-purple-500/5'}
          badge={flags.estrategico ? { label: 'Estratégico', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20' } : undefined}
        >
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

        {/* Nível manual */}
        <ActionRow
          label="Alterar nível de risco manualmente"
          description="Sobrescreve o nível calculado automaticamente. Revertido no próximo recálculo caso removido."
          icon="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          isActive={active === 'nivel_manual'}
          onOpen={() => { setNovoNivel((flags.nivelManual as ScoreLevel) ?? ''); openAction('nivel_manual') }}
          onCancel={cancel}
          btnLabel={flags.nivelManual ? `Nível: ${flags.nivelManual} (manual)` : 'Definir Nível Manual'}
          btnCls={flags.nivelManual ? 'text-amber-400 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5' : 'text-slate-300 border-slate-600/50 hover:border-slate-500 hover:bg-slate-800/50'}
          badge={flags.nivelManual ? { label: 'Override ativo', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' } : undefined}
        >
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => setNovoNivel('')}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${novoNivel === '' ? 'bg-slate-700/60 border-slate-500/50 text-slate-200' : 'border-slate-700/40 text-slate-600 hover:text-slate-400'}`}
            >
              Automático (remover override)
            </button>
            {NIVEIS.map((n) => (
              <button
                key={n}
                onClick={() => setNovoNivel(n)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${novoNivel === n ? `border-slate-500/50 bg-slate-700/60 ${nivelColor[n]}` : `border-slate-700/40 text-slate-600 hover:text-slate-400`}`}
              >
                {n}
              </button>
            ))}
          </div>
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

        {/* Benefício */}
        <ActionRow
          label={flags.beneficioCongelado ? 'Descongelar benefício' : 'Congelar benefício temporariamente'}
          description="Suspende temporariamente benefícios como cashback, CDI e descontos de taxa"
          icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          isActive={active === 'beneficio_congelar' || active === 'beneficio_descongelar'}
          onOpen={() => openAction(flags.beneficioCongelado ? 'beneficio_descongelar' : 'beneficio_congelar')}
          onCancel={cancel}
          btnLabel={flags.beneficioCongelado ? 'Descongelar Benefício' : 'Congelar Benefício'}
          btnCls={flags.beneficioCongelado ? 'text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5' : 'text-orange-400 border-orange-500/30 hover:border-orange-500/50 hover:bg-orange-500/5'}
          badge={flags.beneficioCongelado ? { label: 'Congelado', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' } : undefined}
        >
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

        {/* Sugestão: ignorar */}
        <ActionRow
          label="Ignorar sugestão automática"
          description="Registra que o ADM avaliou a sugestão e optou por não aplicá-la"
          icon="M6 18L18 6M6 6l12 12"
          isActive={active === 'sugestao_ignorar'}
          onOpen={() => openAction('sugestao_ignorar')}
          onCancel={cancel}
          btnLabel="Ignorar Sugestão"
          btnCls={flags.sugestaoStatus === 'ignorada' ? 'text-slate-500 border-slate-700/30 cursor-default' : 'text-amber-400 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5'}
          disabled={flags.sugestaoStatus === 'ignorada'}
          badge={flags.sugestaoStatus === 'ignorada' ? { label: 'Já ignorada', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' } : undefined}
        >
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

        {/* Sugestão: aplicar */}
        <ActionRow
          label="Aplicar sugestão automática"
          description="Registra que o ADM confirmou a sugestão do sistema como decisão tomada"
          icon="M5 13l4 4L19 7"
          isActive={active === 'sugestao_aplicar'}
          onOpen={() => openAction('sugestao_aplicar')}
          onCancel={cancel}
          btnLabel="Confirmar Aplicação"
          btnCls={flags.sugestaoStatus === 'aplicada' ? 'text-slate-500 border-slate-700/30 cursor-default' : 'text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5'}
          disabled={flags.sugestaoStatus === 'aplicada'}
          badge={flags.sugestaoStatus === 'aplicada' ? { label: 'Já aplicada', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' } : undefined}
        >
          <MotivoInput motivo={motivo} onChange={setMotivo} />
        </ActionRow>

      </div>

      {/* Painel de confirmação / feedback */}
      {active && (
        <div className="px-5 py-4 border-t border-slate-800/60 bg-slate-900/40 flex items-center gap-3">
          <button
            onClick={executar}
            disabled={!motivo.trim() || pending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {pending ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            Confirmar e Registrar
          </button>
          <button
            onClick={cancel}
            className="px-3 py-2 rounded-lg text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>
          {!motivo.trim() && (
            <p className="text-[11px] text-amber-500/80">Motivo obrigatório para registrar a ação</p>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && !active && (
        <div className={`px-5 py-3 border-t ${feedback.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
          <p className={`text-[12px] font-semibold ${feedback.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {feedback.ok ? '✓' : '✗'} {feedback.msg}
          </p>
        </div>
      )}

      {/* Rodapé */}
      <div className="px-5 py-3 border-t border-slate-800/50 bg-slate-900/30">
        <p className="text-[10.5px] text-slate-700">
          Todas as ações são registradas com ADM responsável, data/hora, valor anterior, valor novo e motivo. Consulte o log abaixo.
        </p>
      </div>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function MotivoInput({ motivo, onChange }: { motivo: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        Motivo <span className="text-red-400">*</span>
      </label>
      <input
        type="text"
        value={motivo}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Descreva o motivo desta ação..."
        className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
        autoFocus
      />
    </div>
  )
}

interface ActionRowProps {
  label:       string
  description: string
  icon:        string
  isActive:    boolean
  onOpen:      () => void
  onCancel:    () => void
  btnLabel:    string
  btnCls:      string
  disabled?:   boolean
  badge?:      { label: string; cls: string }
  children?:   React.ReactNode
}

function ActionRow({ label, description, icon, isActive, onOpen, btnLabel, btnCls, disabled, badge, children }: ActionRowProps) {
  return (
    <div className={`px-5 py-4 transition-colors ${isActive ? 'bg-slate-800/30' : 'hover:bg-slate-800/10'}`}>
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-[12.5px] font-semibold text-slate-200">{label}</p>
            {badge && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">{description}</p>
        </div>
        {/* Botão */}
        <button
          onClick={isActive ? undefined : onOpen}
          disabled={disabled && !isActive}
          className={`shrink-0 px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold transition-colors ${btnCls} ${disabled ? 'opacity-40 cursor-default' : ''}`}
        >
          {isActive ? 'Expandido ▴' : btnLabel}
        </button>
      </div>

      {/* Área expandida */}
      {isActive && (
        <div className="mt-4 ml-11 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
