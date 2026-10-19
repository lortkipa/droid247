import { createTransport, type Transporter } from 'nodemailer';

import { env } from './env';

/** How long a sign-in code stays valid. */
export const SIGN_IN_CODE_TTL_SECONDS = 5 * 60;

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

  const minutes = SIGN_IN_CODE_TTL_SECONDS / 60;
  await getTransport(env.smtp).sendMail({
    from: env.smtp.from,
    to: email,
    subject: `${code} is your Droid247 code`,
    text: [
      `Your Droid247 sign-in code is ${code}`,
      '',
      `It expires in ${minutes} minutes and works once.`,
      "If you didn't try to sign in, you can ignore this email.",
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#F4F6FA;font-family:Helvetica,Arial,sans-serif;color:#0B0D12">
    <div style="max-width:420px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:32px">
      <div style="font-size:20px;font-weight:bold">Droid247</div>
      <p style="margin:24px 0 8px;font-size:16px">Your sign-in code:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#FF5A1F">${code}</div>
      <p style="margin:24px 0 0;font-size:14px;color:#5A6070">It expires in ${minutes} minutes and works once. If you didn't try to sign in, you can ignore this email.</p>
    </div>
  </body>
</html>`,
  });
}
