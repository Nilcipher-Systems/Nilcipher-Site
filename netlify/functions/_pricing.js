// ============================================================
// SERVER-SIDE PRICE CATALOG — THE SINGLE SOURCE OF TRUTH
// ============================================================
// The browser NEVER sees this file and CANNOT change it. Whatever
// price the customer's browser claims is ignored — the amount
// charged is looked up HERE, by key, every time.
//
// PRICING BASIS (2026 market research):
//   Freelance dev market floor is ~$45-150/hr.
//   Small business sites: $1,500-$8,000 freelance.
//   Bots w/ database: $500-$2,500. Bots w/ dashboards: $3,000+.
// These target ~$50-60/hr effective — genuinely under market,
// without underselling the work.
//
// To change a price: edit here, commit, push. Nowhere else.
// ============================================================

const CATALOG = {
  // ---------- WEBSITES ----------
  'website-starter': {
    service: 'Website', bundle: 'Starter', total: 125, timeline: '~3 days',
    summary: 'A clean one-page site. Portfolio, landing page, first web presence.',
    features: [
      'Single-page responsive site',
      'Up to 3 sections',
      'Contact form to your email',
      'Deployed live with SSL',
      'Full source code',
      '1 round of revisions',
    ]
  },
  'website-business': {
    service: 'Website', bundle: 'Business', total: 300, timeline: '~1 week',
    summary: 'A small multi-page site that can take payments.',
    features: [
      'Everything in Starter',
      'Up to 4 pages',
      'Stripe payment button',
      'Basic SEO setup',
      'Analytics',
      '2 rounds of revisions',
    ]
  },
  'website-advanced': {
    service: 'Website', bundle: 'Advanced', total: 500, timeline: '~2 weeks',
    summary: 'A site with real features — logins or a simple backend.',
    features: [
      'Everything in Business',
      'Up to 6 pages',
      'User logins OR a simple backend',
      'Database integration',
      'Third-party API hookup',
      '30 days support',
      '3 rounds of revisions',
    ]
  },
  // ---------- BOTS ----------
  'bot-starter': {
    service: 'Bot', bundle: 'Starter', total: 90, timeline: '~2 days',
    summary: 'A simple bot that does a few jobs well.',
    features: [
      'Up to 5 slash commands',
      'Core moderation (kick/ban/warn)',
      'Welcome messages',
      'Hosting setup guide',
      'Full source code',
      '1 round of revisions',
    ]
  },
  'bot-standard': {
    service: 'Bot', bundle: 'Standard', total: 240, timeline: '~4 days',
    summary: 'A bot with a memory — records and persistent data.',
    features: [
      'Everything in Starter',
      'Up to 15 commands',
      'SQLite database',
      'Buttons, menus, modals',
      'Role panels',
      'Automod',
      '2 rounds of revisions',
    ]
  },
  'bot-premium': {
    service: 'Bot', bundle: 'Premium', total: 450, timeline: '~1.5 weeks',
    summary: 'A full bot — tiered permissions and integrations.',
    features: [
      'Everything in Standard',
      'Unlimited commands',
      'Tiered staff permissions',
      'External API integration',
      'Ticket system',
      '24/7 hosting setup',
      '3 rounds of revisions',
    ]
  },
  // ---------- APPS ----------
  'app-starter': {
    service: 'App', bundle: 'Starter', total: 150, timeline: '~3 days',
    summary: 'A working tool that solves one problem.',
    features: [
      'Single-purpose app (web or desktop)',
      'Clean UI',
      'Local data storage',
      'Full source code + docs',
      '1 round of revisions',
    ]
  },
  'app-standard': {
    service: 'App', bundle: 'Standard', total: 325, timeline: '~1 week',
    summary: 'A real app with a backend and users.',
    features: [
      'Everything in Starter',
      'Backend API',
      'Database',
      'User accounts',
      'Deployed live',
      '2 rounds of revisions',
    ]
  },
  'app-premium': {
    service: 'App', bundle: 'Premium', total: 500, timeline: '~2 weeks',
    summary: 'A full-stack app, built properly.',
    features: [
      'Everything in Standard',
      'Admin panel',
      'Payment processing',
      'Role-based permissions',
      '30 days support',
      '3 rounds of revisions',
    ]
  },
  // ---------- AUTOMATIONS ----------
  'automation-starter': {
    service: 'Automation', bundle: 'Starter', total: 60, timeline: '~1 day',
    summary: 'Kill one repetitive task.',
    features: [
      'Single automation script',
      'One task, end to end',
      'Setup instructions',
      'Full source code',
      '1 round of revisions',
    ]
  },
  'automation-standard': {
    service: 'Automation', bundle: 'Standard', total: 180, timeline: '~4 days',
    summary: 'A multi-step workflow that runs itself.',
    features: [
      'Everything in Starter',
      'Multi-step workflow',
      'API integrations',
      'Error handling',
      'Notifications on completion',
      '2 rounds of revisions',
    ]
  },
  'automation-premium': {
    service: 'Automation', bundle: 'Premium', total: 375, timeline: '~1.5 weeks',
    summary: 'A full pipeline you never think about again.',
    features: [
      'Everything in Standard',
      'Full data pipeline',
      'Database integration',
      'Cloud deployment',
      'Monitoring + alerts',
      '30 days support',
    ]
  },
};

const DEPOSIT_RATE = 0.25; // 25% up front, 75% on delivery

/**
 * Look up a bundle and compute its deposit, in cents.
 * Object.hasOwn guards against prototype keys ('__proto__', 'constructor'),
 * which would otherwise resolve to inherited junk and crash the function.
 */
function getBundle(key) {
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