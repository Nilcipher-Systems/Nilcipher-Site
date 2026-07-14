// ============================================================
// EMAIL — via Resend
// ============================================================
// Why Resend and not Formspree:
//   Formspree free tier = 50 submissions/month, then it SILENTLY
//   STOPS ACCEPTING. If that's your only notification channel, a
//   cap-out means you miss a paid order — money sitting in Stripe
//   and you never find out someone's waiting on you.
//
//   Resend free tier = 3,000 emails/month, permanent. 60x the
//   headroom. (SendGrid killed its free tier in May 2025.)
//
// Uses the REST API directly — no SDK, one less dependency.
//
// SETUP (see the notes at the bottom of this file):
//   RESEND_API_KEY   — from resend.com
//   NOTIFY_EMAIL     — where YOU want the alerts to land
//   FROM_EMAIL       — must be on a domain you've verified with Resend
// ============================================================

const money = (cents) => '$' + (cents / 100).toFixed(2);

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Send an email through Resend.
 * Returns true on success, false on failure — never throws, so a
 * mail outage can't break a webhook or a checkout.
 */
async function sendEmail({ subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!key || !to) {
    console.error('Email not configured — set RESEND_API_KEY and NOTIFY_EMAIL');
    return false;
  }

  const body = {
    from: `Nilcipher Systems <${from}>`,
    to: [to],
    subject,
    html
  };
  if (replyTo) body.reply_to = replyTo;   // so you can reply straight to the client

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend rejected the email:', res.status, err);
      return false;
    }
    console.log('Email sent:', subject);
    return true;

  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
}

/** Shared HTML shell so both emails look like they came from the same place. */
function shell(bannerColor, bannerText, rows, extra = '') {
  const cells = rows.map(([k, v]) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#666;
                 font-size:13px;width:150px;vertical-align:top">${esc(k)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;color:#111;
                 font-size:14px"><strong>${v}</strong></td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;
      font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">
    <div style="background:${bannerColor};padding:18px 22px">
      <div style="color:#fff;font-size:17px;font-weight:700;letter-spacing:0.5px">
        ${esc(bannerText)}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">${cells}</table>
    ${extra}
    <div style="padding:14px 22px;background:#fafafa;color:#999;font-size:11px">
      Nilcipher Systems
    </div>
  </div>
</body></html>`;
}

/**
 * A CUSTOM QUOTE REQUEST — no fixed price, so no deposit was taken.
 * This is the ONLY notification you'll get for these, so it must never be missed.
 * (Bundle orders that get abandoned send nothing — the PAID email covers those.)
 */
async function sendLeadEmail(o) {
  const rows = [
    ['Status', '<span style="color:#b45309">CUSTOM QUOTE REQUEST — no deposit taken</span>'],
    ['Client', esc(o.name)],
    ['Email', esc(o.email)]
  ];
  if (o.timeline) rows.push(['Timeline', esc(o.timeline)]);
  rows.push(['What they want', esc(o.details).replace(/\n/g, '<br>') || '<em>nothing written</em>']);

  const cta = `
    <div style="margin:0;padding:14px 22px;background:#fffbeb;
                border-top:1px solid #fde68a;color:#92400e;font-size:13px">
      <strong>They can't pay until you quote them.</strong> There's no bundle price
      for this, so no deposit was taken and no payment page was shown. Reply to this
      email to scope it and send them a number.
    </div>`;

  return sendEmail({
    subject: `Custom quote request — ${o.name}`,
    html: shell('#78350f', 'CUSTOM QUOTE REQUEST', rows, cta),
    replyTo: o.email
  });
}

/** A PAID order — Stripe confirmed the money moved. This one is real. */
async function sendPaidEmail(session, m) {
  const email = session.customer_email || session.customer_details?.email || '';

  const rows = [
    ['Status', '<span style="color:#15803d">DEPOSIT PAID — confirmed by Stripe</span>'],
    ['Client', esc(m.customer_name)],
    ['Email', esc(email)],
    ['Package', `${esc(m.service)} — ${esc(m.bundle)}`],
    ['Project total', `$${esc(m.total_usd)}`],
    ['Paid now', `<span style="color:#15803d;font-size:17px">${money(session.amount_total)}</span>`],
    ['Balance', `$${esc(m.remaining_usd)} due on delivery`],
    ['Timeline', esc(m.timeline) || '<em>not specified</em>'],
    ['Brief', esc(m.project_details).replace(/\n/g, '<br>') || '<em>none given</em>'],
    ['Terms', m.terms_accepted === 'yes'
      ? `Accepted ${esc((m.terms_accepted_at || '').slice(0, 10))}`
      : '<span style="color:#b91c1c">NOT ACCEPTED — investigate</span>']
  ];

  const imgs = (m.concept_images || '').split(' | ').filter(Boolean);
  rows.push(['Concept images', imgs.length
    ? imgs.map((u, i) =>
        `<a href="${esc(u)}" style="color:#166534">Image ${i + 1}</a>`).join(' &middot; ') +
      `<br><span style="color:#999;font-size:11px">Hosted on Stripe — click to view</span>`
    : '<em>none attached</em>']);

  const go = `
    <div style="padding:14px 22px;background:#f0fdf4;
                border-top:1px solid #bbf7d0;color:#166534;font-size:13px">
      <strong>Money is in. Safe to start work.</strong> Reply to this email to
      reach the client directly.
    </div>`;

  return sendEmail({
    subject: `PAID ${money(session.amount_total)} — ${m.service} ${m.bundle} — ${m.customer_name}`,
    html: shell('#166534', `DEPOSIT PAID — ${money(session.amount_total)}`, rows, go),
    replyTo: email
  });
}

module.exports = { sendEmail, sendLeadEmail, sendPaidEmail };

// ============================================================
// SETUP — 10 minutes, one time
// ============================================================
// 1. Sign up at resend.com (free, no card needed)
//
// 2. EASY START: skip domain verification. Resend lets you send from
//    'onboarding@resend.dev' immediately — but ONLY to the email address
//    you signed up with. Perfect for these alerts, since they only ever
//    go to you. Set FROM_EMAIL=onboarding@resend.dev and you're done.
//
// 3. BETTER (do it when you can): verify nilciphersystems.com in Resend
//    (Domains -> Add Domain -> paste the DNS records into Netlify DNS).
//    Then set FROM_EMAIL=orders@nilciphersystems.com. Emails from your own
//    domain land in the inbox instead of spam, and you can email clients
//    directly later.
//
// 4. Resend -> API Keys -> Create. Copy the key (starts with 're_').
//
// 5. In Netlify -> Project configuration -> Environment variables, add:
//      RESEND_API_KEY = re_xxxxxxxxx          [check "Contains secret values"]
//      NOTIFY_EMAIL   = nilcipher.dev@gmail.com
//      FROM_EMAIL     = onboarding@resend.dev
//
// 6. Redeploy. Done — no Formspree, no 50/month cap.
// ============================================================