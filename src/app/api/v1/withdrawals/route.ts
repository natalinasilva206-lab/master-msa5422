import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/apiKey'
import { dispatchWebhook } from '@/lib/dispatchWebhook'

// GET /api/v1/withdrawals
// Header: Authorization: Bearer <apiKey>
// Query:  merchantId=<id>  [limit=20]  [offset=0]
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '').trim()
    const merchantId = req.nextUrl.searchParams.get('merchantId')
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 100)
    const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')

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

    const logs = await prisma.auditLog.findMany({
      where: {
        entityId: merchantId,
        action: { in: ['WITHDRAW_REQUEST', 'WITHDRAW_APPROVED', 'WITHDRAW_DENIED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: { id: true, action: true, metadata: true, createdAt: true },
    })

    const withdrawals = logs.map((l) => {
      let meta: Record<string, unknown> = {}
      try { meta = JSON.parse(l.metadata ?? '{}') } catch {}
      return {
        id: l.id,
        action: l.action,
        amount: meta.amount ?? null,
        pixKey: meta.pixKey ?? null,
        pixKeyType: meta.pixKeyType ?? null,
        status: l.action === 'WITHDRAW_REQUEST'
          ? (meta.resolved ? (meta.approve ? 'APROVADO' : 'NEGADO') : 'PENDENTE')
          : l.action === 'WITHDRAW_APPROVED' ? 'APROVADO' : 'NEGADO',
        createdAt: l.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ data: withdrawals, limit, offset, count: withdrawals.length })
  } catch (e: any) {
    console.error('[GET /api/v1/withdrawals]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// POST /api/v1/withdrawals
// Header: Authorization: Bearer <apiKey>
// Body:   { merchantId, amount, pixKey, pixKeyType }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchantId, amount, pixKey, pixKeyType } = body

    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '').trim()

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key obrigatória. Use o header Authorization: Bearer <apiKey>.' }, { status: 401 })
    }
    if (!merchantId || typeof merchantId !== 'string') {
      return NextResponse.json({ error: 'merchantId obrigatório.' }, { status: 400 })
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount inválido. Deve ser um número positivo.' }, { status: 400 })
    }
    if (!pixKey || typeof pixKey !== 'string') {
      return NextResponse.json({ error: 'pixKey obrigatória.' }, { status: 400 })
    }
    const validPixTypes = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA']
    if (!pixKeyType || !validPixTypes.includes(pixKeyType)) {
      return NextResponse.json({ error: `pixKeyType inválido. Use: ${validPixTypes.join(', ')}.` }, { status: 400 })
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, apiKey: true, status: true, pendingBalance: true, users: { select: { id: true }, take: 1 } },
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
    if (amount > merchant.pendingBalance) {
      return NextResponse.json({ error: `Saldo insuficiente. Disponível: R$ ${merchant.pendingBalance.toFixed(2)}.` }, { status: 422 })
    }

    const userId = merchant.users[0]?.id ?? merchantId

    // Debita o saldo disponível (pendingBalance) e cria o log de solicitação
    const [, log] = await prisma.$transaction([
      prisma.merchant.update({
        where: { id: merchantId },
        data: { pendingBalance: { decrement: amount } },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'WITHDRAW_REQUEST',
          entity: 'Merchant',
          entityId: merchantId,
          metadata: JSON.stringify({ amount, pixKey, pixKeyType, via: 'api', requestedAt: new Date().toISOString() }),
        },
      }),
    ])

    dispatchWebhook(merchantId, 'withdrawal.created', {
      withdrawalId: log.id,
      amount,
      pixKey,
      pixKeyType,
    }).catch(() => {})

    return NextResponse.json({ ok: true, withdrawalId: log.id, amount, pixKey, pixKeyType, status: 'PENDENTE' }, { status: 201 })
  } catch (e: any) {
    console.error('[POST /api/v1/withdrawals]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
