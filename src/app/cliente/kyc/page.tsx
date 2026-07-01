export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Topbar } from '@/components/layout/Topbar'
import { SubmitDocForm } from './SubmitDocForm'
import { BankInfoForm } from './BankInfoForm'
import type { KycDoc } from './actions'

function parseDocs(raw: string | null): KycDoc[] {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') return { type: 'OTHER', label: 'Documento', url: item }
      return item as KycDoc
    })
  } catch { return [] }
}

const STATUS_META: Record<string, { label: string; sub: string; bg: string; border: string; icon: string; iconColor: string; step: number }> = {
  ACTIVE: {
    label: 'KYC Aprovado',
    sub: 'Sua identidade e empresa foram verificadas. Conta ativa para operações.',
    bg: 'bg-emerald-500/5', border: 'border-emerald-500/25', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', iconColor: 'text-emerald-400', step: 3,
  },
  BLOCKED: {
    label: 'Conta Bloqueada',
    sub: 'Seu cadastro foi bloqueado. Entre em contato com o suporte para mais informações.',
    bg: 'bg-red-500/5', border: 'border-red-500/25', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', iconColor: 'text-red-400', step: -1,
  },
  REVIEW: {
    label: 'Em Análise',
    sub: 'Nossa equipe está analisando sua documentação. Prazo: até 2 dias úteis.',
    bg: 'bg-amber-500/5', border: 'border-amber-500/25', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', iconColor: 'text-amber-400', step: 2,
  },
}

const STEPS = [
  { label: 'Dados enviados', desc: 'Cadastro iniciado' },
  { label: 'Em análise', desc: 'Nossa equipe revisa' },
  { label: 'Conta ativa', desc: 'Operações liberadas' },
]

export default async function ClienteKycPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
    : null

  const merchant = user?.merchant
  const status = merchant?.status ?? 'REVIEW'
  const kycNotes = (merchant as any)?.kycNotes ?? ''
  const pixKey = (merchant as any)?.pixKey ?? null
  const pixKeyType = (merchant as any)?.pixKeyType ?? null
  const bankName = (merchant as any)?.bankName ?? null

  const docs = parseDocs((merchant as any)?.kycDocumentUrls ?? null)

  const lastAdjustLog = merchant
    ? await prisma.auditLog.findFirst({
        where: { entityId: merchant.id, action: 'KYC_ADJUSTMENT_REQUESTED' },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true, createdAt: true },
      })
    : null

  const adjustNote = lastAdjustLog
    ? (() => { try { return JSON.parse(lastAdjustLog.metadata ?? '{}').note ?? null } catch { return null } })()
    : null

  const isAdjustmentPending = status === 'REVIEW' && adjustNote
  const sm = STATUS_META[status] ?? STATUS_META['REVIEW']
  const isActive = status === 'ACTIVE'
  const isBlocked = status === 'BLOCKED'

  const totalRequired = 4
  const submittedRequired = docs.filter((d) => ['IDENTITY', 'COMPANY', 'ADDRESS', 'SELFIE'].includes(d.type)).length
  const docsComplete = submittedRequired >= totalRequired

  return (
    <div>
      <Topbar
        title="Verificação KYC"
        breadcrumb="Minha Conta"
        subtitle="Documentação obrigatória para operar como gateway de pagamento"
      />

      <div className="p-4 xl:p-6 space-y-4">

        {/* Status banner */}
        <div className={`${sm.bg} border ${sm.border} rounded-xl px-5 py-4 flex items-start gap-3`}>
          <svg className={`w-5 h-5 ${sm.iconColor} shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d={sm.icon} />
          </svg>
          <div>
            <p className={`text-[13px] font-bold ${sm.iconColor}`}>{sm.label}</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">{sm.sub}</p>
          </div>
        </div>

        {/* Adjustment feedback from admin */}
        {isAdjustmentPending && (adjustNote || kycNotes) && (
          <div className="bg-orange-500/5 border border-orange-500/25 rounded-xl px-5 py-4 flex items-start gap-3">
            <svg className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-[12px] font-bold text-orange-400">Ajuste solicitado pela equipe</p>
              <p className="text-[11.5px] text-slate-300 mt-1 italic">"{adjustNote || kycNotes}"</p>
              <p className="text-[10px] text-slate-600 mt-1">
                Por favor, atualize os documentos indicados e aguarde nova análise.
              </p>
            </div>
          </div>
        )}

        {/* Progress stepper */}
        {!isBlocked && (
          <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-4">
            <div className="flex items-center gap-0">
              {STEPS.map((step, i) => {
                const done = i < sm.step
                const active = i === sm.step - 1 || (isActive && i === 2)
                return (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                        isActive && i === 2
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : done || active
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-600'
                      }`}>
                        {(isActive && i === 2) || done ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (i + 1)}
                      </div>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1.5 text-center whitespace-nowrap">{step.label}</p>
                      <p className="text-[9px] text-slate-700 text-center">{step.desc}</p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded-full ${done ? 'bg-blue-600' : 'bg-slate-800'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Document progress indicator */}
        {!isActive && !isBlocked && (
          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/70 rounded-xl px-5 py-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-semibold text-slate-400">Documentos obrigatórios enviados</p>
                <p className="text-[11px] font-bold text-white">{submittedRequired}/{totalRequired}</p>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${docsComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${(submittedRequired / totalRequired) * 100}%` }}
                />
              </div>
            </div>
            {docsComplete && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full shrink-0">Completo</span>
            )}
          </div>
        )}

        {/* Documents section */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Documentos KYC</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Envie links do Google Drive, Dropbox ou qualquer URL pública. Certifique-se de que os arquivos estão acessíveis para a equipe de análise.
            </p>
          </div>
          <div className="p-4">
            <SubmitDocForm existingDocs={docs} disabled={isActive || isBlocked} />
          </div>
          {isActive && (
            <div className="px-5 pb-4">
              <p className="text-[10.5px] text-slate-700 text-center">Documentos bloqueados para edição após aprovação. Contate o suporte para alterações.</p>
            </div>
          )}
        </section>

        {/* Bank/PIX section */}
        <section className="bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800/60">
            <p className="text-[13px] font-semibold text-white">Dados Bancários para Saques</p>
            <p className="text-[10.5px] text-slate-500 mt-0.5">
              Chave PIX verificada associada à conta da empresa — usada para liberação de saques aprovados.
            </p>
          </div>
          <div className="p-4">
            <BankInfoForm
              currentPixKey={pixKey}
              currentPixKeyType={pixKeyType}
              currentBankName={bankName}
              disabled={false}
            />
          </div>
        </section>

        {/* Info box */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-5 py-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-blue-400">Como funciona o KYC do Master Pagamentos?</p>
            <p className="text-[11px] text-slate-500">
              O processo de verificação segue as normas de prevenção à lavagem de dinheiro (PLD/FT) e é obrigatório para todos os sellers. Os documentos são analisados pela nossa equipe em até 2 dias úteis. Informações incorretas ou documentos ilegíveis resultam em reprovação.
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Dúvidas? Acesse{' '}
              <a href="/cliente/suporte" className="text-blue-400 hover:underline">Central de Suporte</a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
