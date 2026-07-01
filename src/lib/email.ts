// Email utility — sends only when SMTP env vars are configured.
// To enable: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM in .env
// No external library required for configuration; add nodemailer when ready to ship.

type CdiCreditEmailPayload = {
  to: string
  merchantName: string
  amount: number
  base: number
  rate: number
  newBalance: number
  creditedAt: string
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export async function sendCdiCreditEmail(payload: CdiCreditEmailPayload): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // SMTP not configured — skip silently
    return
  }

  // Lazy-require nodemailer only when SMTP is configured.
  // Install with: npm install nodemailer && npm install -D @types/nodemailer
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    const date = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(payload.creditedAt))

    await transporter.sendMail({
      from:    process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to:      payload.to,
      subject: `✅ Rendimento CDI de R$ ${formatBRL(payload.amount)} creditado — Master Pagamentos`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
          <div style="background:#059669;padding:24px 28px">
            <h1 style="color:#fff;margin:0;font-size:20px">Rendimento CDI Creditado</h1>
            <p style="color:#a7f3d0;margin:6px 0 0;font-size:14px">Master Pagamentos</p>
          </div>
          <div style="padding:24px 28px">
            <p style="color:#334155;font-size:14px">Olá, <strong>${payload.merchantName}</strong></p>
            <p style="color:#334155;font-size:14px">
              Seu rendimento CDI de <strong style="color:#059669">R$ ${formatBRL(payload.amount)}</strong>
              foi creditado com base no saldo de <strong>R$ ${formatBRL(payload.base)}</strong>.
            </p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px">
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;color:#64748b">Data do crédito</td>
                <td style="padding:10px 0;text-align:right;color:#1e293b;font-weight:600">${date}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;color:#64748b">Valor creditado</td>
                <td style="padding:10px 0;text-align:right;color:#059669;font-weight:700">R$ ${formatBRL(payload.amount)}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;color:#64748b">Saldo base</td>
                <td style="padding:10px 0;text-align:right;color:#1e293b;font-weight:600">R$ ${formatBRL(payload.base)}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;color:#64748b">Taxa CDI aplicada</td>
                <td style="padding:10px 0;text-align:right;color:#1e293b;font-weight:600">${payload.rate.toFixed(4)}%/mês</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#64748b">Novo saldo CDI</td>
                <td style="padding:10px 0;text-align:right;color:#1e293b;font-weight:700">R$ ${formatBRL(payload.newBalance)}</td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:12px">
              Acesse seu painel para visualizar o extrato completo.
            </p>
          </div>
          <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0">
            <p style="color:#94a3b8;font-size:11px;margin:0">
              Este é um e-mail automático da plataforma Master Pagamentos. Não responda este e-mail.
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    // Never fail the main flow due to email errors — just log
    console.error('[email] sendCdiCreditEmail failed:', err)
  }
}
