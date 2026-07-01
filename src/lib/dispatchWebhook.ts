import { prisma } from '@/lib/prisma'
import { signWebhookPayload } from '@/lib/apiKey'

export type WebhookEvent =
  | 'sale.created'
  | 'dispute.opened'
  | 'dispute.updated'
  | 'merchant.activated'
  | 'merchant.blocked'
  | 'withdrawal.approved'
  | 'withdrawal.denied'
  | 'reserve.released'

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
          const events: string[] = JSON.parse(ep.events)
          return events.length === 0 || events.includes(event)
        } catch {
          return true
        }
      })
      .map(async (ep) => {
        const sig = signWebhookPayload(ep.secret, payload)
        try {
          await fetch(ep.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-MasterPay-Signature': sig,
              'X-MasterPay-Event': event,
            },
            body: payload,
            signal: AbortSignal.timeout(8000),
          })
        } catch {
          // Fire-and-forget: log failure silently, never throw
        }
      }),
  )
}
