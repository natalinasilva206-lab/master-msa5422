import { prisma } from '@/lib/prisma'
import { signWebhookPayload } from '@/lib/apiKey'

export type WebhookEvent =
  | 'payment.approved'
  | 'payment.refused'
  | 'refund.created'
  | 'chargeback.opened'
  | 'med.opened'
  | 'dispute.updated'
  | 'balance.updated'
  | 'withdrawal.created'
  | 'withdrawal.paid'
  | 'withdrawal.rejected'
  | 'reserve.released'
  | 'cdi.credited'
  | 'merchant.activated'
  | 'merchant.blocked'

const MAX_RESPONSE_CHARS = 1000
const TIMEOUT_MS         = 8000
const MAX_ATTEMPTS       = 3

async function sendOnce(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<{ statusCode: number; response: string } | { error: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const text = (await res.text().catch(() => '')).slice(0, MAX_RESPONSE_CHARS)
    return { statusCode: res.status, response: text }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function dispatchWebhook(
  merchantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { merchantId, active: true },
  })
  if (endpoints.length === 0) return

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() })

  await Promise.allSettled(
    endpoints
      .filter((ep) => {
        try {
          const evts: string[] = JSON.parse(ep.events)
          return evts.length === 0 || evts.includes(event)
        } catch {
          return true
        }
      })
      .map(async (ep) => {
        const sig = signWebhookPayload(ep.secret, payload)
        const extraHeaders = {
          'X-MasterPay-Signature': sig,
          'X-MasterPay-Event':     event,
        }

        let lastResult: Awaited<ReturnType<typeof sendOnce>> | null = null

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          lastResult = await sendOnce(ep.url, payload, extraHeaders)

          const isNetErr  = 'error' in lastResult
          const statusCode = !isNetErr ? (lastResult as { statusCode: number }).statusCode : undefined
          const success    = !isNetErr && statusCode !== undefined && statusCode < 500

          await prisma.webhookDelivery.create({
            data: {
              endpointId: ep.id,
              merchantId,
              event,
              url:        ep.url,
              payload,
              statusCode: statusCode ?? null,
              response:   !isNetErr ? (lastResult as { response: string }).response : null,
              error:      isNetErr  ? (lastResult as { error: string }).error        : null,
              attempt,
              success,
            },
          }).catch(() => {/* never block on DB write failure */})

          if (success) return           // done
          if (!isNetErr && statusCode !== undefined && statusCode < 500) return // 4xx — don't retry
          if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }),
  )
}

/** Re-send a specific delivery using its original payload and endpoint. */
export async function retryWebhookDelivery(deliveryId: string): Promise<{
  success: boolean
  statusCode?: number
  error?: string
}> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } })
  if (!delivery) return { success: false, error: 'Entrega não encontrada.' }

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: delivery.endpointId },
    select: { secret: true },
  })
  if (!endpoint) return { success: false, error: 'Endpoint removido.' }

  const sig = signWebhookPayload(endpoint.secret, delivery.payload)
  const result = await sendOnce(delivery.url, delivery.payload, {
    'X-MasterPay-Signature': sig,
    'X-MasterPay-Event':     delivery.event,
  })

  const isNetErr   = 'error' in result
  const statusCode = !isNetErr ? (result as { statusCode: number }).statusCode : undefined
  const success    = !isNetErr && statusCode !== undefined && statusCode < 500

  // Log the retry as a new delivery record (preserves original + retry history)
  const prevAttempts = await prisma.webhookDelivery.count({
    where: { endpointId: delivery.endpointId, event: delivery.event, payload: delivery.payload },
  })

  await prisma.webhookDelivery.create({
    data: {
      endpointId: delivery.endpointId,
      merchantId: delivery.merchantId,
      event:      delivery.event,
      url:        delivery.url,
      payload:    delivery.payload,
      statusCode: statusCode ?? null,
      response:   !isNetErr ? (result as { response: string }).response : null,
      error:      isNetErr  ? (result as { error: string }).error        : null,
      attempt:    prevAttempts + 1,
      success,
    },
  })

  return { success, statusCode, ...( isNetErr ? { error: (result as { error: string }).error } : {}) }
}
