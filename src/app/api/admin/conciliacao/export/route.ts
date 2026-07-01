import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ACTION_LABELS: Record<string, string> = {
  ADD_TO_CDI: 'Aporte CDI',
  ANTECIPACAO_REQUEST: 'Antecipação Solicitada',
  ANTECIPACAO_APPROVED: 'Antecipação Aprovada',
  WITHDRAW_REQUEST: 'Saque Solicitado',
  WITHDRAW_APPROVED: 'Saque Aprovado',
  WITHDRAW_DENIED: 'Saque Negado',
  KYC_APPROVED: 'KYC Aprovado',
  KYC_BLOCKED: 'KYC Bloqueado',
  BALANCE_ADJUST: 'Ajuste de Saldo (Venda)',
  RISK_AUTO_RESERVE: 'Reserva Automática',
  RISK_MANUAL_RESERVE: 'Reserva Manual',
  RISK_MANUAL_RELEASE: 'Liberação Manual',
  CDI_WITHDRAW: 'Resgate CDI',
  CDI_EARLY_APPROVED: 'Resgate CDI Aprovado',
  DISPUTE_OPENED: 'Disputa Aberta',
  DISPUTE_RESOLVED: 'Disputa Resolvida',
  CREATE_MERCHANT: 'Empresa Criada',
  UPDATE_MERCHANT: 'Empresa Atualizada',
  BLOCK_MERCHANT: 'Empresa Bloqueada',
  ACTIVATE_MERCHANT: 'Empresa Ativada',
  RESET_MERCHANT_PASSWORD: 'Senha Redefinida',
  CREATE_CLIENT_ACCESS: 'Acesso Cliente Criado',
}

function escapeCsv(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const action = searchParams.get('action') || ''

  const where: Record<string, unknown> = { entity: 'Merchant' }
  if (action) where.action = action
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: { user: { select: { name: true, email: true, merchant: { select: { name: true } } } } },
  })

  const header = ['Data/Hora', 'Ação', 'Merchant', 'Usuário', 'Detalhes', 'ID Entidade']
  const rows = logs.map((log) => {
    let details = ''
    try {
      const m = JSON.parse(log.metadata ?? '{}')
      if (m.amount) details = `R$ ${parseFloat(m.amount).toFixed(2)}`
      else if (m.rate) details = `${m.rate}%/mês`
      else if (m.newStatus) details = `→ ${m.newStatus}`
    } catch {}

    const date = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).format(new Date(log.createdAt))

    return [
      date,
      ACTION_LABELS[log.action] ?? log.action,
      log.user?.merchant?.name ?? log.entityId,
      log.user?.name ?? log.user?.email ?? log.userId,
      details,
      log.entityId,
    ].map(escapeCsv).join(',')
  })

  const csv = [header.join(','), ...rows].join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="conciliacao-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
