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
const { sendConceptImages } = require('./_email');

// Real image magic numbers. The declared MIME type is attacker-controlled and
// worthless — check the actual bytes.
const SIGS = [
  { ext: 'png',  mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { ext: 'jpg',  mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { ext: 'gif',  mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }
];
const sniff = (buf) => SIGS.find(s => s.bytes.every((b, i) => buf[i] === b)) || null;

const MAX_BYTES = 5 * 1024 * 1024;        // 5 MB per image
const MAX_TOTAL = 15 * 1024 * 1024;       // 15 MB across all images
const MAX_FILES = 5;
// Resend's message ceiling is ~40MB, and base64 inflates bytes by ~33%.
// 15MB of raw image -> ~20MB encoded, comfortably inside it.

/**
 * Validate concept images and return them ready to attach to an email.
 *
 * Design note: images are emailed to you directly as ATTACHMENTS rather than
 * stored anywhere. No Netlify Blobs (throws MissingBlobsEnvironmentError on
 * plenty of correct setups), no Stripe file API (finicky purpose/format rules),
 * no S3 bucket to configure. The images are small, they only ever go to one
 * person — you — so a storage layer is pure overhead and pure risk.
 *
 * Validation is on the ACTUAL BYTES. A .exe renamed to .png gets rejected.
 */
function validateImages(images) {
  const out = [];
  const skipped = [];
  let total = 0;
  if (!Array.isArray(images)) return { out, skipped };

  for (const img of images.slice(0, MAX_FILES)) {
    const label = (img && img.name) ? String(img.name).slice(0, 60) : 'image';

    if (!img || typeof img.data !== 'string') {
      skipped.push(`${label} (malformed)`);
      continue;
    }

    const comma = img.data.indexOf(',');
    const b64 = comma >= 0 ? img.data.slice(comma + 1) : img.data;
    const buf = Buffer.from(b64, 'base64');

    if (!buf.length) {
      skipped.push(`${label} (empty)`);
      continue;
    }
    if (buf.length > MAX_BYTES) {
      skipped.push(`${label} (over 5MB)`);
      continue;
    }
    if (total + buf.length > MAX_TOTAL) {
      skipped.push(`${label} (would exceed the 15MB total)`);
      continue;
    }

    const sig = sniff(buf);
    if (!sig) {
      skipped.push(`${label} (not a real image)`);
      continue;
    }

    total += buf.length;
    out.push({
      filename: `concept-${out.length + 1}.${sig.ext}`,
      content: b64
    });
  }
  return { out, skipped };
}

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

  const { bundleKey, name, email, details, timeline, termsAccepted, images } = payload;

  // --- Validate the bundle against the server catalog ---
  const item = getBundle(bundleKey);
  if (!item) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Unknown bundle. Please pick a bundle and try again.' })
    };
  }

  // --- Terms must be accepted. Enforced HERE, not just in the browser.
  // A checkbox in the DOM is a courtesy; this is the actual gate. Without
  // this, someone could POST straight at the endpoint and skip the contract,
  // which would undermine the whole point of having one.
  if (termsAccepted !== true) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'You must accept the project terms before paying a deposit.' })
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

  // Validate concept images. If they sent any, email them to you right now as
  // attachments — tagged as an ORDER STARTED heads-up. When the PAID email
  // lands you'll already have the mockups sitting in your inbox.
  //
  // Fire-and-forget: a mail failure must never block a paying customer.
  const { out: concepts, skipped } = validateImages(images);

  if (skipped.length) {
    console.warn('Concept images skipped:', skipped.join(', '));
  }
  if (concepts.length) {
    sendConceptImages({
      name, email,
      service: item.service,
      bundle: item.bundle,
      images: concepts,
      skipped
    }).catch(err => console.error('Concept email failed:', err.message));
  }

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
        timeline: clip(timeline, 100),
        concept_images: concepts.length ? `${concepts.length} emailed to you at order time` : '',
        concepts_skipped: skipped.length ? String(skipped.length) : '',
        terms_accepted: 'yes',
        terms_accepted_at: new Date().toISOString()
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