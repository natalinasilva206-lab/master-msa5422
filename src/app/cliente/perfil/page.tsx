export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { ChangePasswordForm } from './ChangePasswordForm'

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d))
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const statusMeta: Record<string, { label: string; color: string; bg: string; dot: string; desc: string }> = {
  ACTIVE:  { label: 'Ativa',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', desc: 'Conta verificada e operacional.' },
  REVIEW:  { label: 'Em revisão',  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400',   desc: 'KYC em análise pela equipe. Até 2 dias úteis.' },
  BLOCKED: { label: 'Bloqueada',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         dot: 'bg-red-400',     desc: 'Conta bloqueada. Entre em contato com o suporte.' },
}

const planColors: Record<string, string> = {
  Start:  'text-slate-300',
  Growth: 'text-blue-400',
  Prime:  'text-purple-400',
  Black:  'text-slate-100',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE:    'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
  SERVICOS:     'Prestador de Serviços',
  MARKETPLACE:  'Marketplace',
}

export default async function PerfilPage() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const status   = merchant?.status ?? 'REVIEW'
  const sm       = statusMeta[status] ?? statusMeta['REVIEW']

  const initials = (merchant?.name ?? user?.name ?? 'U')
    .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

  // Quick stats
  const [statsLogs, cdiCredits] = merchant
    ? await Promise.all([
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: { in: ['WITHDRAW_APPROVED', 'BALANCE_ADJUST', 'ADD_TO_CDI'] } },
          select: { action: true, metadata: true },
        }),
        prisma.auditLog.findMany({
          where: { entityId: merchant.id, action: 'CDI_CREDIT' },
          select: { metadata: true },
        }),
      ])
    : [[], []]

  function getAmt(metadata: string | null) {
    try { return parseFloat(JSON.parse(metadata ?? '{}').amount || 0) } catch { return 0 }
  }

  const totalSacado    = statsLogs.filter(l => l.action === 'WITHDRAW_APPROVED').reduce((s, l) => s + getAmt(l.metadata), 0)
  const totalRecebido  = statsLogs.filter(l => l.action === 'BALANCE_ADJUST').reduce((s, l) => s + getAmt(l.metadata), 0)
  const totalAportado  = statsLogs.filter(l => l.action === 'ADD_TO_CDI').reduce((s, l) => s + getAmt(l.metadata), 0)
  const totalRendido   = cdiCredits.reduce((s, l) => s + getAmt(l.metadata), 0)
  const diasAtivo      = merchant ? Math.floor((Date.now() - new Date(merchant.createdAt).getTime()) / 86400000) : 0

  return (
    <div>
      <Topbar showNotifications
        title="Meu Perfil"
        breadcrumb="Minha Conta"
        subtitle="Dados cadastrais e informações da sua conta"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Quick stats */}
        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-0.5">
            Estatísticas · histórico completo desde o cadastro
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              { label: 'Dias Ativo',       value: String(diasAtivo),                 color: 'text-slate-300',   sub: 'na plataforma' },
              { label: 'Total Recebido',   value: `R$ ${formatBRL(totalRecebido)}`,  color: 'text-emerald-400', sub: 'em vendas (lifetime)' },
              { label: 'Total Aportado',   value: `R$ ${formatBRL(totalAportado)}`,  color: 'text-amber-400',   sub: 'no CDI (lifetime)' },
              { label: 'Rendimento CDI',   value: `R$ ${formatBRL(totalRendido)}`,   color: 'text-blue-400',    sub: 'acumulado (lifetime)' },
              { label: 'Total Sacado',     value: `R$ ${formatBRL(totalSacado)}`,    color: 'text-purple-400',  sub: 'aprovado (lifetime)' },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{s.label}</p>
                <p className={`text-[20px] font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[12px] text-slate-600 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Avatar + status */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-[20px] font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-bold text-white truncate">{merchant?.name ?? user?.name ?? '—'}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">{merchant?.email ?? user?.email ?? '—'}</p>
          </div>
          <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${sm.bg} ${sm.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
            {sm.label}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Dados da empresa */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Dados da Empresa</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {[
                { label: 'Razão Social / Nome',  value: merchant?.name     ?? '—' },
                { label: 'CNPJ / CPF',           value: merchant?.document ?? '—' },
                { label: 'E-mail',               value: merchant?.email    ?? user?.email ?? '—' },
                { label: 'Tipo de negócio',      value: typeLabel[merchant?.type ?? ''] ?? merchant?.type ?? '—' },
                { label: 'Membro desde',         value: merchant ? formatDate(merchant.createdAt) : '—' },
              ].map((row) => (
                <div key={row.label} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide shrink-0">{row.label}</p>
                  <p className="text-[12.5px] text-slate-300 text-right truncate">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Plano e saldos */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Plano e Saldos</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {[
                {
                  label: 'Plano atual',
                  value: merchant?.plan ?? '—',
                  valueClass: planColors[merchant?.plan ?? ''] ?? 'text-slate-300',
                },
                {
                  label: 'Taxa CDI/mês',
                  value: merchant ? `${merchant.cdiRate.toFixed(2)}%` : '—',
                  valueClass: 'text-emerald-400',
                },
                {
                  label: 'Saldo disponível',
                  value: merchant ? `R$ ${formatBRL(merchant.pendingBalance)}` : '—',
                  valueClass: 'text-emerald-400',
                },
                {
                  label: 'Saldo em CDI',
                  value: merchant ? `R$ ${formatBRL(merchant.balance)}` : '—',
                  valueClass: 'text-amber-400',
                },
                {
                  label: 'Status KYC',
                  value: sm.label,
                  valueClass: sm.color,
                },
              ].map((row) => (
                <div key={row.label} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide shrink-0">{row.label}</p>
                  <p className={`text-[12.5px] font-bold text-right ${row.valueClass}`}>{row.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Acesso */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Acesso à Plataforma</p>
          </div>
          <div className="divide-y divide-slate-800/40">
            {[
              { label: 'Nome de usuário', value: user?.name  ?? '—' },
              { label: 'E-mail de login', value: user?.email ?? '—' },
              { label: 'Perfil de acesso', value: user?.role === 'ADMIN' ? 'Administrador' : 'Seller' },
            ].map((row) => (
              <div key={row.label} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide shrink-0">{row.label}</p>
                <p className="text-[12.5px] text-slate-300 text-right">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status info */}
        {status !== 'ACTIVE' && (
          <div className={`border rounded-xl px-5 py-4 flex items-start gap-3 ${sm.bg}`}>
            <svg className={`w-4 h-4 mt-0.5 shrink-0 ${sm.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className={`text-[12px] font-semibold ${sm.color}`}>Conta {sm.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{sm.desc}</p>
            </div>
          </div>
        )}

        <ChangePasswordForm />

      </div>
    </div>
  )
}
