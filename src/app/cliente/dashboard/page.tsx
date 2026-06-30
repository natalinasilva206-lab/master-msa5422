export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import Link from 'next/link'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function anualizarTaxa(mensal: number) {
  return (Math.pow(1 + mensal / 100, 12) - 1) * 100
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

const planColors: Record<string, string> = {
  Start:  'text-slate-300',
  Growth: 'text-blue-400',
  Prime:  'text-purple-400',
  Black:  'text-slate-100',
}

const planBg: Record<string, string> = {
  Start:  'bg-slate-700/40',
  Growth: 'bg-blue-600/20 border border-blue-500/20',
  Prime:  'bg-purple-600/20 border border-purple-500/20',
  Black:  'bg-slate-800/80 border border-slate-600/30',
}

const logMeta: Record<string, { label: string; sign: string; color: string; dot: string }> = {
  ADD_TO_CDI:           { label: 'Aporte CDI',             sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400' },
  WITHDRAW_REQUEST:     { label: 'Saque Solicitado',        sign: '-', color: 'text-amber-400',   dot: 'bg-amber-500/10 text-amber-400' },
  WITHDRAW_APPROVED:    { label: 'Saque Aprovado',          sign: '-', color: 'text-blue-400',    dot: 'bg-blue-500/10 text-blue-400' },
  WITHDRAW_DENIED:      { label: 'Saque Negado',            sign: '+', color: 'text-red-400',     dot: 'bg-red-500/10 text-red-400' },
  CDI_CREDIT:           { label: 'Rendimento CDI',          sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400' },
  CDI_WITHDRAW:         { label: 'Resgate CDI',             sign: '-', color: 'text-amber-400',   dot: 'bg-amber-500/10 text-amber-400' },
  CDI_LOCK_SET:         { label: 'Título CDI Criado',       sign: '',  color: 'text-purple-400',  dot: 'bg-purple-500/10 text-purple-400' },
  CDI_EARLY_REQUEST:    { label: 'Resgate Ant. Solicitado', sign: '',  color: 'text-amber-400',   dot: 'bg-amber-500/10 text-amber-400' },
  CDI_EARLY_APPROVED:   { label: 'Resgate Ant. Aprovado',   sign: '+', color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400' },
  CDI_EARLY_DENIED:     { label: 'Resgate Ant. Negado',     sign: '',  color: 'text-red-400',     dot: 'bg-red-500/10 text-red-400' },
  ANTECIPACAO_REQUEST:  { label: 'Antecipação',             sign: '+', color: 'text-blue-400',    dot: 'bg-blue-500/10 text-blue-400' },
  KYC_APPROVED:         { label: 'KYC Aprovado',            sign: '',  color: 'text-emerald-400', dot: 'bg-emerald-500/10 text-emerald-400' },
  KYC_BLOCKED:          { label: 'KYC Bloqueado',           sign: '',  color: 'text-red-400',     dot: 'bg-red-500/10 text-red-400' },
  MERCHANT_CREATED:     { label: 'Conta Criada',            sign: '',  color: 'text-blue-400',    dot: 'bg-blue-500/10 text-blue-400' },
  CDI_RATE_UPDATED:     { label: 'Taxa CDI Atualizada',     sign: '',  color: 'text-purple-400',  dot: 'bg-purple-500/10 text-purple-400' },
  BALANCE_ADJUST:       { label: 'Ajuste de Saldo',         sign: '±', color: 'text-slate-300',   dot: 'bg-slate-700/40 text-slate-400' },
}

export default async function ClienteDashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Seller'

  const saldo         = merchant?.balance       ?? 0
  const pendente      = merchant?.pendingBalance ?? 0
  const cdiRate       = merchant?.cdiRate        ?? 1.0
  const rendimentoMes = saldo * (cdiRate / 100)
  const cdiAnual      = anualizarTaxa(cdiRate)
  const plano         = merchant?.plan ?? '—'

  const recentLogs = merchant
    ? await prisma.auditLog.findMany({
        where: { entityId: merchant.id, entity: 'Merchant' },
        orderBy: { createdAt: 'desc' },
        take: 8,
      })
    : []

  const cdiCreditLogs = merchant
    ? await prisma.auditLog.findMany({
        where: { entityId: merchant.id, action: 'CDI_CREDIT' },
        select: { metadata: true },
      })
    : []
  const totalCdiCredits = cdiCreditLogs.reduce((s, l) => {
    try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
  }, 0)

  const merchantStatus = merchant?.status ?? 'ACTIVE'

  return (
    <div>
      <Topbar
        title="Meu Dashboard"
        subtitle="Resumo da sua conta"
        breadcrumb={`Olá, ${firstName}`}
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* ── Status Alert ── */}
        {merchantStatus === 'REVIEW' && (
          <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-5 py-3.5 flex items-center gap-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-amber-400">Conta em revisão</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sua conta está em análise pela nossa equipe. Algumas operações podem estar temporariamente indisponíveis.</p>
            </div>
          </div>
        )}
        {merchantStatus === 'BLOCKED' && (
          <div className="bg-red-500/8 border border-red-500/25 rounded-xl px-5 py-3.5 flex items-center gap-3">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-red-400">Conta bloqueada</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sua conta foi bloqueada. Entre em contato com o suporte para regularizar sua situação.</p>
            </div>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Saldo Disponível */}
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5 hover:border-emerald-500/30 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Saldo Disponível</p>
            <p className="text-[22px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(pendente)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Disponível para saque ou aporte</p>
          </div>

          {/* Rendimento Acumulado CDI */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Rendimento Acumulado CDI</p>
            <p className="text-[22px] font-bold text-blue-400 tabular-nums leading-none">R$ {formatBRL(totalCdiCredits)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Total recebido em juros CDI</p>
          </div>

          {/* Rendimento Previsto */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 hover:bg-slate-800/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Rendimento Previsto</p>
            <p className="text-[22px] font-bold text-white tabular-nums leading-none">R$ {formatBRL(rendimentoMes)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Estimativa do mês · {cdiRate.toFixed(2)}%/mês</p>
          </div>

          {/* Plano Atual */}
          <div className={`rounded-2xl p-5 hover:opacity-90 transition-all ${planBg[plano] ?? 'bg-slate-900/60 border border-slate-800/70'}`}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Plano Atual</p>
            <p className={`text-[22px] font-bold leading-none ${planColors[plano] ?? 'text-white'}`}>{plano}</p>
            <p className="text-[10.5px] text-slate-600 mt-2">Taxa CDI: {cdiRate.toFixed(2)}% + R$ 0,29</p>
          </div>

        </section>

        {/* ── Saldo Pendente + CDI Simulação ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Saldo pendente + ações */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12.5px] font-semibold text-white">Saldo Disponível</p>
              <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Livre para movimentar</span>
            </div>
            <p className="text-[28px] font-bold text-emerald-400 tabular-nums leading-none">R$ {formatBRL(pendente)}</p>
            <p className="text-[10.5px] text-slate-600 mt-2 mb-5">Disponível para saque ou aporte no CDI</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cliente/saques" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Solicitar Saque
              </Link>
              <Link href="/cliente/cdi" className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-[12px] font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Ver CDI
              </Link>
            </div>
          </div>

          {/* CDI Simulação */}
          {saldo > 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800/60">
                <p className="text-[12.5px] font-semibold text-white">Simulação CDI</p>
                <p className="text-[10.5px] text-slate-600 mt-0.5">{cdiRate.toFixed(2)}%/mês · {cdiAnual.toFixed(2)}% a.a. (juros compostos)</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-slate-800/40">
                {[
                  { label: '1 mês',   meses: 1  },
                  { label: '3 meses', meses: 3  },
                  { label: '6 meses', meses: 6  },
                  { label: '12 meses', meses: 12 },
                ].map(({ label, meses }) => {
                  const rendimento = saldo * (Math.pow(1 + cdiRate / 100, meses) - 1)
                  const total = saldo + rendimento
                  return (
                    <div key={label} className="p-4">
                      <p className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{label}</p>
                      <p className="text-[14px] font-bold text-white tabular-nums">R$ {formatBRL(total)}</p>
                      <p className="text-[10.5px] text-emerald-400 mt-0.5 tabular-nums">+R$ {formatBRL(rendimento)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <svg className="w-10 h-10 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p className="text-[12.5px] font-medium text-slate-600">Sem saldo em CDI</p>
              <p className="text-[11px] text-slate-700 mt-1">Aporte no CDI para ver a simulação de rendimentos aqui.</p>
            </div>
          )}

        </section>

        {/* ── Últimas Movimentações ── */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">Últimas Movimentações</p>
              <p className="text-[10.5px] text-slate-600 mt-0.5">Histórico recente da sua conta</p>
            </div>
            <Link href="/cliente/transacoes" className="text-[11.5px] font-medium text-slate-500 hover:text-blue-400 transition-colors">
              Ver todas →
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-700">
              <svg className="w-9 h-9 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-[12.5px] font-medium">Nenhuma movimentação ainda</p>
              <p className="text-[11px] text-slate-800 mt-1">Suas operações aparecerão aqui.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {recentLogs.map((log) => {
                const meta   = logMeta[log.action] ?? { label: log.action, sign: '', color: 'text-slate-400', dot: 'bg-slate-800/60 text-slate-500' }
                let amount: number | null = null
                try {
                  const m = JSON.parse(log.metadata ?? '{}')
                  if (m.amount) amount = parseFloat(m.amount)
                } catch {}
                return (
                  <div key={log.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${meta.dot}`}>
                      {meta.sign || '•'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-slate-200">{meta.label}</p>
                      <p className="text-[10.5px] text-slate-600 mt-0.5">{formatDate(log.createdAt)}</p>
                    </div>
                    {amount !== null && (
                      <p className={`text-[13px] font-bold tabular-nums shrink-0 ${meta.color}`}>
                        {meta.sign === '-' ? '−' : meta.sign === '+' ? '+' : ''}R$ {formatBRL(amount)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
