export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { SCORE_MAX, gerarSugestoes, type ScoreLevel, type ScoreStatus, type SugestaoCategoria, type SugestaoUrgencia } from '@/lib/masterScore'
import { RecalcSellerButton } from '../ScoreActions'
import AdminControls from './AdminControls'

// ─── Formatadores ─────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}
function fmtDateShort(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
}

// ─── Metadados visuais ────────────────────────────────────────────────────────

const levelMeta: Record<ScoreLevel, { color: string; bg: string; border: string; dot: string; glow: string }> = {
  Diamante: { color: 'text-cyan-300',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   dot: 'bg-cyan-400',   glow: 'shadow-cyan-500/10' },
  Ouro:     { color: 'text-amber-300',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400',  glow: 'shadow-amber-500/10' },
  Prata:    { color: 'text-slate-300',  bg: 'bg-slate-700/50',  border: 'border-slate-600/50',  dot: 'bg-slate-400',  glow: '' },
  Bronze:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', glow: 'shadow-orange-500/10' },
}
const statusMeta: Record<ScoreStatus, { color: string; bg: string; border: string; icon: string }> = {
  Premium:      { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  Saudável:     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  Atenção:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  'Alto risco': { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
}
const planDot: Record<string, string> = {
  Start: 'bg-slate-400', Growth: 'bg-blue-400', Prime: 'bg-purple-400', Black: 'bg-white',
}

// Cor da barra e texto baseada no score
function scoreColor(score: number) {
  if (score >= 80) return { bar: 'bg-cyan-400',    text: 'text-cyan-400',    ring: 'ring-cyan-500/20' }
  if (score >= 60) return { bar: 'bg-emerald-400', text: 'text-emerald-400', ring: 'ring-emerald-500/20' }
  if (score >= 40) return { bar: 'bg-amber-400',   text: 'text-amber-400',   ring: 'ring-amber-500/20' }
  return                  { bar: 'bg-red-400',      text: 'text-red-400',     ring: 'ring-red-500/20' }
}

// ─── Gerar motivos do score ───────────────────────────────────────────────────

interface Motivo {
  tipo:  'positivo' | 'negativo' | 'neutro'
  texto: string
}

function gerarMotivos(ms: any): Motivo[] {
  const m: Motivo[] = []

  // Chargeback
  if (ms.chargebackScore >= 25) m.push({ tipo: 'positivo', texto: 'Taxa de chargeback abaixo de 0,5% — excelente controle de disputas' })
  else if (ms.chargebackScore >= 18) m.push({ tipo: 'neutro',   texto: 'Taxa de chargeback entre 0,51% e 1% — dentro do aceitável, mas monitorar' })
  else if (ms.chargebackScore >= 10) m.push({ tipo: 'negativo', texto: 'Taxa de chargeback entre 1% e 2% — acima do ideal, requer atenção' })
  else                                m.push({ tipo: 'negativo', texto: 'Taxa de chargeback acima de 2% — crítico, risco elevado de bloqueio por adquirente' })

  // MED Pix
  if (ms.medScore >= 15)      m.push({ tipo: 'positivo', texto: 'Nenhum MED Pix no mês — operação Pix saudável' })
  else if (ms.medScore >= 10) m.push({ tipo: 'neutro',   texto: '1 MED Pix no mês — acompanhar próximos ciclos' })
  else if (ms.medScore >= 5)  m.push({ tipo: 'negativo', texto: '2 a 3 MEDs Pix no mês — volume de devoluções acima do esperado' })
  else                        m.push({ tipo: 'negativo', texto: 'Mais de 3 MEDs Pix — risco de bloqueio preventivo pelo Banco Central' })

  // Volume
  if (ms.volumeScore >= 20)     m.push({ tipo: 'positivo', texto: 'Volume mensal acima de R$ 100.000 — seller de alto desempenho' })
  else if (ms.volumeScore >= 15) m.push({ tipo: 'positivo', texto: 'Volume mensal entre R$ 50.000 e R$ 100.000 — crescimento consistente' })
  else if (ms.volumeScore >= 10) m.push({ tipo: 'neutro',   texto: 'Volume mensal entre R$ 10.000 e R$ 50.000 — há espaço para crescer' })
  else if (ms.volumeScore >= 5)  m.push({ tipo: 'neutro',   texto: 'Volume mensal abaixo de R$ 10.000 — fase inicial ou baixa atividade' })
  else                           m.push({ tipo: 'negativo', texto: 'Sem volume no período — seller inativo ou sem transações registradas' })

  // Reembolso
  if (ms.reembolsoScore >= 10)  m.push({ tipo: 'positivo', texto: 'Taxa de reembolso abaixo de 2% — índice de satisfação elevado' })
  else if (ms.reembolsoScore >= 6) m.push({ tipo: 'neutro', texto: 'Taxa de reembolso entre 2% e 5% — dentro do tolerável' })
  else if (ms.reembolsoScore >= 3) m.push({ tipo: 'negativo', texto: 'Taxa de reembolso entre 5% e 10% — investigar causas das devoluções' })
  else                             m.push({ tipo: 'negativo', texto: 'Taxa de reembolso acima de 10% — nível crítico de devoluções' })

  // Crescimento
  if (ms.crescimentoScore >= 10) m.push({ tipo: 'positivo', texto: 'Crescimento de volume acima de 10% em relação ao mês anterior' })
  else if (ms.crescimentoScore >= 5) m.push({ tipo: 'neutro', texto: 'Volume estável ou levemente positivo — operação regular' })
  else                               m.push({ tipo: 'negativo', texto: 'Queda de volume acima de 5% em relação ao mês anterior' })

  // Saldo
  if (ms.saldoScore >= 10)     m.push({ tipo: 'positivo', texto: 'Saldo alto (≥ R$ 20.000) — liquidez adequada para operações' })
  else if (ms.saldoScore >= 6) m.push({ tipo: 'neutro',   texto: 'Saldo médio — operação regular, sem excesso de exposição' })
  else if (ms.saldoScore >= 3) m.push({ tipo: 'neutro',   texto: 'Saldo baixo — acompanhar para evitar insuficiência em devoluções' })
  else                          m.push({ tipo: 'negativo', texto: 'Sem saldo — risco de não cobertura em caso de chargeback ou MED' })

  // Margem
  if (ms.margemScore >= 5)      m.push({ tipo: 'positivo', texto: 'Margem gerada para a plataforma está boa — seller rentável' })
  else if (ms.margemScore >= 3) m.push({ tipo: 'neutro',   texto: 'Margem gerada está em nível médio — rentabilidade regular' })
  else if (ms.margemScore >= 1) m.push({ tipo: 'neutro',   texto: 'Baixa margem gerada — seller pouco rentável para a plataforma' })
  else                          m.push({ tipo: 'negativo', texto: 'Sem margem gerada — seller sem atividade faturável no período' })

  // Tempo de conta
  if (ms.tempoContaScore >= 5)      m.push({ tipo: 'positivo', texto: 'Conta com mais de 90 dias — histórico suficiente para análise confiável' })
  else if (ms.tempoContaScore >= 3) m.push({ tipo: 'neutro',   texto: 'Conta com 30 a 90 dias — histórico ainda em formação' })
  else                              m.push({ tipo: 'neutro',   texto: 'Conta com menos de 30 dias — score com base em histórico limitado' })

  return m
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface Props { params: { merchantId: string } }

export default async function MasterScoreDetalhe({ params }: Props) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') redirect('/cliente/dashboard')

  const merchant = await prisma.merchant.findUnique({
    where: { id: params.merchantId },
    select: {
      id: true, name: true, plan: true, status: true, type: true,
      balance: true, pendingBalance: true, reservedBalance: true,
      riskReservePercent: true, riskReleaseDays: true,
      createdAt: true,
      masterScore: {
        include: { audits: { orderBy: { createdAt: 'desc' }, take: 50 } },
      },
    },
  })

  if (!merchant) notFound()

  const ms = merchant.masterScore

  // Dados brutos complementares (para mostrar valores reais no painel)
  const now      = new Date()
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const since60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const [
    vendas30d,
    vendas60_30d,
    cbCount,
    medCount,
    reembCount,
    histScores,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityId: merchant.id, action: 'BALANCE_ADJUST', createdAt: { gte: since30d } },
      select: { metadata: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { entityId: merchant.id, action: 'BALANCE_ADJUST', createdAt: { gte: since60d, lt: since30d } },
      select: { metadata: true },
    }),
    prisma.auditLog.count({
      where: { entityId: merchant.id, action: { in: ['CHARGEBACK_OPENED', 'DISPUTE_OPENED'] }, createdAt: { gte: since30d } },
    }),
    prisma.auditLog.count({
      where: { entityId: merchant.id, action: { in: ['MED_PIX_REQUEST', 'FRAUD_FLAG', 'ANTIFRAUDE_FLAG'] }, createdAt: { gte: since30d } },
    }),
    prisma.auditLog.count({
      where: { entityId: merchant.id, action: { in: ['WITHDRAW_DENIED', 'ESTORNO', 'REEMBOLSO'] }, createdAt: { gte: since30d } },
    }),
    // Histórico de scores: buscar os últimos 10 audit logs de MASTER_SCORE_UPDATED (se existir) ou apenas o atual
    prisma.auditLog.findMany({
      where: { entityId: merchant.id, action: 'MASTER_SCORE_UPDATED' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { metadata: true, createdAt: true },
    }),
  ])

  function sumAmt(logs: { metadata: string | null }[]) {
    return logs.reduce((s, l) => {
      try { return s + parseFloat(JSON.parse(l.metadata ?? '{}').amount || 0) } catch { return s }
    }, 0)
  }

  const volumeMensal      = sumAmt(vendas30d)
  const volumeMesAnterior = sumAmt(vendas60_30d)
  const totalVendas       = vendas30d.length || 1
  const taxaCb            = totalVendas > 0 ? (cbCount / totalVendas) * 100 : 0
  const taxaReemb         = totalVendas > 0 ? (reembCount / totalVendas) * 100 : 0
  const saldoMedio        = (merchant.balance + merchant.pendingBalance) / 2
  const crescimento       = volumeMesAnterior > 0
    ? ((volumeMensal - volumeMesAnterior) / volumeMesAnterior) * 100
    : null
  const diasConta         = Math.floor((now.getTime() - new Date(merchant.createdAt).getTime()) / 86400000)

  // Histórico de evolução do score (pontos no tempo a partir de audit logs)
  const evolucao: { data: string; score: number }[] = histScores
    .map((l: any) => {
      try {
        const m = JSON.parse(l.metadata ?? '{}')
        return { data: fmtDateShort(l.createdAt), score: Math.round(m.scoreTotal ?? 0) }
      } catch { return null }
    })
    .filter(Boolean)
    .reverse() as { data: string; score: number }[]

  // Adicionar score atual como ponto mais recente
  if (ms) {
    evolucao.push({ data: fmtDateShort(ms.dataUltimaAtualizacao), score: Math.round(ms.scoreTotal) })
  }

  const score  = ms ? Math.round(ms.scoreTotal) : 0
  const level  = (ms?.nivelScore  ?? 'Bronze')     as ScoreLevel
  const status = (ms?.statusRisco ?? 'Alto risco') as ScoreStatus
  const lm     = levelMeta[level]
  const sm     = statusMeta[status]
  const sc     = scoreColor(score)
  const motivos   = ms ? gerarMotivos(ms) : []
  const sugestoes = ms ? gerarSugestoes(ms as any) : []

  // Dimensões para o breakdown
  const dimensoes = [
    { key: 'volumeScore',      label: 'Volume Mensal',     max: SCORE_MAX.volume,      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4' },
    { key: 'chargebackScore',  label: 'Chargeback',        max: SCORE_MAX.chargeback,  icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { key: 'medScore',         label: 'MED Pix',           max: SCORE_MAX.med,         icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
    { key: 'reembolsoScore',   label: 'Reembolso',         max: SCORE_MAX.reembolso,   icon: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' },
    { key: 'saldoScore',       label: 'Saldo Médio',       max: SCORE_MAX.saldo,       icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'crescimentoScore', label: 'Crescimento',       max: SCORE_MAX.crescimento, icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { key: 'tempoContaScore',  label: 'Tempo de Conta',    max: SCORE_MAX.tempoConta,  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { key: 'margemScore',      label: 'Margem Plataforma', max: SCORE_MAX.margem,      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ]

  return (
    <div>
      <Topbar
        title={merchant.name}
        breadcrumb={<span>
          <Link href="/admin/master-score" className="hover:text-slate-300 transition-colors">Master Score</Link>
          {' '}›{' '}{merchant.name}
        </span> as any}
        subtitle={`Detalhes do score · Plano ${merchant.plan} · Conta criada em ${fmtDateShort(merchant.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <RecalcSellerButton merchantId={merchant.id} />
            <Link
              href={`/admin/clientes/${merchant.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-700/40 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver empresa
            </Link>
          </div>
        }
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* ── Hero card de score ── */}
        <div className={`bg-slate-900/70 border ${lm.border} rounded-xl p-5 ring-1 ${lm.glow ? `ring-1 shadow-lg ${lm.glow}` : 'ring-slate-800/30'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">

            {/* Score gauge */}
            <div className="flex flex-col items-center justify-center shrink-0">
              <div className={`relative w-28 h-28 rounded-full bg-slate-800/60 border-4 ${lm.border} flex items-center justify-center`}>
                <div className="text-center">
                  <p className={`text-[32px] font-black tabular-nums leading-none ${sc.text}`}>{score}</p>
                  <p className="text-[10px] text-slate-600 font-semibold mt-0.5">/ 100</p>
                </div>
                {/* Anel de progresso via gradiente border */}
              </div>
              <div className="mt-3 w-28">
                <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${sc.bar} transition-all`} style={{ width: `${score}%` }} />
                </div>
              </div>
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${lm.dot}`} />
                  <span className={`text-[22px] font-bold ${lm.color}`}>{level}</span>
                </div>
                <span className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${sm.color} ${sm.bg} ${sm.border}`}>
                  {status}
                </span>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${planDot[merchant.plan] ? '' : ''} bg-slate-800/60 border-slate-700/40 text-slate-400`}>
                  Plano {merchant.plan}
                </span>
              </div>

              <p className="text-[13px] text-slate-400 leading-relaxed max-w-xl">
                {ms?.observacaoInterna ?? 'Score ainda não calculado. Clique em Recalcular para gerar a nota.'}
              </p>

              {ms && (
                <p className="text-[11px] text-slate-700 mt-2">
                  Última atualização: {fmtDate(ms.dataUltimaAtualizacao)}
                </p>
              )}
            </div>

            {/* Score range */}
            <div className="shrink-0 hidden lg:flex flex-col gap-1.5 text-right">
              {([
                { range: '80–100', lv: 'Diamante' as ScoreLevel },
                { range: '60–79',  lv: 'Ouro'     as ScoreLevel },
                { range: '40–59',  lv: 'Prata'    as ScoreLevel },
                { range: '0–39',   lv: 'Bronze'   as ScoreLevel },
              ]).map(({ range, lv }) => (
                <div key={lv} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${lv === level ? `${levelMeta[lv].bg} ${levelMeta[lv].border}` : 'border-transparent opacity-30'}`}>
                  <span className={`w-2 h-2 rounded-full ${levelMeta[lv].dot}`} />
                  <span className={`text-[12px] font-semibold ${levelMeta[lv].color}`}>{lv}</span>
                  <span className="text-[11px] text-slate-600">{range} pts</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── Grid de métricas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Volume Mensal',
              value: `R$ ${fmtBRL(volumeMensal)}`,
              sub: 'últimos 30 dias',
              color: 'text-blue-400',
              border: 'border-blue-500/15',
            },
            {
              label: 'Taxa de Chargeback',
              value: `${taxaCb.toFixed(2)}%`,
              sub: `${cbCount} chargeback${cbCount !== 1 ? 's' : ''} / ${vendas30d.length} vendas`,
              color: taxaCb >= 2 ? 'text-red-400' : taxaCb >= 1 ? 'text-amber-400' : 'text-emerald-400',
              border: taxaCb >= 1 ? 'border-red-500/20' : 'border-slate-800/70',
            },
            {
              label: 'MED Pix (mês)',
              value: String(medCount),
              sub: medCount === 0 ? 'Nenhum registro' : `MED${medCount !== 1 ? 's' : ''} no período`,
              color: medCount >= 3 ? 'text-red-400' : medCount >= 1 ? 'text-amber-400' : 'text-emerald-400',
              border: medCount >= 3 ? 'border-red-500/20' : 'border-slate-800/70',
            },
            {
              label: 'Taxa de Reembolso',
              value: `${taxaReemb.toFixed(2)}%`,
              sub: `${reembCount} reembolso${reembCount !== 1 ? 's' : ''} / ${vendas30d.length} vendas`,
              color: taxaReemb >= 10 ? 'text-red-400' : taxaReemb >= 5 ? 'text-amber-400' : 'text-emerald-400',
              border: taxaReemb >= 5 ? 'border-amber-500/20' : 'border-slate-800/70',
            },
            {
              label: 'Saldo Médio',
              value: `R$ ${fmtBRL(saldoMedio)}`,
              sub: `Disp. R$ ${fmtBRL(merchant.pendingBalance)} · CDI R$ ${fmtBRL(merchant.balance)}`,
              color: 'text-slate-200',
              border: 'border-slate-800/70',
            },
            {
              label: 'Crescimento Mensal',
              value: crescimento !== null ? `${crescimento >= 0 ? '+' : ''}${crescimento.toFixed(1)}%` : '—',
              sub: crescimento !== null
                ? `Mês ant.: R$ ${fmtBRL(volumeMesAnterior)}`
                : 'Sem histórico anterior',
              color: crescimento === null ? 'text-slate-500'
                : crescimento >= 10 ? 'text-emerald-400'
                : crescimento >= 0  ? 'text-blue-400'
                : 'text-red-400',
              border: crescimento !== null && crescimento < -5 ? 'border-red-500/20' : 'border-slate-800/70',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Segunda linha de métricas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {[
            {
              label: 'Reserva Atual',
              value: `R$ ${fmtBRL(merchant.reservedBalance)}`,
              sub: `${merchant.riskReservePercent.toFixed(1)}% do volume retido`,
              color: 'text-purple-400',
              border: 'border-purple-500/15',
            },
            {
              label: 'Prazo de Liberação',
              value: `${merchant.riskReleaseDays} dias`,
              sub: 'prazo configurado de reserva',
              color: 'text-slate-300',
              border: 'border-slate-800/70',
            },
            {
              label: 'Tempo de Conta',
              value: `${diasConta} dias`,
              sub: `Desde ${fmtDateShort(merchant.createdAt)}`,
              color: diasConta >= 90 ? 'text-emerald-400' : diasConta >= 30 ? 'text-amber-400' : 'text-slate-400',
              border: 'border-slate-800/70',
            },
          ].map((c) => (
            <div key={c.label} className={`bg-slate-900/60 border ${c.border} rounded-xl p-4`}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">{c.label}</p>
              <p className={`text-[18px] font-bold tabular-nums leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[11px] text-slate-600 mt-1.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Composição da nota ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Breakdown visual */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Composição da Nota</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Pontos obtidos por dimensão · Total: {score}/100</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {dimensoes.map((d) => {
                const pts    = ms ? Math.round((ms as any)[d.key] ?? 0) : 0
                const pct    = d.max > 0 ? (pts / d.max) * 100 : 0
                const { bar, text } = scoreColor(pct)
                const isFull = pts === d.max
                const isEmpty = pts === 0

                return (
                  <div key={d.key} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={d.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[12px] font-semibold text-slate-300">{d.label}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[14px] font-bold tabular-nums ${text}`}>{pts}</span>
                          <span className="text-[11px] text-slate-700">/ {d.max}</span>
                          {isFull  && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">MAX</span>}
                          {isEmpty && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">ZERO</span>}
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-800/70 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: ms ? `${pct}%` : '0%' }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              {/* Total */}
              <div className="px-5 py-3.5 flex items-center justify-between bg-slate-800/20">
                <p className="text-[13px] font-bold text-white">Total</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-slate-800/80 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sc.bar}`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={`text-[16px] font-black tabular-nums ${sc.text}`}>{score}</span>
                  <span className="text-[12px] text-slate-600">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Motivos do score */}
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Motivos do Score</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">Fatores que influenciaram a nota atual</p>
            </div>
            {!ms ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-700">
                <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-[12px] font-medium">Score não calculado</p>
                <p className="text-[11px] text-slate-800 mt-1">Recalcule para ver os motivos.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {motivos.map((m, i) => {
                  const icon = m.tipo === 'positivo'
                    ? { d: 'M5 13l4 4L19 7', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                    : m.tipo === 'negativo'
                    ? { d: 'M6 18L18 6M6 6l12 12', color: 'text-red-400', bg: 'bg-red-500/10' }
                    : { d: 'M20 12H4', color: 'text-slate-400', bg: 'bg-slate-700/40' }
                  return (
                    <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-800/10 transition-colors">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${icon.bg}`}>
                        <svg className={`w-3 h-3 ${icon.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={icon.d} />
                        </svg>
                      </div>
                      <p className="text-[12px] text-slate-400 leading-relaxed">{m.texto}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

        {/* ── Sugestões do Sistema ── */}
        {sugestoes.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-white">Sugestões do Sistema</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Geradas automaticamente · O ADM decide se aplica ou ignora cada sugestão
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-700/40 bg-slate-800/60 text-slate-400">
                {sugestoes.length} sugestão{sugestoes.length !== 1 ? 'ões' : ''}
              </span>
            </div>
            <div className="divide-y divide-slate-800/40">
              {sugestoes.map((s) => {
                const urgenciaMeta = {
                  alta:  { dot: 'bg-red-400',    label: 'Alta',  labelCls: 'text-red-400 bg-red-500/10 border-red-500/20' },
                  media: { dot: 'bg-amber-400',  label: 'Média', labelCls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                  baixa: { dot: 'bg-slate-500',  label: 'Baixa', labelCls: 'text-slate-500 bg-slate-700/30 border-slate-600/30' },
                }[s.urgencia]

                const categoriaMetas: Record<SugestaoCategoria, { icon: string; label: string }> = {
                  reserva:       { label: 'Reserva',       icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                  prazo:         { label: 'Prazo',         icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                  beneficio:     { label: 'Benefício',     icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                  risco:         { label: 'Risco',         icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                  suporte:       { label: 'Suporte',       icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
                  monitoramento: { label: 'Monitoramento', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                }
                const categoriaMeta = categoriaMetas[s.categoria]

                return (
                  <div key={s.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-slate-800/10 transition-colors">
                    {/* Ícone da categoria */}
                    <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/40 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={categoriaMeta.icon} />
                      </svg>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-[12px] font-semibold text-slate-200">{s.titulo}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${urgenciaMeta.labelCls}`}>
                          {urgenciaMeta.label}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                          {categoriaMeta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{s.descricao}</p>
                    </div>

                    {/* Dot de urgência */}
                    <div className="flex items-center gap-1.5 shrink-0 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${urgenciaMeta.dot}`} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 border-t border-slate-800/50 bg-slate-900/30">
              <p className="text-[10.5px] text-slate-700">
                Estas sugestões são geradas automaticamente pelo Master Score e não alteram nenhuma configuração do seller. Cabe ao ADM avaliar e agir conforme necessário.
              </p>
            </div>
          </div>
        )}

        {/* ── Evolução do score ── */}
        {evolucao.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Evolução do Score</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">{evolucao.length} registro{evolucao.length !== 1 ? 's' : ''} de atualização</p>
            </div>
            <div className="px-5 py-4">
              {/* Mini timeline de pontos */}
              <div className="flex items-end gap-3 h-20">
                {evolucao.map((e, i) => {
                  const { bar, text } = scoreColor(e.score)
                  const h = Math.max(8, (e.score / 100) * 80)
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                      <span className={`text-[11px] font-bold tabular-nums ${text}`}>{e.score}</span>
                      <div className="w-full rounded-t-sm" style={{ height: `${h}px`, background: 'transparent' }}>
                        <div className={`w-full h-full rounded-t ${bar} opacity-80`} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-3 mt-1">
                {evolucao.map((e, i) => (
                  <div key={i} className="flex-1 min-w-0">
                    <p className="text-[9.5px] text-slate-700 truncate text-center">{e.data}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Controle Manual do ADM ── */}
        {ms && (
          <AdminControls
            merchantId={merchant.id}
            monitorado={ms.monitorado ?? false}
            estrategico={ms.estrategico ?? false}
            beneficioCongelado={ms.beneficioCongelado ?? false}
            nivelManual={ms.nivelManual ?? null}
            sugestaoStatus={(ms.sugestaoStatus ?? 'pendente') as any}
            observacaoInterna={ms.observacaoInterna ?? null}
          />
        )}

        {/* ── Auditoria de Ações Manuais ── */}
        {ms && (ms as any).audits && (ms as any).audits.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-white">Log de Ações Manuais</p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">Registro completo de intervenções do ADM neste seller</p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-slate-700/40 bg-slate-800/60 text-slate-400">
                {(ms as any).audits.length} registro{(ms as any).audits.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-slate-800/40">
              {((ms as any).audits as any[]).map((a: any) => {
                const acaoMeta: Record<string, { label: string; cls: string; icon: string }> = {
                  OBSERVACAO:            { label: 'Observação',        cls: 'text-slate-300 bg-slate-700/40 border-slate-600/30', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                  MONITORADO:            { label: 'Monitorado',        cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20',    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
                  ESTRATEGICO:           { label: 'Estratégico',       cls: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                  NIVEL_MANUAL:          { label: 'Nível Manual',      cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
                  SUGESTAO_IGNORADA:     { label: 'Sugestão Ignorada', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  icon: 'M6 18L18 6M6 6l12 12' },
                  SUGESTAO_APLICADA:     { label: 'Sugestão Aplicada', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: 'M5 13l4 4L19 7' },
                  BENEFICIO_CONGELADO:   { label: 'Benefício Congelado',  cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                  BENEFICIO_DESCONGELADO:{ label: 'Benefício Ativado',    cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                }
                const am = acaoMeta[a.acao] ?? { label: a.acao, cls: 'text-slate-400 bg-slate-700/40 border-slate-600/30', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }

                return (
                  <div key={a.id} className="px-5 py-3.5 hover:bg-slate-800/10 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Badge da ação */}
                      <div className="shrink-0 mt-0.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${am.cls}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={am.icon} />
                          </svg>
                          {am.label}
                        </span>
                      </div>
                      {/* Detalhe */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                          <p className="text-[12px] font-semibold text-slate-300">{a.adminName}</p>
                          <span className="text-[11px] text-slate-600">{a.adminEmail}</span>
                          <span className="text-[10.5px] text-slate-700 ml-auto">{fmtDate(a.createdAt)}</span>
                        </div>
                        {/* Antes → Depois */}
                        {(a.valorAntes !== null || a.valorDepois !== null) && (
                          <div className="flex items-center gap-2 mb-1.5">
                            {a.valorAntes !== null && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/15 text-red-400 line-through">
                                {a.valorAntes}
                              </span>
                            )}
                            {a.valorAntes !== null && a.valorDepois !== null && (
                              <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            )}
                            {a.valorDepois !== null && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
                                {a.valorDepois}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Motivo */}
                        <p className="text-[11px] text-slate-500 italic">&quot;{a.motivo}&quot;</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Score ainda não calculado ── */}
        {!ms && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-amber-400">Score não calculado para este seller</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Use o botão <strong className="text-slate-300">↺ Recalcular</strong> no topo da página para gerar o score inicial deste seller.
              </p>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-1">
          <Link
            href="/admin/master-score"
            className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao ranking
          </Link>
          <p className="text-[11px] text-slate-700">
            Score é informativo · Não bloqueia operações automaticamente
          </p>
        </div>

      </div>
    </div>
  )
}
