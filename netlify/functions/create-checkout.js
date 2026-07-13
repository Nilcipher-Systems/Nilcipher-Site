// ============================================================
// CREATE CHECKOUT SESSION
// ============================================================
// The browser sends: "the customer picked bundle 'app-premium',
// their name is X, email is Y, here are their project details."
//
// The browser does NOT send a price. It can't be trusted with one.
// We look the price up server-side from _pricing.js and build the
// Stripe session from that. If someone edits the page in DevTools
// and sends 'app-premium' with a claimed price of $1, we ignore
// the $1 entirely and charge the real deposit.
// ============================================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getBundle } = require('./_pricing');

exports.handler = async (event) => {
  // Only POST. Anything else is noise.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment system is not configured yet.' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const { bundleKey, name, email, details, timeline } = payload;

  // --- Validate the bundle against the server catalog ---
  const item = getBundle(bundleKey);
  if (!item) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Unknown bundle. Please pick a bundle and try again.' })
    };
  }

  // --- Basic sanity on the customer fields ---
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'A valid email is required.' }) };
  }
  if (!name || !name.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please include your name.' }) };
  }

  // Trim free-text so a giant paste can't blow past Stripe's metadata limits
  const clip = (s, n) => (s || '').toString().slice(0, n);

  const siteUrl = process.env.URL || 'https://nilciphersystems.com';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,

      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: item.depositCents,   // <-- server-decided. Not from the browser.
          product_data: {
            name: item.label,
            description: item.description
          }
        }
      }],

      // Everything we need to fulfil the order, attached to the payment itself.
      // When the webhook fires, this comes back with it — so a paid order always
      // carries its own project brief.
      metadata: {
        bundle_key: item.key,
        service: item.service,
        bundle: item.bundle,
        total_usd: (item.totalCents / 100).toFixed(2),
        deposit_usd: (item.depositCents / 100).toFixed(2),
        remaining_usd: (item.remainingCents / 100).toFixed(2),
        customer_name: clip(name, 200),
        project_details: clip(details, 480),
        timeline: clip(timeline, 100)
      },

      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/start.html?canceled=1`
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
    console.error('Stripe session creation failed:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not start checkout. Please try again or reach out on Discord.' })
    };
  }
};