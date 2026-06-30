import { prisma } from '@/lib/prisma'

export interface SalePayload {
  merchantId:   string
  saleAmount:   number           // valor bruto da venda
  description?: string          // descrição / ID externo
  externalId?:  string          // ID na plataforma do gateway
  triggeredBy:  string          // userId que disparou (admin ou sistema)
}

export interface SaleResult {
  valorVenda:       number
  valorReserva:     number
  valorDisponivel:  number
  reservePercent:   number
  releaseDays:      number
  releaseAt:        string        // ISO date da liberação prevista
  reserveReleaseId: string | null
  saleLogId:        string        // SaleLog.id criado
  auditIds:         { saleLogId: string; reserveLogId: string | null }
}

export async function processSalePayment(payload: SalePayload): Promise<SaleResult> {
  const { merchantId, saleAmount, description, externalId, triggeredBy } = payload

  if (saleAmount <= 0) throw new Error('Valor de venda inválido.')

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) throw new Error('Merchant não encontrado.')

  const reservePercent = merchant.riskReservePercent
  const releaseDays    = merchant.riskReleaseDays
  const reserveMin     = merchant.riskReserveMin
  const reserveMax     = merchant.riskReserveMax

  let valorReserva = saleAmount * (reservePercent / 100)
  if (reserveMin > 0 && valorReserva < reserveMin) valorReserva = reserveMin
  if (reserveMax > 0 && valorReserva > reserveMax) valorReserva = reserveMax
  if (valorReserva > saleAmount) valorReserva = saleAmount

  valorReserva = Math.round(valorReserva * 100) / 100
  const valorDisponivel = Math.round((saleAmount - valorReserva) * 100) / 100

  const releaseAt = new Date()
  releaseAt.setDate(releaseAt.getDate() + releaseDays)
  const releaseAtIso = releaseAt.toISOString().slice(0, 10)

  const [saleLogRecord, auditSale, auditReserve, releaseRecord] = await prisma.$transaction(async (tx) => {
    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        pendingBalance:  { increment: valorDisponivel },
        reservedBalance: { increment: valorReserva },
      },
    })

    // SaleLog: registro da venda para métricas de risco
    const saleLog = await tx.saleLog.create({
      data: {
        merchantId,
        amount:      saleAmount,
        type:        'VENDA',
        status:      'APROVADO',
        description: description ?? null,
        externalId:  externalId  ?? null,
      },
    })

    // AuditLog: venda aprovada
    const sale = await tx.auditLog.create({
      data: {
        userId:   triggeredBy,
        action:   'BALANCE_ADJUST',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          amount:         valorDisponivel,
          grossAmount:    saleAmount,
          description:    description ?? 'Venda aprovada',
          externalId:     externalId  ?? null,
          reserveApplied: valorReserva,
          reservePercent,
          saleLogId:      saleLog.id,
        }),
      },
    })

    let reserve = null
    let reserveReleaseRecord = null
    if (valorReserva > 0) {
      reserve = await tx.auditLog.create({
        data: {
          userId:   triggeredBy,
          action:   'RISK_AUTO_RESERVE',
          entity:   'Merchant',
          entityId: merchantId,
          metadata: JSON.stringify({
            amount:        valorReserva,
            grossAmount:   saleAmount,
            reservePercent,
            releaseDays,
            releaseAt:     releaseAtIso,
            externalId:    externalId ?? null,
            saleLogId:     sale.id,
          }),
        },
      })

      reserveReleaseRecord = await tx.reserveRelease.create({
        data: {
          merchantId,
          saleLogId:     sale.id,
          amount:        valorReserva,
          saleAmount,
          reservePercent,
          releaseDays,
          saleDate:      new Date(),
          releaseAt,
          status:        'RESERVADO',
          notes:         description ?? null,
        },
      })
    }

    return [saleLog, sale, reserve, reserveReleaseRecord]
  })

  return {
    valorVenda:       saleAmount,
    valorReserva,
    valorDisponivel,
    reservePercent,
    releaseDays,
    releaseAt:        releaseAtIso,
    reserveReleaseId: releaseRecord?.id ?? null,
    saleLogId:        saleLogRecord.id,
    auditIds: {
      saleLogId:    auditSale.id,
      reserveLogId: auditReserve?.id ?? null,
    },
  }
}
