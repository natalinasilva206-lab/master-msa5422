export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { ToggleStatusButton } from './ToggleStatusButton'
import { CreateAccessForm } from './CreateAccessForm'
import { RiskPanel } from './risk/RiskPanel'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  REVIEW: 'Em análise',
}

const statusVariant: Record<string, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  BLOCKED: 'danger',
  REVIEW: 'warning',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-slate-700/40 last:border-0">
      <span className="text-slate-400 text-sm w-48 shrink-0">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export default async function ClienteDetalhesPage({ params }: PageProps) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: params.id },
    include: { users: { select: { id: true, email: true, name: true }, take: 1 } },
  })

  if (!merchant) {
    return (
      <div>
        <Topbar title="Cliente não encontrado" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Cliente não encontrado</p>
            <p className="text-slate-400 text-sm mt-1">O ID informado não corresponde a nenhum cliente cadastrado.</p>
          </div>
          <Link
            href="/admin/clientes"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para clientes
          </Link>
        </div>
      </div>
    )
  }

  // Fetch release schedule logs
  const futureLogs = await prisma.auditLog.findMany({
    where: { entityId: merchant.id, action: 'RISK_FUTURE_SET' },
    orderBy: { createdAt: 'desc' },
  })

  const releaseLogs = futureLogs
    .map((l) => {
      try {
        const m = JSON.parse(l.metadata ?? '{}')
        return { id: l.id, amount: parseFloat(m.amount || 0), releaseDate: m.releaseDate ?? '', reason: m.reason ?? '' }
      } catch { return null }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null && !!l.releaseDate)

  // Fetch risk audit history
  const riskLogs = await prisma.auditLog.findMany({
    where: {
      entityId: merchant.id,
      action: { in: ['RISK_RESERVE_SET', 'RISK_BLOCK_SET', 'RISK_FUTURE_SET', 'RISK_RELEASE'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const riskActionLabel: Record<string, string> = {
    RISK_RESERVE_SET: 'Reserva separada',
    RISK_BLOCK_SET:   'Saldo bloqueado',
    RISK_FUTURE_SET:  'Liberação agendada',
    RISK_RELEASE:     'Saldo liberado',
  }

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Detalhes do cliente" />

      <div className="p-6 space-y-6 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">Clientes</Link>
          <span>/</span>
          <span className="text-white">{merchant.name}</span>
        </nav>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/clientes"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
          <Link
            href={`/admin/clientes/${merchant.id}/editar`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Link>
          <ToggleStatusButton id={merchant.id} status={merchant.status} />
        </div>

        {/* ══ Saldos completos ══ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-white font-semibold text-[13.5px]">Saldos do Seller</h3>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">Visão Financeira Completa</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Disponível',        value: merchant.pendingBalance,  color: 'text-emerald-400', border: 'border-emerald-500/20', sub: 'livre para saque' },
              { label: 'Em CDI',            value: merchant.balance,         color: 'text-amber-400',   border: 'border-amber-500/20',   sub: 'rendendo juros' },
              { label: 'Saldo Reservado',   value: merchant.reservedBalance, color: 'text-amber-400',   border: 'border-amber-500/15',   sub: 'reserva de risco' },
              { label: 'Saldo Bloqueado',   value: merchant.blockedBalance,  color: 'text-red-400',     border: 'border-red-500/15',     sub: 'chargeback/MED' },
              { label: 'Liberação Futura',  value: merchant.futureBalance,   color: 'text-blue-400',    border: 'border-blue-500/15',    sub: 'agendado' },
            ].map((c) => (
              <div key={c.label} className={`bg-slate-800/50 border ${c.border} rounded-xl p-4`}>
                <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{c.label}</p>
                <p className={`text-[17px] font-bold tabular-nums leading-none ${c.color}`}>R$ {formatBRL(c.value)}</p>
                <p className="text-[9.5px] text-slate-600 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ Reserva Inteligente de Risco ══ */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Reserva Inteligente de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Gerencie reservas, bloqueios e liberações agendadas do seller</p>
            </div>
          </div>
          <div className="p-5">
            <RiskPanel
              merchantId={merchant.id}
              pendingBalance={merchant.pendingBalance}
              reservedBalance={merchant.reservedBalance}
              blockedBalance={merchant.blockedBalance}
              futureBalance={merchant.futureBalance}
              releaseLogs={releaseLogs}
            />
          </div>
        </div>

        {/* ══ Histórico de Ações de Risco ══ */}
        {riskLogs.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-700/40">
              <p className="text-[13px] font-semibold text-white">Histórico de Ações de Risco</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{riskLogs.length} ação{riskLogs.length !== 1 ? 'ões' : ''} registrada{riskLogs.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="divide-y divide-slate-700/30">
              {riskLogs.map((log) => {
                let meta: Record<string, string> = {}
                try { meta = JSON.parse(log.metadata ?? '{}') } catch {}
                const isRelease = log.action === 'RISK_RELEASE'
                return (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isRelease ? 'bg-emerald-500/10 text-emerald-400' : log.action === 'RISK_BLOCK_SET' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={isRelease ? 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z' : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-medium text-slate-200">{riskActionLabel[log.action] ?? log.action}</p>
                        {meta.reason && (
                          <span className="text-[10px] text-slate-600 truncate">· {meta.reason}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600">
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(log.createdAt))}
                        {meta.from && meta.to && <span className="ml-1.5 text-slate-700">{meta.from} → {meta.to}</span>}
                      </p>
                    </div>
                    {meta.amount && (
                      <p className={`text-[12.5px] font-bold tabular-nums shrink-0 ${isRelease ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isRelease ? '+' : '-'}R$ {formatBRL(parseFloat(meta.amount))}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main info card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-white font-semibold">Informações cadastrais</h2>
            <Badge variant={statusVariant[merchant.status] ?? 'neutral'}>
              {statusLabel[merchant.status] ?? merchant.status}
            </Badge>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="Nome" value={merchant.name} />
            <InfoRow label="E-mail" value={merchant.email} />
            <InfoRow label="Documento" value={<span className="font-mono">{merchant.document}</span>} />
            <InfoRow label="Tipo" value={typeLabel[merchant.type] ?? merchant.type} />
            <InfoRow label="Status" value={<Badge variant={statusVariant[merchant.status] ?? 'neutral'}>{statusLabel[merchant.status] ?? merchant.status}</Badge>} />
            <InfoRow label="Plano" value={<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">{merchant.plan}</span>} />
            <InfoRow label="Taxa CDI" value={<span className="text-emerald-400 font-mono">{merchant.cdiRate.toFixed(2)}%/mês</span>} />
            <InfoRow label="Criado em" value={new Date(merchant.createdAt).toLocaleString('pt-BR')} />
            <InfoRow label="ID" value={<span className="font-mono text-slate-500 text-xs">{merchant.id}</span>} />
          </div>
        </div>

        {/* Login access */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Acesso ao painel do seller</h2>
              <p className="text-xs text-slate-500 mt-0.5">Login para a área do seller em /cliente/dashboard</p>
            </div>
            {merchant.users.length > 0 ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Acesso ativo
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-500 bg-slate-700/40 border border-slate-600/30 px-2.5 py-1 rounded-full">Sem acesso</span>
            )}
          </div>
          <div className="px-6 py-5">
            {merchant.users.length > 0 ? (
              <div className="text-sm text-slate-400 space-y-1">
                <p><span className="text-slate-500">Login:</span> <span className="text-slate-200 font-mono">{merchant.users[0].email}</span></p>
                <p><span className="text-slate-500">Nome:</span> <span className="text-slate-200">{merchant.users[0].name}</span></p>
              </div>
            ) : (
              <CreateAccessForm merchantId={merchant.id} email={merchant.email} />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
