// ============================================================
// STRIPE WEBHOOK — THE ONLY TRUSTWORTHY "THEY PAID" SIGNAL
// ============================================================
// Stripe calls THIS endpoint, server-to-server, when a payment
// actually clears. That's what makes it trustworthy.
//
// Why this exists: you cannot trust the browser reaching your
// success page. The customer can close the tab, lose signal, or
// hit the back button — and some of those still leave you with a
// completed payment and no notification. Equally, someone could
// just navigate straight to /success.html without paying a cent.
//
// The webhook is the source of truth. The success page is only a
// nicety for the customer.
//
// SIGNATURE VERIFICATION is what stops a random person from
// POSTing fake "payment succeeded" events at this URL. Without
// it, this endpoint would be trivially forgeable.
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    // Netlify may base64-encode the body. Stripe needs the RAW bytes
    // to verify the signature — parsing it first would break this.
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    // Bad signature = not really from Stripe. Reject it.
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // --- A payment actually cleared ---
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const m = session.metadata || {};

    // This is your authoritative "money is in" record.
    // It shows up in: Netlify → Logs → Functions → stripe-webhook
    console.log('=== DEPOSIT PAID ===');
    console.log('Name:       ', m.customer_name);
    console.log('Email:      ', session.customer_email || session.customer_details?.email);
    console.log('Service:    ', m.service, '-', m.bundle);
    console.log('Paid:       $', (session.amount_total / 100).toFixed(2));
    console.log('Remaining:  $', m.remaining_usd);
    console.log('Timeline:   ', m.timeline || '(none given)');
    console.log('Details:    ', m.project_details);
    console.log('Session:    ', session.id);
    console.log('====================');

    // OPTIONAL: email yourself on confirmed payment.
    // Uncomment and set NOTIFY_WEBHOOK_URL to a Zapier/Make/Discord
    // webhook if you want a push notification instead of reading logs.
    //
    // if (process.env.NOTIFY_WEBHOOK_URL) {
    //   await fetch(process.env.NOTIFY_WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       content: `**Deposit paid — $${(session.amount_total / 100).toFixed(2)}**\n` +
    //                `${m.customer_name} · ${m.service} ${m.bundle}\n` +
    //                `Remaining: $${m.remaining_usd}\n` +
    //                `Details: ${m.project_details}`
    //     })
    //   });
    // }
  }

  // Always 200 quickly, or Stripe will retry the event.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};