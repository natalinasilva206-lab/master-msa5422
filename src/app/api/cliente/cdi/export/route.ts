import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ACTION_LABELS: Record<string, string> = {
  ADD_TO_CDI:         'Aporte CDI',
  CDI_WITHDRAW:       'Resgate CDI',
  CDI_CREDIT:         'Rendimento Creditado',
  CDI_LOCK_SET:       'Título Bloqueado',
  CDI_EARLY_REQUEST:  'Resgate Antecipado Solicitado',
  CDI_EARLY_APPROVED: 'Resgate Antecipado Aprovado',
  CDI_EARLY_DENIED:   'Resgate Antecipado Negado',
}

const ACTION_STATUS: Record<string, string> = {
  ADD_TO_CDI:         'Concluído',
  CDI_WITHDRAW:       'Concluído',
  CDI_CREDIT:         'Concluído',
  CDI_LOCK_SET:       'Ativo',
  CDI_EARLY_REQUEST:  'Aguardando',
  CDI_EARLY_APPROVED: 'Aprovado',
  CDI_EARLY_DENIED:   'Negado',
}

type LogRow = {
  id: string
  action: string
  metadata: string | null
  createdAt: Date
}

type ExtratoRow = {
  createdAt: Date
  tipo: string
  valor: number
  saldoAntes: number
  saldoDepois: number
  taxa: number | null
  base: number | null
  status: string
  descricao: string
}

function buildExtrato(logs: LogRow[], initialBalance: number): ExtratoRow[] {
  const ordered = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  let running = initialBalance
  const rows: ExtratoRow[] = []

  for (const log of ordered) {
    let amount = 0
    let taxa: number | null = null
    let base: number | null = null

    try {
      const m = JSON.parse(log.metadata ?? '{}')
      amount = parseFloat(m.amount || 0)
      if (m.rate)  taxa = parseFloat(m.rate)
      if (m.base)  base = parseFloat(m.base)
    } catch {}

    const saldoAntes = running

    switch (log.action) {
      case 'ADD_TO_CDI':
        running += amount
        break
      case 'CDI_WITHDRAW':
      case 'CDI_EARLY_APPROVED':
        running -= amount
        break
      case 'CDI_CREDIT':
        running += amount
        break
    }

    const saldoDepois = running

    rows.push({
      createdAt: log.createdAt,
      tipo:       ACTION_LABELS[log.action] ?? log.action,
      valor:      amount,
      saldoAntes,
      saldoDepois,
      taxa,
      base,
      status:    ACTION_STATUS[log.action] ?? '—',
      descricao: ACTION_LABELS[log.action] ?? log.action,
    })
  }

  return rows.reverse()
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(d))
}

function escapeCsv(v: string) {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
  return v
}

function buildCsv(rows: ExtratoRow[], merchantName: string): string {
  const header = [
    'Data/Hora', 'Tipo', 'Valor (R$)', 'Saldo Antes (R$)', 'Saldo Depois (R$)',
    'Taxa CDI (%)', 'Base de Cálculo (R$)', 'Status', 'Descrição',
  ]
  const dataRows = rows.map((r) => [
    fmtDate(r.createdAt),
    r.tipo,
    r.valor > 0 ? r.valor.toFixed(2) : '—',
    r.saldoAntes.toFixed(2),
    r.saldoDepois.toFixed(2),
    r.taxa != null ? r.taxa.toFixed(4) : '—',
    r.base != null ? r.base.toFixed(2) : '—',
    r.status,
    r.descricao,
  ].map((v) => escapeCsv(String(v))).join(','))

  const meta = [
    `# Extrato CDI — ${merchantName}`,
    `# Gerado em: ${fmtDate(new Date())}`,
    '',
  ]
  return [...meta, header.join(','), ...dataRows].join('\n')
}

function buildHtml(rows: ExtratoRow[], merchantName: string, periodLabel: string): string {
  const rowsHtml = rows.map((r) => `
    <tr>
      <td>${fmtDate(r.createdAt)}</td>
      <td><strong>${r.tipo}</strong></td>
      <td class="${r.valor > 0 ? 'green' : ''}">${r.valor > 0 ? `R$ ${formatBRL(r.valor)}` : '—'}</td>
      <td>R$ ${formatBRL(r.saldoAntes)}</td>
      <td>R$ ${formatBRL(r.saldoDepois)}</td>
      <td>${r.taxa != null ? `${r.taxa.toFixed(4)}%` : '—'}</td>
      <td>${r.base != null ? `R$ ${formatBRL(r.base)}` : '—'}</td>
      <td><span class="badge badge-${r.status.toLowerCase().replace(/ /g, '-')}">${r.status}</span></td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Extrato CDI — ${merchantName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; padding: 24px; }
  .header { border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #059669; font-weight: 700; }
  .header .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .meta { display: flex; gap: 32px; margin-bottom: 20px; }
  .meta-item { }
  .meta-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
  .meta-item .value { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 1px solid #e2e8f0; }
  td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  tr:hover td { background: #f8fafc; }
  .green { color: #059669; font-weight: 600; }
  .badge { font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.03em; }
  .badge-concluído { background: #dcfce7; color: #166534; }
  .badge-ativo { background: #dbeafe; color: #1e40af; }
  .badge-aguardando { background: #fef3c7; color: #92400e; }
  .badge-aprovado { background: #dcfce7; color: #166534; }
  .badge-negado { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print {
    body { padding: 12px; }
    button { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>Extrato CDI</h1>
  <div class="sub">${merchantName} · ${periodLabel}</div>
</div>
<div class="meta">
  <div class="meta-item"><div class="label">Gerado em</div><div class="value">${fmtDate(new Date())}</div></div>
  <div class="meta-item"><div class="label">Total de movimentações</div><div class="value">${rows.length}</div></div>
</div>
<table>
  <thead>
    <tr>
      <th>Data/Hora</th>
      <th>Tipo</th>
      <th>Valor</th>
      <th>Saldo Antes</th>
      <th>Saldo Depois</th>
      <th>Taxa CDI</th>
      <th>Base de Cálculo</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer">
  Este extrato é gerado automaticamente pela plataforma Master Pagamentos e contém informações confidenciais.
  Não compartilhe este documento com terceiros.
</div>
<script>window.onload = function(){ window.print() }</script>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { merchant: true } })
  if (!user?.merchant) return NextResponse.json({ error: 'Merchant não encontrado' }, { status: 404 })

  const merchant = user.merchant
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'csv'
  const period = searchParams.get('period') ?? '90d'
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')

  const now = new Date()
  let dateFrom: Date | undefined
  let dateTo: Date | undefined
  let periodLabel = ''

  if (period === 'custom' && fromParam && toParam) {
    dateFrom = new Date(fromParam)
    dateTo   = new Date(toParam + 'T23:59:59.999Z')
    periodLabel = `${fromParam} a ${toParam}`
  } else if (period === 'ytd') {
    dateFrom = new Date(now.getFullYear(), 0, 1)
    periodLabel = `Ano ${now.getFullYear()}`
  } else if (period === '30d') {
    dateFrom = new Date(now.getTime() - 30 * 86400000)
    periodLabel = 'Últimos 30 dias'
  } else {
    dateFrom = new Date(now.getTime() - 90 * 86400000)
    periodLabel = 'Últimos 90 dias'
  }

  const where: Record<string, unknown> = {
    entityId: merchant.id,
    action: { in: ['ADD_TO_CDI', 'CDI_WITHDRAW', 'CDI_CREDIT', 'CDI_LOCK_SET', 'CDI_EARLY_REQUEST', 'CDI_EARLY_APPROVED', 'CDI_EARLY_DENIED'] },
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo   ? { lte: dateTo   } : {}),
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: { id: true, action: true, metadata: true, createdAt: true },
  })

  // Compute the CDI balance at the start of the requested period by replaying
  // all balance-affecting logs that occurred BEFORE the filter window.
  let initialBalance = 0
  if (dateFrom) {
    const priorLogs = await prisma.auditLog.findMany({
      where: {
        entityId: merchant.id,
        action: { in: ['ADD_TO_CDI', 'CDI_WITHDRAW', 'CDI_CREDIT', 'CDI_EARLY_APPROVED'] },
        createdAt: { lt: dateFrom },
      },
      orderBy: { createdAt: 'asc' },
      select: { action: true, metadata: true },
    })
    for (const l of priorLogs) {
      try {
        const m = JSON.parse(l.metadata ?? '{}')
        const amt = parseFloat(m.amount || 0)
        if (l.action === 'ADD_TO_CDI' || l.action === 'CDI_CREDIT') initialBalance += amt
        else if (l.action === 'CDI_WITHDRAW' || l.action === 'CDI_EARLY_APPROVED') initialBalance -= amt
      } catch {}
    }
    initialBalance = Math.max(0, Math.round(initialBalance * 100) / 100)
  }

  const rows = buildExtrato(logs, initialBalance)
  const fileName = `extrato-cdi-${now.toISOString().slice(0, 10)}`

  if (format === 'pdf') {
    const html = buildHtml(rows, merchant.name, periodLabel)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  const csv = buildCsv(rows, merchant.name)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}.csv"`,
    },
  })
}
