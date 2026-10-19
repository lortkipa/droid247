import { createTransport, type Transporter } from 'nodemailer';

import { env } from './env';
import { logoAttachment, signInCodeEmail } from './sign-in-email';

let transport: Transporter | undefined;

function getTransport(smtp: NonNullable<typeof env.smtp>) {
  transport ??= createTransport({
    host: smtp.host,
    port: smtp.port,
    // 465 speaks TLS from the start; other ports (587) upgrade with STARTTLS.
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  return transport;
}

if (!env.smtp) {
  console.warn('SMTP_HOST / SMTP_USER / SMTP_PASS not set: sign-in codes are printed here instead of emailed.');
}

/** Emails a one-time sign-in code. Throws if the SMTP server rejects it. */
export async function sendSignInCode(email: string, code: string) {
  if (!env.smtp) {
    console.log(`[auth] sign-in code for ${email}: ${code} (SMTP not configured)`);
    return;
  }

  const { subject, text, html } = signInCodeEmail({ code, email, minutes: env.SIGN_IN_CODE_TTL_MINUTES });
  await getTransport(env.smtp).sendMail({
    from: env.smtp.from,
    to: email,
    subject,
    text,
    html,
    attachments: [logoAttachment],
  });
}
