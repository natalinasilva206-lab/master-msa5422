// Email utility — graceful no-op when SMTP env vars are absent.
// To enable: set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM in env.

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
}

function smtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  )
}

async function getTransporter() {
  if (!smtpConfigured()) return null
  try {
    // nodemailer is an optional peer dep — dynamic import so a missing package
    // never crashes the app at startup.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodemailer = await (Function('return import("nodemailer")')() as Promise<any>)
    return nodemailer.default.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  } catch {
    return null
  }
}

export type EmailResult = 'sent' | 'skipped' | 'error'

export async function sendTicketOpenedEmail(payload: {
  to: string
  subject: string
  merchantName: string
  ticketSubject: string
  message: string
}): Promise<EmailResult> {
  const transport = await getTransporter()
  if (!transport) return 'skipped'
  try {
    await transport.sendMail({
      from:    process.env.SMTP_FROM,
      to:      payload.to,
      subject: `[Suporte] Novo ticket: ${payload.ticketSubject}`,
      text: [
        `Novo ticket aberto por ${payload.merchantName}.`,
        `Assunto: ${payload.ticketSubject}`,
        '',
        payload.message,
        '',
        'Acesse o painel para responder.',
      ].join('\n'),
    })
    return 'sent'
  } catch {
    return 'error'
  }
}

export async function sendTicketRepliedEmail(payload: {
  to: string
  merchantName: string
  ticketSubject: string
  reply: string
}): Promise<EmailResult> {
  const transport = await getTransporter()
  if (!transport) return 'skipped'
  try {
    await transport.sendMail({
      from:    process.env.SMTP_FROM,
      to:      payload.to,
      subject: `[Suporte] Resposta ao seu ticket: ${payload.ticketSubject}`,
      text: [
        `Olá, ${payload.merchantName}!`,
        '',
        'Nossa equipe de suporte respondeu ao seu ticket:',
        '',
        payload.reply,
        '',
        'Acesse o painel para visualizar ou responder.',
      ].join('\n'),
    })
    return 'sent'
  } catch {
    return 'error'
  }
}

export async function sendTicketReopenedEmail(payload: {
  to: string
  merchantName: string
  ticketSubject: string
  message: string
}): Promise<EmailResult> {
  const transport = await getTransporter()
  if (!transport) return 'skipped'
  try {
    await transport.sendMail({
      from:    process.env.SMTP_FROM,
      to:      payload.to,
      subject: `[Suporte] Ticket reaberto: ${payload.ticketSubject}`,
      text: [
        `${payload.merchantName} respondeu ao ticket "${payload.ticketSubject}":`,
        '',
        payload.message,
        '',
        'Acesse o painel para dar continuidade.',
      ].join('\n'),
    })
    return 'sent'
  } catch {
    return 'error'
  }
}
