import { randomBytes, createHmac, timingSafeEqual } from 'crypto'

export function generateApiKey(): string {
  return `mpk_live_${randomBytes(24).toString('hex')}`
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(20).toString('hex')}`
}

export function verifyApiKey(provided: string, stored: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(stored))
  } catch {
    return false
  }
}

export function signWebhookPayload(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}
