// ============================================================
// STRIPE WEBHOOK — THE ONLY TRUSTWORTHY "THEY PAID" SIGNAL
// ============================================================
// Stripe calls THIS endpoint, server-to-server, when a payment
// actually clears. That is what makes it trustworthy.
//
// THE TWO-NOTIFICATION SETUP:
//   1. Formspree emails you the brief at SUBMIT time, tagged
//      "UNPAID LEAD". That's someone who filled the form — they
//      may or may not have paid.
//   2. THIS fires only when money actually moved, tagged "PAID".
//
// So: UNPAID email = interest. PAID ping = a real order.
// Never start work off the Formspree email alone.
//
// You cannot trust the browser reaching /success.html — a client
// can close the tab mid-checkout, and anyone can navigate straight
// to that page without paying. Only this endpoint knows the truth.
//
// SIGNATURE VERIFICATION stops a random person POSTing fake
// "payment succeeded" events at this URL. Without it, this endpoint
// would be trivially forgeable.
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const money = (cents) => '$' + (cents / 100).toFixed(2);

/** Ping a Discord channel via webhook URL (set DISCORD_WEBHOOK_URL). */
async function notifyDiscord(session, m) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  const fields = [
    { name: 'Client',    value: m.customer_name || '—', inline: true },
    { name: 'Email',     value: session.customer_email || session.customer_details?.email || '—', inline: true },
    { name: 'Package',   value: `${m.service} — ${m.bundle}`, inline: true },
    { name: 'Paid now',  value: `**${money(session.amount_total)}**`, inline: true },
    { name: 'Balance',   value: `$${m.remaining_usd} on delivery`, inline: true },
    { name: 'Timeline',  value: m.timeline || 'not specified', inline: true }
  ];

  if (m.project_details) {
    fields.push({ name: 'Brief', value: m.project_details.slice(0, 1000), inline: false });
  }

  const imgs = (m.concept_images || '').split(',').filter(Boolean);
  if (imgs.length) {
    fields.push({
      name: 'Concept images',
      value: `${imgs.length} attached — in the "concepts" blob store:\n` +
             imgs.map(k => `\`${k}\``).join('\n'),
      inline: false
    });
  }

  fields.push({
    name: 'Terms',
    value: m.terms_accepted === 'yes'
      ? `Accepted ${m.terms_accepted_at || ''}`
      : '**NOT ACCEPTED — investigate**',
    inline: false
  });

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '@here',
        embeds: [{
          title: `DEPOSIT PAID — ${money(session.amount_total)}`,
          description: `**${m.service} ${m.bundle}** — work can begin.`,
          color: 0xF0603E,  // brand red
          fields,
          footer: { text: 'Nilcipher Systems · Stripe confirmed' },
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    // Never let a failed notification break the webhook — Stripe would
    // just retry the event, and the payment is already valid regardless.
    console.error('Discord notify failed:', err.message);
  }
}

/** Email you via a Formspree endpoint (set PAID_NOTIFY_FORMSPREE). */
async function notifyEmail(session, m) {
  const url = process.env.PAID_NOTIFY_FORMSPREE;
  if (!url) return;

  const imgs = (m.concept_images || '').split(',').filter(Boolean);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: `PAID ${money(session.amount_total)} — ${m.service} ${m.bundle} — ${m.customer_name}`,
        status: 'DEPOSIT PAID — confirmed by Stripe. Safe to start work.',
        client: m.customer_name,
        email: session.customer_email || session.customer_details?.email,
        package: `${m.service} — ${m.bundle}`,
        project_total: `$${m.total_usd}`,
        deposit_paid: money(session.amount_total),
        balance_due: `$${m.remaining_usd} on delivery`,
        timeline: m.timeline || 'not specified',
        brief: m.project_details || '',
        concept_images: imgs.length ? `${imgs.length} attached: ${imgs.join(', ')}` : 'none',
        terms_accepted: m.terms_accepted === 'yes'
          ? `Yes — ${m.terms_accepted_at}`
          : 'NO — INVESTIGATE',
        stripe_session: session.id
      })
    });
  } catch (err) {
    console.error('Email notify failed:', err.message);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const signature = event.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return { statusCode: 500, body: 'Webhook not configured' };
  }

  let stripeEvent;
  try {
    // Netlify may base64-encode the body. Stripe needs the RAW bytes to verify
    // the signature — parsing it first would break verification.
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // --- A payment actually cleared ---
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const m = session.metadata || {};

    console.log('=== DEPOSIT PAID (confirmed by Stripe) ===');
    console.log('Client:     ', m.customer_name);
    console.log('Email:      ', session.customer_email || session.customer_details?.email);
    console.log('Package:    ', m.service, '-', m.bundle);
    console.log('Paid:       ', money(session.amount_total));
    console.log('Balance:    $', m.remaining_usd, 'on delivery');
    console.log('Timeline:   ', m.timeline || '(none given)');
    console.log('Brief:      ', m.project_details);
    console.log('Terms:      ', m.terms_accepted === 'yes'
      ? `ACCEPTED ${m.terms_accepted_at}` : '*** NOT ACCEPTED ***');

    const imgs = (m.concept_images || '').split(',').filter(Boolean);
    if (imgs.length) {
      console.log('Concepts:   ', imgs.length + ' image(s) in the "concepts" blob store');
      imgs.forEach(k => console.log('              - ' + k));
    } else {
      console.log('Concepts:    none attached');
    }
    console.log('Session:    ', session.id);
    console.log('=========================================');

    // Fire both notifications. Whichever env vars are set will send;
    // unset ones are skipped silently.
    await Promise.all([
      notifyDiscord(session, m),
      notifyEmail(session, m)
    ]);
  }

  // Always 200 quickly, or Stripe will retry the event.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};