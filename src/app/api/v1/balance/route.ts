import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApiKey } from '@/lib/apiKey'

// GET /api/v1/balance
// Header: Authorization: Bearer <apiKey>
// Query:  merchantId=<id>
export async function GET(req: NextRequest) {
  try {
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
      select: {
        id: true,
        apiKey: true,
        status: true,
        balance: true,
        pendingBalance: true,
        reservedBalance: true,
        blockedBalance: true,
        futureBalance: true,
      },
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

    return NextResponse.json({
      merchantId: merchant.id,
      balance: {
        available:  merchant.pendingBalance,   // saldo livre para saque/operações
        reserved:   merchant.reservedBalance,  // retido pela reserva de risco
        blocked:    merchant.blockedBalance,   // bloqueado por disputa/chargeback
        future:     merchant.futureBalance,    // com data prevista de liberação
        cdi:        merchant.balance,          // investido em CDI
      },
    })
  } catch (e: any) {
    console.error('[GET /api/v1/balance]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
