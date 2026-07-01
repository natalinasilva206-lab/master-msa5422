'use client'

import { useState } from 'react'

type Nivel = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante'

const ORDEM: Nivel[] = ['Bronze', 'Prata', 'Ouro', 'Diamante']

const NIVEL_CONFIG: Record<Nivel, {
  icone: string
  cor: string
  corMuted: string
  bg: string
  border: string
  borderAtivo: string
  badge: string
  glow: string
  progresso: string
}> = {
  Bronze: {
    icone: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    cor: 'text-orange-400',
    corMuted: 'text-orange-700/60',
    bg: 'bg-orange-500/8',
    border: 'border-slate-800/60',
    borderAtivo: 'border-orange-500/30',
    badge: 'bg-orange-500/15 border-orange-500/25 text-orange-400',
    glow: '',
    progresso: 'bg-gradient-to-r from-orange-600 to-amber-500',
  },
  Prata: {
    icone: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    cor: 'text-slate-300',
    corMuted: 'text-slate-600',
    bg: 'bg-slate-700/20',
    border: 'border-slate-800/60',
    borderAtivo: 'border-slate-500/40',
    badge: 'bg-slate-700/40 border-slate-600/40 text-slate-300',
    glow: '',
    progresso: 'bg-gradient-to-r from-slate-500 to-slate-400',
  },
  Ouro: {
    icone: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    cor: 'text-amber-300',
    corMuted: 'text-amber-700/60',
    bg: 'bg-amber-500/8',
    border: 'border-slate-800/60',
    borderAtivo: 'border-amber-500/30',
    badge: 'bg-amber-500/15 border-amber-500/25 text-amber-300',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    progresso: 'bg-gradient-to-r from-amber-500 to-yellow-400',
  },
  Diamante: {
    icone: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    cor: 'text-cyan-300',
    corMuted: 'text-cyan-700/60',
    bg: 'bg-cyan-500/8',
    border: 'border-slate-800/60',
    borderAtivo: 'border-cyan-500/30',
    badge: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-300',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.10)]',
    progresso: 'bg-gradient-to-r from-cyan-500 to-blue-400',
  },
}

type Beneficio = {
  texto: string
  tipo: 'disponivel' | 'analise' | 'futuro'
  icone: string
}

const BENEFICIOS: Record<Nivel, Beneficio[]> = {
  Bronze: [
    { texto: 'Acesso completo à plataforma de vendas',          tipo: 'disponivel', icone: 'M5 13l4 4L19 7' },
    { texto: 'Painel de acompanhamento de performance',         tipo: 'disponivel', icone: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { texto: 'Rendimento CDI sobre saldo disponível',           tipo: 'disponivel', icone: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { texto: 'Reserva de risco no padrão da plataforma',        tipo: 'disponivel', icone: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { texto: 'Suporte via central de atendimento',              tipo: 'disponivel', icone: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  ],
  Prata: [
    { texto: 'Todos os benefícios do nível Bronze',             tipo: 'disponivel', icone: 'M5 13l4 4L19 7' },
    { texto: 'Melhores condições conforme histórico operacional', tipo: 'analise',  icone: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { texto: 'Possibilidade de redução na reserva de risco',    tipo: 'analise',   icone: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { texto: 'Análise para acesso a benefícios financeiros',    tipo: 'analise',   icone: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
    { texto: 'Prazo de liberação de saldo com possibilidade de melhora', tipo: 'analise', icone: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ],
  Ouro: [
    { texto: 'Todos os benefícios do nível Prata',              tipo: 'disponivel', icone: 'M5 13l4 4L19 7' },
    { texto: 'Reserva de risco reduzida conforme análise',      tipo: 'analise',   icone: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { texto: 'Prazo de liberação de saldo mais favorável',      tipo: 'analise',   icone: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { texto: 'Taxa de rendimento melhorada, quando disponível', tipo: 'analise',   icone: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { texto: 'Atendimento com prioridade sobre outros níveis',  tipo: 'disponivel', icone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  ],
  Diamante: [
    { texto: 'Todos os benefícios do nível Ouro',               tipo: 'disponivel', icone: 'M5 13l4 4L19 7' },
    { texto: 'Melhores condições comerciais disponíveis',        tipo: 'analise',   icone: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    { texto: 'Rendimento premium sobre saldo, quando disponível', tipo: 'analise', icone: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 16v-1m0 1v.01M12 16c-1.11 0-2.08-.402-2.599-1' },
    { texto: 'Prioridade máxima em todos os canais de suporte',  tipo: 'disponivel', icone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { texto: 'Análise para limite de crédito, cartão e capital de giro', tipo: 'futuro', icone: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ],
}

const TIPO_LABEL: Record<string, { texto: string; cor: string; bg: string; border: string }> = {
  disponivel: { texto: 'Disponível',         cor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  analise:    { texto: 'Conforme análise',   cor: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
  futuro:     { texto: 'Em breve',           cor: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20'  },
}

const SCORE_RANGE: Record<Nivel, string> = {
  Bronze:   '0 – 39 pts',
  Prata:    '40 – 59 pts',
  Ouro:     '60 – 79 pts',
  Diamante: '80 – 100 pts',
}

interface Props {
  nivelAtual: Nivel | string
}

export function BeneficiosPorNivel({ nivelAtual }: Props) {
  const nivelSafe = (ORDEM.includes(nivelAtual as Nivel) ? nivelAtual : 'Bronze') as Nivel
  const [nivelVisto, setNivelVisto] = useState<Nivel>(nivelSafe)

  const cfg  = NIVEL_CONFIG[nivelVisto]
  const bens = BENEFICIOS[nivelVisto]
  const ehAtual = nivelVisto === nivelSafe

  return (
    <section className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between gap-4">
        <div>
          <p className="text-[18px] font-semibold text-white leading-tight">Benefícios por Nível</p>
          <p className="text-[13px] text-slate-600 mt-0.5">
            Possíveis benefícios disponíveis conforme seu histórico e análise da plataforma
          </p>
        </div>
        {/* Nível atual badge */}
        <div className={`shrink-0 hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold ${NIVEL_CONFIG[nivelSafe].badge}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={NIVEL_CONFIG[nivelSafe].icone} />
          </svg>
          Você: {nivelSafe}
        </div>
      </div>

      {/* Nível tabs */}
      <div className="flex border-b border-slate-800/60 overflow-x-auto scrollbar-none">
        {ORDEM.map((n) => {
          const c = NIVEL_CONFIG[n]
          const ativo = nivelVisto === n
          const atual = nivelSafe === n
          return (
            <button
              key={n}
              onClick={() => setNivelVisto(n)}
              className={`flex-1 min-w-[80px] flex flex-col items-center gap-1 px-3 py-3 border-b-2 transition-all ${
                ativo
                  ? `${c.cor} border-current bg-slate-800/20`
                  : 'text-slate-600 border-transparent hover:text-slate-400 hover:bg-slate-800/10'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${ativo ? c.bg : 'bg-slate-800/40'}`}>
                <svg className={`w-3.5 h-3.5 ${ativo ? c.cor : 'text-slate-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icone} />
                </svg>
              </div>
              <span className="text-[11px] font-bold tracking-wide">{n}</span>
              {atual && (
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">seu nível</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Conteúdo do nível selecionado */}
      <div className="p-5 space-y-4">

        {/* Título do nível + range */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${cfg.bg} ${cfg.borderAtivo}`}>
              <svg className={`w-4 h-4 ${cfg.cor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icone} />
              </svg>
            </div>
            <div>
              <p className={`text-[15px] font-bold ${cfg.cor}`}>{nivelVisto}</p>
              <p className="text-[11px] text-slate-600">{SCORE_RANGE[nivelVisto]}</p>
            </div>
          </div>
          {ehAtual ? (
            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Nível atual
            </span>
          ) : (
            <span className="text-[11px] text-slate-700 italic">
              {ORDEM.indexOf(nivelVisto) > ORDEM.indexOf(nivelSafe) ? 'Próximo nível' : 'Nível anterior'}
            </span>
          )}
        </div>

        {/* Lista de benefícios */}
        <ul className="space-y-2.5">
          {bens.map((b, i) => {
            const tipo = TIPO_LABEL[b.tipo]
            return (
              <li key={i} className="flex items-start gap-3 group">
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${cfg.bg} border ${cfg.borderAtivo}`}>
                  <svg className={`w-3.5 h-3.5 ${cfg.cor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={b.icone} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-[13px] text-slate-300 leading-snug flex-1">{b.texto}</p>
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${tipo.bg} ${tipo.border} ${tipo.cor} uppercase tracking-wider whitespace-nowrap mt-0.5`}>
                      {tipo.texto}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Legenda de tags */}
        <div className="border-t border-slate-800/40 pt-4">
          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-2.5">Legenda</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIPO_LABEL).map(([k, v]) => (
              <span key={k} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${v.bg} ${v.border} ${v.cor}`}>
                {v.texto}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-700 mt-2.5 leading-relaxed">
            Os benefícios indicados como <span className="text-blue-400/80 font-semibold">"Conforme análise"</span> ou{' '}
            <span className="text-emerald-400/80 font-semibold">"Disponível"</span> dependem de avaliação individual
            e podem variar. As condições finais são definidas pela equipe da plataforma. Nenhum benefício é
            garantido automaticamente pela pontuação.
          </p>
        </div>

        {/* CTA para nível acima — só se não for Diamante */}
        {nivelSafe !== 'Diamante' && nivelVisto === nivelSafe && (
          <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${cfg.bg} ${cfg.borderAtivo}`}>
            <div>
              <p className={`text-[13px] font-bold ${cfg.cor}`}>
                Quer evoluir para {ORDEM[ORDEM.indexOf(nivelSafe) + 1]}?
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Melhore suas métricas e acompanhe seu progresso no Master Score
              </p>
            </div>
            <button
              onClick={() => setNivelVisto(ORDEM[ORDEM.indexOf(nivelSafe) + 1])}
              className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-lg border ${cfg.badge} transition-opacity hover:opacity-80`}
            >
              Ver benefícios →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
