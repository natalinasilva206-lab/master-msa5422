export const TYPE_LABEL: Record<string, string> = {
  CHARGEBACK:          'Chargeback cartão',
  MED_PIX:             'MED Pix',
  REEMBOLSO:           'Reembolso',
  DISPUTA_MANUAL:      'Disputa manual',
  BLOQUEIO_PREVENTIVO: 'Bloqueio preventivo',
}

export const TYPE_COLOR: Record<string, string> = {
  CHARGEBACK:          'text-red-400    bg-red-500/10    border-red-500/20',
  MED_PIX:             'text-orange-400 bg-orange-500/10 border-orange-500/20',
  REEMBOLSO:           'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  DISPUTA_MANUAL:      'text-purple-400 bg-purple-500/10 border-purple-500/20',
  BLOQUEIO_PREVENTIVO: 'text-blue-400   bg-blue-500/10   border-blue-500/20',
}

export const STATUS_LABEL: Record<string, string> = {
  ABERTO:              'Aberto',
  EM_ANALISE:          'Em análise',
  AGUARDANDO_DOCUMENTO:'Aguardando documento',
  BLOQUEADO:           'Bloqueado',
  RESOLVIDO_SELLER:    'Resolvido a favor do seller',
  RESOLVIDO_CONTRA:    'Resolvido contra o seller',
  DEVOLVIDO_PARCIAL:   'Devolvido parcialmente',
  FINALIZADO:          'Finalizado',
}

export const STATUS_COLOR: Record<string, string> = {
  ABERTO:              'text-slate-300  bg-slate-700/40  border-slate-600/40',
  EM_ANALISE:          'text-blue-400   bg-blue-500/10   border-blue-500/20',
  AGUARDANDO_DOCUMENTO:'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  BLOQUEADO:           'text-red-400    bg-red-500/10    border-red-500/20',
  RESOLVIDO_SELLER:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  RESOLVIDO_CONTRA:    'text-rose-400   bg-rose-500/10   border-rose-500/20',
  DEVOLVIDO_PARCIAL:   'text-amber-400  bg-amber-500/10  border-amber-500/20',
  FINALIZADO:          'text-slate-400  bg-slate-700/30  border-slate-600/30',
}

export const STATUS_DOT: Record<string, string> = {
  ABERTO:              'bg-slate-400',
  EM_ANALISE:          'bg-blue-400',
  AGUARDANDO_DOCUMENTO:'bg-yellow-400',
  BLOQUEADO:           'bg-red-400',
  RESOLVIDO_SELLER:    'bg-emerald-400',
  RESOLVIDO_CONTRA:    'bg-rose-400',
  DEVOLVIDO_PARCIAL:   'bg-amber-400',
  FINALIZADO:          'bg-slate-500',
}

export const ALL_STATUSES = Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]
export const ALL_TYPES    = Object.keys(TYPE_LABEL)   as (keyof typeof TYPE_LABEL)[]
