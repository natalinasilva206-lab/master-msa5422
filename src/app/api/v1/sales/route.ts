import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processSalePayment } from '@/lib/processSalePayment'
import { verifyApiKey } from '@/lib/apiKey'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

// POST /api/v1/sales
// Body: { merchantId, saleAmount, description?, externalId?, apiKey }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchantId, saleAmount, description, externalId, apiKey } = body

    if (!merchantId || typeof merchantId !== 'string') {
      return NextResponse.json({ error: 'merchantId obrigatório.' }, { status: 400 })
    }
    if (!saleAmount || typeof saleAmount !== 'number' || saleAmount <= 0) {
      return NextResponse.json({ error: 'saleAmount inválido.' }, { status: 400 })
    }
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'apiKey obrigatória.' }, { status: 401 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, apiKey: true, status: true, users: { select: { id: true }, take: 1 } },
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant não encontrado.' }, { status: 404 })
    }
    if (merchant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Merchant inativo ou bloqueado.' }, { status: 403 })
    }
    if (!merchant.apiKey || !verifyApiKey(apiKey, merchant.apiKey)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const triggeredBy = merchant.users[0]?.id ?? merchantId

    const result = await processSalePayment({
      merchantId,
      saleAmount,
      description,
      externalId,
      triggeredBy,
    })

    // Dispara webhook assincronamente (sem bloquear a resposta)
    dispatchWebhook(merchantId, 'sale.created', {
      saleLogId: result.saleLogId,
      amount: saleAmount,
      description,
      externalId,
    }).catch(() => {})

    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[POST /api/v1/sales]', e)
    return NextResponse.json({ error: e.message ?? 'Erro interno.' }, { status: 500 })
  }
}
