import { readFileSync } from 'node:fs';

/**
 * The logo travels inside the email as an inline (CID) attachment: mail clients don't
 * render SVG, and a hosted image wouldn't load while the server runs on localhost.
 * `src/` and the tsup output `dist/` both sit one level below `apps/server`, so this
 * path works in dev and in the build.
 */
export const logoAttachment = {
  filename: 'droid247.png',
  content: readFileSync(new URL('../assets/email-logo.png', import.meta.url)),
  cid: 'logo@droid247',
};

const ink = '#0B0D12';
const mist = '#F4F6FA';
const orange = '#FF5A1F';
const grey = '#5A6070';
const line = '#E4E7EE';
const font = "Outfit,'Helvetica Neue',Helvetica,Arial,sans-serif";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Subject, plain text and HTML of the sign-in code email. */
export function signInCodeEmail({ code, email, minutes }: { code: string; email: string; minutes: number }) {
  const to = escapeHtml(email);
  const duration = minutes === 1 ? '1 minute' : `${minutes} minutes`;

  const text = [
    `Your Droid247 sign-in code is ${code}`,
    '',
    `It expires in ${duration} and works once.`,
    "If you didn't try to sign in, you can ignore this email.",
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Your Droid247 sign-in code</title>
</head>
<body style="margin:0;padding:0;background:${mist};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${mist}">Your code is ${code}. It expires in ${duration}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${mist}">
  <tr>
    <td align="center" style="padding:40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${line}">
        <tr>
          <td style="background:${ink};padding:28px 40px">
            <img src="cid:${logoAttachment.cid}" width="125" height="36" alt="Droid247" style="display:block;border:0;outline:none;width:125px;height:36px">
          </td>
        </tr>
        <tr><td style="background:${orange};height:4px;line-height:4px;font-size:0">&nbsp;</td></tr>
        <tr>
          <td style="padding:40px 40px 36px;font-family:${font};color:${ink}">
            <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;letter-spacing:-0.3px">Your sign-in code</h1>
            <p style="margin:12px 0 28px;font-size:16px;line-height:24px;color:${grey}">Enter this code in Droid247 to sign in as <span style="color:${ink};font-weight:600">${to}</span>.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:${mist};border-radius:12px;padding:24px 12px;font-size:40px;line-height:48px;font-weight:700;letter-spacing:12px;color:${ink}"><span style="margin-right:-12px">${code}</span></td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-size:14px;line-height:20px;color:${grey};text-align:center">Expires in ${duration} &middot; Works once</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px">
              <tr><td style="border-top:1px solid ${line};height:1px;line-height:1px;font-size:0">&nbsp;</td></tr>
            </table>
            <p style="margin:24px 0 0;font-size:14px;line-height:22px;color:${grey}">Didn't try to sign in? You can ignore this email. Nobody can get in without this code.</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
        <tr>
          <td style="padding:24px 40px 0;font-family:${font};font-size:12px;line-height:18px;color:${grey};text-align:center">
            Droid247: your AI agent, working 24/7 in the cloud.<br>
            This email was sent to <span style="color:${ink}">${to}</span>.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject: `${code} is your Droid247 code`, text, html };
}
