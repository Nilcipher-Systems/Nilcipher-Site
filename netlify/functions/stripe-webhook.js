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

const { sendPaidEmail } = require('./_email');

const money = (cents) => '$' + (cents / 100).toFixed(2);

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

    console.log('Concepts:   ', m.concept_images || 'none attached');
    console.log('Session:    ', session.id);
    console.log('=========================================');

    // THE email that matters. Sent via Resend — no Formspree cap to blow through.
    // sendPaidEmail never throws, so a mail outage can't make Stripe retry a
    // payment that already succeeded.
    await sendPaidEmail(session, m);
  }

  // Always 200 quickly, or Stripe will retry the event.
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};