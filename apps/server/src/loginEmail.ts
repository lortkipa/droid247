import { CODE_TTL_MS } from "@droid247/shared";

export interface LoginEmail {
  subject: string;
  text: string;
  html: string;
}

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;
const FG = "#0a0a0a";
const MUTED = "#6b6b6b";
const SUBTLE = "#8f8f8f";
const BORDER = "#e4e4e4";
const CANVAS = "#f5f5f5";

/**
 * The sign-in code email. Email clients ignore `<style>`, SVG and modern
 * layout, so this is tables with inline styles. `logoSrc` is usually a `cid:`
 * URL for the inline attachment; without it the logo falls back to text.
 */
export function loginCodeEmail(
  code: string,
  { logoSrc, year = new Date().getFullYear() }: { logoSrc?: string; year?: number } = {},
): LoginEmail {
  const minutes = CODE_TTL_MS / 60_000;
  const half = Math.ceil(code.length / 2);

  const logo = logoSrc
    ? `<img src="${logoSrc}" width="155" height="28" alt="droid247" style="display:block;border:0;outline:none;height:28px;width:155px">`
    : `<span style="font-family:${FONT};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${FG}">droid247</span>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Your droid247 login code</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your code is ${code}. It expires in ${minutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS}">
<tr><td align="center" style="padding:44px 16px 40px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
    <tr><td align="center" style="padding-bottom:28px">${logo}</td></tr>
    <tr><td align="center" style="background:#ffffff;border:1px solid ${BORDER};border-radius:12px;padding:40px 32px 32px;font-family:${FONT};text-align:center">
      <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.03em;color:${FG}">Your login code</h1>
      <p style="margin:0;font-size:14px;line-height:1.5;color:${MUTED}">Enter this code in droid247 to finish logging in.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 14px">
        <tr><td style="background:${CANVAS};border-radius:10px;padding:16px 24px 16px 28px;font-family:${MONO};font-size:36px;line-height:1;font-weight:500;letter-spacing:0.14em;color:${FG};white-space:nowrap">${code.slice(0, half)}<span style="padding-left:0.32em">${code.slice(half)}</span></td></tr>
      </table>
      <p style="margin:0;font-size:13px;line-height:1.5;color:${MUTED}">It expires in ${minutes} minutes and works only once.</p>
      <div style="height:1px;line-height:1px;font-size:0;background:${BORDER};margin:32px 0 20px">&nbsp;</div>
      <p style="margin:0;font-size:12px;line-height:1.55;color:${SUBTLE}">If you didn't try to log in, you can ignore this email.<br>Don't share this code. droid247 will never ask you for it.</p>
    </td></tr>
    <tr><td align="center" style="padding-top:28px;font-family:${FONT};font-size:12px;line-height:1.6;color:${SUBTLE}">
      droid247 · Your AI agent, running 24/7<br>© ${year} droid247
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;

  const text = `Your droid247 login code

Enter this code in droid247 to finish logging in:

    ${code}

It expires in ${minutes} minutes and works only once.

If you didn't try to log in, you can ignore this email.
Don't share this code. droid247 will never ask you for it.

droid247 · Your AI agent, running 24/7
`;

  return { subject: `Your droid247 login code is ${code}`, text, html };
}
