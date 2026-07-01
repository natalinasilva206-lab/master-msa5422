import Link from 'next/link'
import { MeuScoreDetalhesModal } from './MeuScoreDetalhesModal'

type MasterScoreData = {
  scoreTotal: number
  nivelScore: string
  statusRisco: string
  updatedAt?: Date | string | null
}

const FRIENDLY_STATUS: Record<string, string> = {
  'Alto risco': 'Nível inicial',
  'Atenção':    'Em evolução',
  'Saudável':   'Bom desempenho',
  'Premium':    'Seller premium',
}

const LEVEL_NEXT: Record<string, { label: string; target: number } | null> = {
  Bronze:   { label: 'Prata',    target: 40 },
  Prata:    { label: 'Ouro',     target: 60 },
  Ouro:     { label: 'Diamante', target: 80 },
  Diamante: null,
}

const LEVEL_PALETTE: Record<string, {
  text: string; textMuted: string; bg: string; border: string; bar: string; glow: string; badge: string
}> = {
  Diamante: {
    text: 'text-cyan-300', textMuted: 'text-cyan-500/70',
    bg: 'bg-cyan-500/8', border: 'border-cyan-500/20',
    bar: 'bg-gradient-to-r from-cyan-500 to-blue-400',
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.15)]',
    badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  },
  Ouro: {
    text: 'text-amber-300', textMuted: 'text-amber-600/80',
    bg: 'bg-amber-500/8', border: 'border-amber-500/20',
    bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.12)]',
    badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  },
  Prata: {
    text: 'text-slate-300', textMuted: 'text-slate-500',
    bg: 'bg-slate-700/20', border: 'border-slate-600/30',
    bar: 'bg-gradient-to-r from-slate-500 to-slate-400',
    glow: '',
    badge: 'bg-slate-700/40 border-slate-600/40 text-slate-300',
  },
  Bronze: {
    text: 'text-orange-400', textMuted: 'text-orange-700/70',
    bg: 'bg-orange-500/8', border: 'border-orange-500/20',
    bar: 'bg-gradient-to-r from-orange-600 to-amber-500',
    glow: '',
    badge: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  },
}

const BENEFITS: Record<string, string[]> = {
  Bronze: [
    'Conta ativa com recebimentos',
    'Rendimento CDI sobre saldo',
    'Suporte via central',
  ],
  Prata: [
    'Reserva de risco reduzida',
    'Prazo de liberação mais curto',
    'Acesso a relatórios de desempenho',
  ],
  Ouro: [
    'Taxa de reserva preferencial',
    'Liberações mais ágeis',
    'Atendimento prioritário',
    'Antecipação de recebíveis',
  ],
  Diamante: [
    'Menor reserva de risco da plataforma',
    'Liquidação D+1',
    'Gerente de conta dedicado',
    'Condições exclusivas de antecipação',
    'Badge Seller Premium visível para clientes',
  ],
}

const TIPS: Record<string, string[]> = {
  Bronze: [
    'Mantenha seu volume de vendas crescendo mês a mês',
    'Evite cancelamentos e estornos desnecessários',
    'Regularize disputas abertas o quanto antes',
    'Mantenha saldo positivo na conta',
  ],
  Prata: [
    'Reduza sua taxa de cancelamentos abaixo de 2%',
    'Aumente o volume médio mensal de vendas',
    'Evite novas disputas de chargeback',
    'Aporte no CDI para melhorar o indicador de saldo',
  ],
  Ouro: [
    'Continue mantendo baixa taxa de disputa',
    'Expanda o volume de vendas para alcançar o nível Diamante',
    'Mantenha crescimento consistente mês a mês',
  ],
  Diamante: [
    'Continue com o excelente desempenho!',
    'Seu histórico sólido mantém os melhores benefícios da plataforma',
  ],
}

const LEVEL_ICONS: Record<string, string> = {
  Diamante: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  Ouro:     'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  Prata:    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  Bronze:   'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
}

function ScoreGauge({ score, nivel }: { score: number; nivel: string }) {
  const p = LEVEL_PALETTE[nivel] ?? LEVEL_PALETTE.Bronze
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)))

  // SVG arc gauge  (half-circle, r=40, cx=50, cy=50)
  const r = 40
  const cx = 50; const cy = 50
  const circum = Math.PI * r  // half-circle circumference
  const filled = (clampedScore / 100) * circum
  const gap    = circum - filled

  const arcColor: Record<string, string> = {
    Diamante: '#22d3ee', Ouro: '#f59e0b', Prata: '#94a3b8', Bronze: '#f97316',
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[110px] h-[60px]">
        <svg viewBox="0 0 100 55" className="w-full h-full" overflow="visible">
          {/* track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={8}
            strokeLinecap="round"
          />
          {/* filled arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={arcColor[nivel] ?? '#94a3b8'}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${gap}`}
            strokeDashoffset={0}
            style={{ filter: `drop-shadow(0 0 4px ${arcColor[nivel] ?? '#94a3b8'}60)` }}
          />
        </svg>
        {/* score in centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <span className={`text-[26px] font-black tabular-nums leading-none ${p.text}`}>
            {clampedScore}
          </span>
          <span className="text-[10px] text-slate-600 font-semibold tracking-wider">/100</span>
        </div>
      </div>
    </div>
  )
}

export function MeuMasterScoreCard({ masterScore }: { masterScore: MasterScoreData }) {
  const nivel  = masterScore.nivelScore as string
  const score  = Math.round(masterScore.scoreTotal)
  const status = FRIENDLY_STATUS[masterScore.statusRisco] ?? masterScore.statusRisco
  const p      = LEVEL_PALETTE[nivel] ?? LEVEL_PALETTE.Bronze
  const next   = LEVEL_NEXT[nivel]
  const tips   = TIPS[nivel]   ?? TIPS.Bronze
  const bens   = BENEFITS[nivel] ?? BENEFITS.Bronze
  const icon   = LEVEL_ICONS[nivel] ?? LEVEL_ICONS.Bronze

  // progress to next level
  const progressPct  = next ? Math.min(100, Math.round((score / next.target) * 100)) : 100
  const pontosParaProximo = next ? Math.max(0, next.target - score) : 0

  return (
    <div className={`border rounded-2xl overflow-hidden ${p.bg} ${p.border} ${p.glow}`}>

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start gap-4">
        {/* Gauge */}
        <div className="shrink-0">
          <ScoreGauge score={score} nivel={nivel} />
        </div>

        {/* Title + badges */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${p.badge}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              {nivel}
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${p.badge}`}>
              {status}
            </span>
          </div>
          <p className="text-[20px] font-bold text-white leading-tight">Meu Master Score</p>
          <p className={`text-[12px] ${p.textMuted} mt-0.5`}>Avaliação automática do seu perfil de seller</p>
        </div>
      </div>

      {/* Progress to next level */}
      <div className="px-5 pb-4">
        {next ? (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Progresso para {next.label}
              </span>
              <span className={`text-[11px] font-bold ${p.text}`}>
                {pontosParaProximo > 0 ? `Faltam ${pontosParaProximo} pts` : 'Quase lá!'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${p.bar}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-700 mt-1">
              {score} de {next.target} pontos necessários · nível {next.label}
            </p>
          </>
        ) : (
          <div className={`text-center py-2 rounded-xl border ${p.border} ${p.bg}`}>
            <p className={`text-[13px] font-bold ${p.text}`}>Você está no nível máximo</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Continue mantendo seu excelente desempenho</p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800/40 mx-5" />

      {/* Benefits + Tips grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/40">

        {/* Benefits */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            Benefícios do nível {nivel}
          </p>
          <ul className="space-y-2">
            {bens.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${p.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[12px] text-slate-400 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {nivel === 'Diamante' ? 'Continue assim' : 'Como evoluir'}
          </p>
          <ul className="space-y-2">
            {tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-[12px] text-slate-400 leading-snug">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer — link para detalhes */}
      <div className="border-t border-slate-800/40 px-5 py-3 flex items-center justify-between">
        <MeuScoreDetalhesModal
          nivelAtual={nivel}
          scoreAtual={score}
          statusAmigavel={status}
        />
        <p className="text-[11px] text-slate-700">Atualizado automaticamente</p>
      </div>

    </div>
  )
}
