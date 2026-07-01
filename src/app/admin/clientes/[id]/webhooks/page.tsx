export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import SellerTabs from '../SellerTabs'
import { WebhookManager } from './WebhookManager'

interface PageProps { params: { id: string } }

export default async function WebhooksPage({ params }: PageProps) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: params.id },
    include: { webhookEndpoints: { orderBy: { createdAt: 'desc' } } },
  })

  if (!merchant) return notFound()

  return (
    <div>
      <Topbar
        title={merchant.name}
        breadcrumb="Clientes › Webhooks"
        subtitle="Endpoints de notificação assíncrona"
      />
      <div className="p-4 xl:p-6 space-y-4">
        <SellerTabs merchantId={params.id} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/70 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <p className="text-[13px] font-semibold text-white">Endpoints Configurados</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                {merchant.webhookEndpoints.length} endpoint{merchant.webhookEndpoints.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-4">
              <WebhookManager merchantId={params.id} endpoints={merchant.webhookEndpoints} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 space-y-3">
              <p className="text-[12px] font-semibold text-white">Como funciona</p>
              <div className="space-y-2 text-[11.5px] text-slate-500 leading-relaxed">
                <p>Quando um evento ocorre na plataforma, enviamos um <code className="text-blue-400 bg-blue-500/10 px-1 rounded">POST</code> para a URL configurada com o payload JSON do evento.</p>
                <p>O header <code className="text-blue-400 bg-blue-500/10 px-1 rounded">X-MasterPay-Signature</code> contém o HMAC-SHA256 do payload assinado com o secret do endpoint.</p>
                <p>Você deve validar a assinatura antes de processar o evento.</p>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-4 space-y-2">
              <p className="text-[12px] font-semibold text-white">Eventos Disponíveis</p>
              <div className="space-y-1 text-[11px]">
                {[
                  ['payment.approved',    'Pagamento aprovado via API'],
                  ['payment.refused',     'Pagamento recusado'],
                  ['refund.created',      'Reembolso criado'],
                  ['chargeback.opened',   'Chargeback aberto pelo ADM'],
                  ['med.opened',          'MED Pix aberto pelo ADM'],
                  ['dispute.updated',     'Disputa atualizada'],
                  ['balance.updated',     'Saldo do merchant alterado'],
                  ['withdrawal.created',  'Saque solicitado via API'],
                  ['withdrawal.paid',     'Saque aprovado e pago'],
                  ['withdrawal.rejected', 'Saque rejeitado'],
                  ['reserve.released',    'Reserva de risco liberada'],
                  ['cdi.credited',        'Rendimento CDI creditado'],
                  ['merchant.activated',  'Conta ativada'],
                  ['merchant.blocked',    'Conta bloqueada'],
                ].map(([evt, desc]) => (
                  <div key={evt} className="flex items-start gap-2">
                    <code className="text-blue-400 shrink-0">{evt}</code>
                    <span className="text-slate-600">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
