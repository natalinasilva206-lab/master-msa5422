import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/apiKey'

// GET /api/v1/transactions
// Header: Authorization: Bearer <apiKey>
// Query:  merchantId=<id>  [limit=20]  [offset=0]  [type=VENDA|ESTORNO|REEMBOLSO]  [status=APROVADO|CANCELADO|PENDENTE]
export async function GET(req: NextRequest) {
  try {
    const apiKey     = req.headers.get('authorization')?.replace('Bearer ', '').trim()
    const merchantId = req.nextUrl.searchParams.get('merchantId')
    const typeFilter = req.nextUrl.searchParams.get('type')    ?? undefined
    const statusFilter = req.nextUrl.searchParams.get('status') ?? undefined
    const limit      = Math.min(parseInt(req.nextUrl.searchParams.get('limit')  ?? '20'), 100)
    const offset     = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key obrigatória. Use o header Authorization: Bearer <apiKey>.' }, { status: 401 })
    }
    if (!merchantId) {
      return NextResponse.json({ error: 'Query param merchantId obrigatório.' }, { status: 400 })
    }

    const merchant = await prisma.merchant.findUnique({
      where:  { id: merchantId },
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

    const where = {
      merchantId,
      ...(typeFilter   ? { type:   typeFilter   } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    }

    const [total, transactions] = await Promise.all([
      prisma.saleLog.count({ where }),
      prisma.saleLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take:    limit,
        skip:    offset,
        select: {
          id:          true,
          amount:      true,
          type:        true,
          status:      true,
          description: true,
          externalId:  true,
          createdAt:   true,
        },
      }),
    ])

    return NextResponse.json({
      data: transactions.map((t) => ({
        id:          t.id,
        amount:      t.amount,
        type:        t.type,
        status:      t.status,
        description: t.description ?? null,
        externalId:  t.externalId  ?? null,
        createdAt:   t.createdAt.toISOString(),
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (e: any) {
    console.error('[GET /api/v1/transactions]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
