export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import SellerTabs from '../SellerTabs'
import { KycActions } from '@/app/admin/kyc/KycActions'

type KycDoc = { type: string; label: string; url: string }

function parseDocs(raw: string | null): KycDoc[] {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') return { type: 'OTHER', label: 'Documento', url: item }
      return item as KycDoc
    })
  } catch { return [] }
}

interface PageProps {
  params: { id: string }
}

export default async function SellerKycPage({ params }: PageProps) {
  const merchantRaw = await prisma.merchant.findUnique({
    where: { id: params.id },
    include: { users: { select: { id: true, email: true, name: true }, take: 1 } },
  })
  if (!merchantRaw) notFound()
  const merchant = merchantRaw!

  const kycLogs = await prisma.auditLog.findMany({
    where: {
      entityId: merchant.id,
      action: { in: ['KYC_CALL_REQUESTED', 'KYC_ADJUSTMENT_REQUESTED', 'KYC_REJECTED', 'APPROVE_MERCHANT_KYC', 'BLOCK_MERCHANT_KYC', 'KYC_REACTIVATED', 'KYC_DOCUMENT_SUBMITTED', 'KYC_BANK_INFO_SAVED'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, entityId: true, action: true, createdAt: true, metadata: true, user: { select: { name: true } } },
  })

  const latestKycAction = kycLogs[0]?.action ?? null

  function deriveSubStatus(): string {
    if (merchant.status === 'ACTIVE') return 'APROVADO'
    if (merchant.status === 'BLOCKED') return 'REJEITADO'
    if (latestKycAction === 'KYC_CALL_REQUESTED') return 'AGUARDANDO_CALL'
    if (latestKycAction === 'KYC_ADJUSTMENT_REQUESTED') return 'AJUSTE_SOLICITADO'
    return 'EM_ANALISE'
  }

  const kycDocumentUrls = parseDocs((merchant as any).kycDocumentUrls ?? null)

  const merchantData = {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    document: merchant.document,
    type: merchant.type,
    status: merchant.status,
    plan: merchant.plan,
    balance: merchant.balance,
    pendingBalance: merchant.pendingBalance,
    cdiRate: merchant.cdiRate,
    createdAt: merchant.createdAt.toISOString(),
    kycSubStatus: deriveSubStatus(),
    userName: merchant.users[0]?.name ?? null,
    userEmail: merchant.users[0]?.email ?? null,
    kycDocumentUrls,
    kycNotes: (merchant as any).kycNotes ?? '',
    pixKey: (merchant as any).pixKey ?? null,
    pixKeyType: (merchant as any).pixKeyType ?? null,
    bankName: (merchant as any).bankName ?? null,
    auditHistory: kycLogs.map((l) => ({
      id: l.id,
      action: l.action,
      createdAt: l.createdAt.toISOString(),
      metadata: l.metadata,
      userName: l.user?.name ?? null,
    })),
  }

  const requiredTypes = ['IDENTITY', 'COMPANY', 'ADDRESS', 'SELFIE']
  const docsSubmitted = requiredTypes.filter((t) => kycDocumentUrls.some((d) => d.type === t)).length
  const hasPix = !!(merchant as any).pixKey

  const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    APROVADO:         { label: 'Aprovado',           color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/25' },
    REJEITADO:        { label: 'Rejeitado',           color: 'text-red-400',     bg: 'bg-red-500/5',     border: 'border-red-500/25' },
    EM_ANALISE:       { label: 'Em Análise',          color: 'text-amber-400',   bg: 'bg-amber-500/5',   border: 'border-amber-500/25' },
    AGUARDANDO_CALL:  { label: 'Aguardando Call',     color: 'text-blue-400',    bg: 'bg-blue-500/5',    border: 'border-blue-500/25' },
    AJUSTE_SOLICITADO:{ label: 'Ajuste Solicitado',   color: 'text-orange-400',  bg: 'bg-orange-500/5',  border: 'border-orange-500/25' },
  }
  const sm = STATUS_META[merchantData.kycSubStatus] ?? STATUS_META['EM_ANALISE']

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Verificação KYC" />

      <div className="p-4 xl:p-6 space-y-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">Clientes</Link>
          <span>/</span>
          <Link href={`/admin/clientes/${merchant.id}`} className="hover:text-white transition-colors">{merchant.name}</Link>
          <span>/</span>
          <span className="text-white">KYC</span>
        </nav>

        <SellerTabs merchantId={merchant.id} />

        {/* Status banner */}
        <div className={`${sm.bg} border ${sm.border} rounded-xl px-5 py-4 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <p className={`text-[13px] font-bold ${sm.color}`}>{sm.label}</p>
            <span className="text-[11px] text-slate-500">{merchant.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10.5px] text-slate-500">Docs obrigatórios</p>
              <p className={`text-[13px] font-bold tabular-nums ${docsSubmitted >= 4 ? 'text-emerald-400' : 'text-amber-400'}`}>{docsSubmitted}/4</p>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] text-slate-500">Dados bancários</p>
              <p className={`text-[12px] font-bold ${hasPix ? 'text-emerald-400' : 'text-slate-600'}`}>{hasPix ? 'Cadastrado' : 'Pendente'}</p>
            </div>
            <KycActions merchant={merchantData} />
          </div>
        </div>

        {/* Required docs checklist */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Documentos KYC</p>
          </div>
          <div className="p-4 space-y-2">
            {[
              { type: 'IDENTITY', label: 'Documento de Identidade', desc: 'RG ou CNH (frente e verso)' },
              { type: 'COMPANY',  label: 'Documentação da Empresa',  desc: 'Contrato Social, MEI ou Cartão CNPJ' },
              { type: 'ADDRESS',  label: 'Comprovante de Endereço',  desc: 'Conta de luz, água ou aluguel (últimos 3 meses)' },
              { type: 'SELFIE',   label: 'Selfie com Documento',     desc: 'Foto segurando RG/CNH ao lado do rosto' },
              { type: 'BANK',     label: 'Comprovante Bancário',     desc: 'Extrato ou confirmação de chave PIX (opcional)' },
            ].map(({ type, label, desc }) => {
              const doc = kycDocumentUrls.find((d) => d.type === type)
              return (
                <div key={type} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${doc ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-slate-800/40 border-slate-700/30'}`}>
                  {doc ? (
                    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12.5px] font-semibold ${doc ? 'text-slate-200' : 'text-slate-500'}`}>{label}</p>
                    <p className="text-[10.5px] text-slate-600">{desc}</p>
                    {doc && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10.5px] text-blue-400 hover:text-blue-300 font-mono truncate block max-w-[400px] mt-0.5">{doc.url}</a>
                    )}
                  </div>
                  {!doc && <span className="text-[10px] font-bold text-slate-700 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded-full shrink-0">Pendente</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bank / PIX */}
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Dados Bancários / PIX</p>
          </div>
          <div className="p-5">
            {hasPix ? (
              <div className="space-y-0 divide-y divide-slate-800/40">
                {[
                  { label: 'Tipo de chave', value: (merchant as any).pixKeyType ?? '—' },
                  { label: 'Chave PIX',     value: (merchant as any).pixKey ?? '—' },
                  { label: 'Banco',         value: (merchant as any).bankName ?? '—' },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-3">
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{r.label}</p>
                    <p className="text-[12.5px] text-slate-300 font-mono">{r.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-600 py-2">Seller ainda não cadastrou dados bancários.</p>
            )}
          </div>
        </div>

        {/* KYC Notes */}
        {(merchant as any).kycNotes && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-5 py-4">
            <p className="text-[10.5px] font-bold text-orange-500 uppercase tracking-widest mb-1.5">Última nota de ajuste enviada ao seller</p>
            <p className="text-[12px] text-slate-300 italic">"{(merchant as any).kycNotes}"</p>
          </div>
        )}

        {/* Audit history */}
        {kycLogs.length > 0 && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Histórico KYC</p>
            </div>
            <div className="divide-y divide-slate-800/40">
              {kycLogs.map((log) => {
                let noteMeta: string | null = null
                try { noteMeta = JSON.parse(log.metadata ?? '{}').note ?? null } catch {}
                const ACTION_LABELS: Record<string, string> = {
                  APPROVE_MERCHANT_KYC: 'KYC Aprovado', KYC_REJECTED: 'KYC Rejeitado',
                  KYC_CALL_REQUESTED: 'Call Solicitado', KYC_ADJUSTMENT_REQUESTED: 'Ajuste Solicitado',
                  KYC_REACTIVATED: 'Reativado para Análise', KYC_DOCUMENT_SUBMITTED: 'Documento enviado pelo seller',
                  KYC_BANK_INFO_SAVED: 'Dados bancários atualizados',
                }
                return (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-300">{ACTION_LABELS[log.action] ?? log.action}</p>
                      {noteMeta && <p className="text-[11px] text-slate-500 mt-0.5 italic">"{noteMeta}"</p>}
                      <p className="text-[10px] text-slate-700 mt-0.5">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                        {log.user?.name ? ` · ${log.user.name}` : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
