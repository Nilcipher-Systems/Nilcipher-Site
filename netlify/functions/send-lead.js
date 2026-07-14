// ============================================================
// SEND LEAD — the "someone filled the form" email
// ============================================================
// Fires at SUBMIT time, before payment. Clearly tagged UNPAID so
// it can never be mistaken for a sale.
//
// This replaces Formspree entirely. Formspree's free tier caps at
// 50 submissions/month and then silently stops accepting — which,
// if email is your only channel, means silently missing orders.
//
// Failure here is non-fatal: if the email doesn't send, we still
// return 200 so the customer proceeds to checkout. A missed lead
// notification is annoying; a blocked payment is worse. The PAID
// email from the webhook is the one that actually matters, and it
// runs on a separate path.
// ============================================================

const { sendLeadEmail } = require('./_email');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let o;
  try {
    o = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  // Light validation. This endpoint is public, so keep it boring and bounded.
  const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

  const lead = {
    name:     clip(o.name, 200),
    email:    clip(o.email, 200),
    service:  clip(o.service, 60),
    bundle:   clip(o.bundle, 60),
    deposit:  clip(o.deposit, 40),
    timeline: clip(o.timeline, 120),
    details:  clip(o.details, 3000)
  };

  if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A valid email is required.' }) };
  }

  const ok = await sendLeadEmail(lead);

  // Even if the email failed, don't block the customer's checkout.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent: ok })
  };
};