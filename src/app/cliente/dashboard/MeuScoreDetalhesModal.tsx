'use client'

import { useState, useEffect, useCallback } from 'react'

const BLOCOS = [
  {
    id: 'volume',
    titulo: 'Vendas e Volume',
    icone: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    cor: 'text-blue-400',
    corBg: 'bg-blue-500/10',
    corBorder: 'border-blue-500/20',
    corBarLeft: 'from-blue-600',
    corBarRight: 'to-blue-400',
    resumo: 'Quanto mais você vende, melhor sua pontuação',
    descricao: 'Sellers com volume de vendas crescente e consistente demonstram saúde operacional. Isso contribui positivamente para o seu score e pode resultar em melhores condições na plataforma.',
    dicas: [
      'Mantenha suas vendas ativas e regulares',
      'Crescimento constante mês a mês é valorizado',
      'Quanto maior o volume processado, melhor a avaliação',
    ],
    positivo: 'Volume alto e crescente',
    negativo: 'Inatividade ou queda brusca',
  },
  {
    id: 'seguranca',
    titulo: 'Segurança nas Transações',
    icone: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    cor: 'text-emerald-400',
    corBg: 'bg-emerald-500/10',
    corBorder: 'border-emerald-500/20',
    corBarLeft: 'from-emerald-600',
    corBarRight: 'to-emerald-400',
    resumo: 'Menos disputas e chargebacks = score mais alto',
    descricao: 'Chargebacks, MEDs Pix e disputas abertas indicam problemas nas transações. Manter uma operação segura, com baixa taxa de contestações, é um dos fatores mais importantes para evolução do seu score.',
    dicas: [
      'Forneça descrição clara do produto/serviço ao cliente',
      'Tenha política de cancelamento acessível para evitar disputas',
      'Responda rápido a reclamações antes que virem contestações',
      'Regularize disputas abertas o quanto antes',
    ],
    positivo: 'Operação com poucas ou nenhuma contestação',
    negativo: 'Chargebacks frequentes ou MEDs recorrentes',
  },
  {
    id: 'reembolsos',
    titulo: 'Reembolsos',
    icone: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
    cor: 'text-amber-400',
    corBg: 'bg-amber-500/10',
    corBorder: 'border-amber-500/20',
    corBarLeft: 'from-amber-600',
    corBarRight: 'to-amber-400',
    resumo: 'Poucas devoluções indicam vendas de qualidade',
    descricao: 'Reembolsos frequentes podem indicar insatisfação de clientes ou problemas no produto. Uma taxa de reembolso baixa mostra que suas vendas são saudáveis e que seus clientes ficam satisfeitos.',
    dicas: [
      'Descreva seus produtos com precisão para evitar expectativas erradas',
      'Ofereça suporte ágil para resolver dúvidas antes do reembolso',
      'Acompanhe os motivos de devolução para melhorar continuamente',
    ],
    positivo: 'Baixa taxa de devoluções e reembolsos',
    negativo: 'Alto volume de pedidos de reembolso',
  },
  {
    id: 'saldo',
    titulo: 'Saldo e Relacionamento',
    icone: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    cor: 'text-purple-400',
    corBg: 'bg-purple-500/10',
    corBorder: 'border-purple-500/20',
    corBarLeft: 'from-purple-600',
    corBarRight: 'to-purple-400',
    resumo: 'Manter saldo ativo fortalece seu perfil na plataforma',
    descricao: 'Sellers que utilizam a plataforma de forma ativa — mantendo saldo disponível, fazendo aportes no CDI e usando os recursos financeiros — demonstram engajamento e comprometimento, o que é levado em conta na avaliação.',
    dicas: [
      'Mantenha saldo positivo na conta sempre que possível',
      'Aproveite o CDI para fazer seu dinheiro render enquanto não é usado',
      'Quanto mais você usa a plataforma, mais robusto fica seu perfil',
    ],
    positivo: 'Saldo ativo e uso frequente da plataforma',
    negativo: 'Conta com saldo zerado por longos períodos',
  },
  {
    id: 'tempo',
    titulo: 'Tempo de Relacionamento',
    icone: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    cor: 'text-slate-300',
    corBg: 'bg-slate-700/30',
    corBorder: 'border-slate-600/30',
    corBarLeft: 'from-slate-500',
    corBarRight: 'to-slate-400',
    resumo: 'Contas com histórico sólido têm acesso a melhores condições',
    descricao: 'Quanto mais tempo você opera com bom histórico na plataforma, mais confiança é construída. Sellers com longo tempo de conta e boa conduta ao longo do tempo podem ter acesso a condições diferenciadas.',
    dicas: [
      'Mantenha sua conta ativa e com bom desempenho ao longo do tempo',
      'Quanto mais antigo e saudável o histórico, melhor a avaliação',
      'Cada mês de operação positiva contribui para o seu perfil',
    ],
    positivo: 'Histórico longo e positivo de operação',
    negativo: 'Conta nova ou com histórico recente negativo',
  },
]

interface Props {
  nivelAtual: string
  scoreAtual: number
  statusAmigavel: string
}

export function MeuScoreDetalhesModal({ nivelAtual, scoreAtual, statusAmigavel }: Props) {
  const [open, setOpen]           = useState(false)
  const [blocoAtivo, setBlocoAtivo] = useState<string | null>(null)

  const fechar = useCallback(() => {
    setOpen(false)
    setBlocoAtivo(null)
  }, [])

  // Fecha com Esc
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, fechar])

  // Trava scroll do body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const nivelColors: Record<string, { text: string; badge: string }> = {
    Diamante: { text: 'text-cyan-300',   badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' },
    Ouro:     { text: 'text-amber-300',  badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
    Prata:    { text: 'text-slate-300',  badge: 'bg-slate-700/40 border-slate-600/40 text-slate-300' },
    Bronze:   { text: 'text-orange-400', badge: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
  }
  const nc = nivelColors[nivelAtual] ?? nivelColors.Bronze

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-blue-400 transition-colors group"
      >
        <svg className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Entender meu score
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={fechar}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal panel */}
          <div
            className="relative z-10 w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col bg-[#0f1117] border border-slate-800/80 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[17px] font-bold text-white leading-tight">Detalhes do Meu Score</p>
                  <p className="text-[12px] text-slate-600 mt-0.5">O que influencia a sua avaliação na plataforma</p>
                </div>
              </div>
              <button
                onClick={fechar}
                className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 flex items-center justify-center text-slate-500 hover:text-white transition-all shrink-0 ml-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Score resumo */}
            <div className="px-5 py-3 border-b border-slate-800/40 shrink-0 flex items-center gap-3 bg-slate-900/40">
              <div className="flex-1">
                <p className="text-[12px] text-slate-600 uppercase tracking-widest font-bold">Seu score atual</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[22px] font-black tabular-nums leading-none ${nc.text}`}>
                    {scoreAtual}
                  </span>
                  <span className="text-[13px] text-slate-700 font-semibold">/100</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ml-1 ${nc.badge}`}>
                    {nivelAtual} · {statusAmigavel}
                  </span>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-[11px] text-slate-700 uppercase tracking-widest font-bold">Atualização</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Automática com base no histórico</p>
              </div>
            </div>

            {/* Intro */}
            <div className="px-5 py-4 shrink-0 border-b border-slate-800/40 bg-slate-900/20">
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Seu Master Score é calculado automaticamente com base no seu histórico de operações na plataforma.
                Abaixo estão os principais fatores que influenciam sua avaliação. Toque em cada um para saber mais.
              </p>
            </div>

            {/* Blocos — scrollável */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2">

              {BLOCOS.map((bloco) => {
                const ativo = blocoAtivo === bloco.id
                return (
                  <div
                    key={bloco.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      ativo
                        ? `${bloco.corBg} ${bloco.corBorder}`
                        : 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700/60'
                    }`}
                  >
                    {/* Bloco header — clicável */}
                    <button
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                      onClick={() => setBlocoAtivo(ativo ? null : bloco.id)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bloco.corBg} border ${bloco.corBorder}`}>
                        <svg className={`w-4 h-4 ${bloco.cor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={bloco.icone} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-bold ${ativo ? bloco.cor : 'text-white'} leading-tight`}>
                          {bloco.titulo}
                        </p>
                        <p className="text-[11.5px] text-slate-600 mt-0.5 truncate">{bloco.resumo}</p>
                      </div>
                      <svg
                        className={`w-4 h-4 shrink-0 transition-transform ${ativo ? 'rotate-180 ' + bloco.cor : 'text-slate-700'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expandido */}
                    {ativo && (
                      <div className="px-4 pb-4 space-y-4 border-t border-slate-800/30">
                        {/* Descrição */}
                        <p className="text-[13px] text-slate-400 leading-relaxed pt-3">
                          {bloco.descricao}
                        </p>

                        {/* Positivo / Negativo */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ajuda o score</span>
                            </div>
                            <p className="text-[12px] text-emerald-400/80 leading-snug">{bloco.positivo}</p>
                          </div>
                          <div className="bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <svg className="w-3 h-3 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Pode reduzir</span>
                            </div>
                            <p className="text-[12px] text-red-400/80 leading-snug">{bloco.negativo}</p>
                          </div>
                        </div>

                        {/* Dicas */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Como melhorar</p>
                          <ul className="space-y-1.5">
                            {bloco.dicas.map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <svg className={`w-3 h-3 shrink-0 mt-0.5 ${bloco.cor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-[12px] text-slate-500 leading-snug">{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Footer note */}
              <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl px-4 py-3 mt-2">
                <div className="flex items-start gap-2.5">
                  <svg className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[12px] text-slate-600 leading-relaxed">
                    O Master Score é recalculado automaticamente com base no seu histórico recente de operações.
                    Melhoras no seu comportamento na plataforma refletem gradualmente na sua avaliação.
                  </p>
                </div>
              </div>

              {/* Espaço extra para scroll em mobile */}
              <div className="h-2" />
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-slate-800/50 shrink-0 bg-slate-900/60">
              <button
                onClick={fechar}
                className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 text-[13px] font-semibold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
