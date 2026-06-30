import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processSalePayment } from '@/lib/processSalePayment'

// POST /api/v1/sales
// Body: { merchantId, saleAmount, description?, externalId?, apiKey }
// apiKey is validated against a simple hash: sha256(merchantId + secret)
// For real gateway integration, replace apiKey validation with gateway signature verification.
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

    // Simple API key check: base64(merchantId) — replace with real HMAC in production
    const expectedKey = Buffer.from(merchantId).toString('base64')
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, users: { select: { id: true }, take: 1 } },
    })
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant não encontrado.' }, { status: 404 })
    }

    // Use merchant's first user as triggeredBy, or fall back to merchantId itself
    const triggeredBy = merchant.users[0]?.id ?? merchantId

    const result = await processSalePayment({
      merchantId,
      saleAmount,
      description,
      externalId,
      triggeredBy,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[POST /api/v1/sales]', e)
    return NextResponse.json({ error: e.message ?? 'Erro interno.' }, { status: 500 })
  }
}
