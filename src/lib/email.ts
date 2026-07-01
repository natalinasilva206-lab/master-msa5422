// Email utility — no-op until SMTP env vars and nodemailer are configured.
// To enable: install nodemailer, set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM.

type CdiCreditEmailPayload = {
  to: string
  merchantName: string
  amount: number
  base: number
  rate: number
  newBalance: number
  creditedAt: string
}

export async function sendCdiCreditEmail(_payload: CdiCreditEmailPayload): Promise<void> {
  // SMTP not configured — skip silently.
  // Implement when nodemailer is installed and SMTP vars are set.
}
