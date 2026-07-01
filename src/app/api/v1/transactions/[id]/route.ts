import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/apiKey'

// GET /api/v1/transactions/:id
// Header: Authorization: Bearer <apiKey>
// Query:  merchantId=<id>
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const saleId = params.id
    if (!saleId) {
      return NextResponse.json({ error: 'ID da transação obrigatório.' }, { status: 400 })
    }

    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '').trim()
    const merchantId = req.nextUrl.searchParams.get('merchantId')

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key obrigatória. Use o header Authorization: Bearer <apiKey>.' }, { status: 401 })
    }
    if (!merchantId) {
      return NextResponse.json({ error: 'Query param merchantId obrigatório.' }, { status: 400 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, apiKey: true, status: true },
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant não encontrado.' }, { status: 404 })
    }
    if (!merchant.apiKey || !verifyApiKey(apiKey, merchant.apiKey)) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
    if (merchant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Merchant inativo ou bloqueado.' }, { status: 403 })
    }

    const sale = await prisma.saleLog.findFirst({
      where: { id: saleId, merchantId },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        description: true,
        externalId: true,
        createdAt: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ error: 'Transação não encontrada.' }, { status: 404 })
    }

    return NextResponse.json({
      id: sale.id,
      amount: sale.amount,
      type: sale.type,
      status: sale.status,
      description: sale.description ?? null,
      externalId: sale.externalId ?? null,
      createdAt: sale.createdAt.toISOString(),
    })
  } catch (e: any) {
    console.error('[GET /api/v1/transactions/:id]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
