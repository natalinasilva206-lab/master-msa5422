import { prisma } from '@/lib/prisma'

export interface SalePayload {
  merchantId:   string
  saleAmount:   number           // valor bruto da venda
  description?: string          // descrição / ID externo
  externalId?:  string          // ID na plataforma do gateway
  triggeredBy:  string          // userId que disparou (admin ou sistema)
}

export interface SaleResult {
  valorVenda:      number
  valorReserva:    number
  valorDisponivel: number
  reservePercent:  number
  releaseDays:     number
  releaseAt:       string        // ISO date da liberação prevista
  auditIds:        { saleLogId: string; reserveLogId: string | null }
}

/**
 * Processa uma venda aprovada:
 * 1. Lê config de risco do merchant (percentual, min, max)
 * 2. Calcula reserva: valorVenda * reservePercent / 100, clampado por min/max
 * 3. Credita (valorVenda - valorReserva) em pendingBalance
 * 4. Credita valorReserva em reservedBalance
 * 5. Cria AuditLog BALANCE_ADJUST (venda) + RISK_AUTO_RESERVE (reserva)
 */
export async function processSalePayment(payload: SalePayload): Promise<SaleResult> {
  const { merchantId, saleAmount, description, externalId, triggeredBy } = payload

  if (saleAmount <= 0) throw new Error('Valor de venda inválido.')

  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } })
  if (!merchant) throw new Error('Merchant não encontrado.')

  const reservePercent = merchant.riskReservePercent   // e.g. 5.0
  const releaseDays    = merchant.riskReleaseDays       // e.g. 30
  const reserveMin     = merchant.riskReserveMin        // 0 = sem mínimo
  const reserveMax     = merchant.riskReserveMax        // 0 = sem máximo

  // Calcula reserva bruta
  let valorReserva = saleAmount * (reservePercent / 100)

  // Aplica mínimo
  if (reserveMin > 0 && valorReserva < reserveMin) valorReserva = reserveMin

  // Aplica máximo
  if (reserveMax > 0 && valorReserva > reserveMax) valorReserva = reserveMax

  // Garante que reserva não ultrapasse o valor da venda
  if (valorReserva > saleAmount) valorReserva = saleAmount

  // Arredonda para 2 casas decimais
  valorReserva    = Math.round(valorReserva    * 100) / 100
  const valorDisponivel = Math.round((saleAmount - valorReserva) * 100) / 100

  // Data prevista de liberação da reserva
  const releaseAt = new Date()
  releaseAt.setDate(releaseAt.getDate() + releaseDays)
  const releaseAtIso = releaseAt.toISOString().slice(0, 10)

  // Executa em transação
  const [saleLog, reserveLog] = await prisma.$transaction(async (tx) => {
    // Atualiza saldos do merchant
    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        pendingBalance:  { increment: valorDisponivel },
        reservedBalance: { increment: valorReserva },
      },
    })

    // AuditLog: Venda aprovada (valor disponível)
    const sale = await tx.auditLog.create({
      data: {
        userId:   triggeredBy,
        action:   'BALANCE_ADJUST',
        entity:   'Merchant',
        entityId: merchantId,
        metadata: JSON.stringify({
          amount:       valorDisponivel,
          grossAmount:  saleAmount,
          description:  description ?? 'Venda aprovada',
          externalId:   externalId  ?? null,
          reserveApplied: valorReserva,
          reservePercent,
        }),
      },
    })

    // AuditLog: Reserva automática de risco (só se houver reserva)
    let reserve = null
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
    }

    return [sale, reserve]
  })

  return {
    valorVenda:      saleAmount,
    valorReserva,
    valorDisponivel,
    reservePercent,
    releaseDays,
    releaseAt:       releaseAtIso,
    auditIds: {
      saleLogId:    saleLog.id,
      reserveLogId: reserveLog?.id ?? null,
    },
  }
}
