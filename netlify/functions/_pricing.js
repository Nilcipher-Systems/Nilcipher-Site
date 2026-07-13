// ============================================================
// SERVER-SIDE PRICE CATALOG — THE SINGLE SOURCE OF TRUTH
// ============================================================
// This file lives on the server. The browser NEVER sees it and
// CANNOT change it. Whatever the customer's browser claims a
// bundle costs is irrelevant — the amount charged is looked up
// HERE, by key, every single time.
//
// This is the whole reason we built a backend. Prices in
// client-side JS can be edited in DevTools in about four
// seconds. Prices here cannot.
//
// To change a price: edit it here, commit, push. Done.
// ============================================================

const CATALOG = {
  // key            label                        total (USD)
  'website-starter':    { service: 'Website',    bundle: 'Starter',   total: 120 },
  'website-business':   { service: 'Website',    bundle: 'Business',  total: 225 },
  'website-advanced':   { service: 'Website',    bundle: 'Advanced',  total: 400 },

  'bot-starter':        { service: 'Bot',        bundle: 'Starter',   total: 90 },
  'bot-standard':       { service: 'Bot',        bundle: 'Standard',  total: 175 },
  'bot-premium':        { service: 'Bot',        bundle: 'Premium',   total: 350 },

  'app-starter':        { service: 'App',        bundle: 'Starter',   total: 130 },
  'app-standard':       { service: 'App',        bundle: 'Standard',  total: 275 },
  'app-premium':        { service: 'App',        bundle: 'Premium',   total: 500 },

  'automation-starter':  { service: 'Automation', bundle: 'Starter',  total: 45 },
  'automation-standard': { service: 'Automation', bundle: 'Standard', total: 110 },
  'automation-premium':  { service: 'Automation', bundle: 'Premium',  total: 220 }
};

const DEPOSIT_RATE = 0.25; // 25% up front, 75% on delivery

/**
 * Look up a bundle and compute its deposit, in cents.
 * Returns null for any key that isn't in the catalog — so a
 * tampered or garbage key gets rejected rather than guessed at.
 */
function getBundle(key) {
  // Object.hasOwn guards against prototype keys — getBundle('__proto__')
  // or 'constructor' would otherwise resolve to inherited junk and crash,
  // instead of being cleanly rejected as an unknown bundle.
  if (typeof key !== 'string' || !Object.hasOwn(CATALOG, key)) return null;

  const item = CATALOG[key];
  if (!item || typeof item.total !== 'number') return null;

  const depositCents = Math.round(item.total * DEPOSIT_RATE * 100);
  const remainingCents = Math.round(item.total * 100) - depositCents;

  return {
    key,
    service: item.service,
    bundle: item.bundle,
    totalCents: Math.round(item.total * 100),
    depositCents,
    remainingCents,
    label: `${item.service} — ${item.bundle} (25% deposit)`,
    description: `Deposit for ${item.service} ${item.bundle} bundle. ` +
                 `Total $${item.total.toFixed(2)}. ` +
                 `Remaining $${(remainingCents / 100).toFixed(2)} due on completion.`
  };
}

module.exports = { CATALOG, DEPOSIT_RATE, getBundle };