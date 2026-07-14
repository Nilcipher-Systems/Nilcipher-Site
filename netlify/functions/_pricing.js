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
    service: 'Website', bundle: 'Starter', total: 275, timeline: '~3-4 days',
    summary: 'A sharp one-page site. Perfect for a portfolio or a first web presence.',
    features: [
      'Single-page responsive site (mobile, tablet, desktop)',
      'Up to 3 content sections',
      'Contact form wired to your email',
      'Deployed live with SSL',
      'Full source code, yours to keep',
      '1 round of revisions'
    ]
  },
  'website-business': {
    service: 'Website', bundle: 'Business', total: 1100, timeline: '~2.5 weeks',
    summary: 'Everything a real business needs to operate online — including taking money.',
    features: [
      'Everything in Starter',
      'Up to 6 distinct pages',
      'Stripe payment integration — take card payments directly',
      'Contact + inquiry forms routed to your inbox',
      'Booking / appointment scheduling (if you need it)',
      'Google Analytics + conversion tracking',
      'Full SEO setup (meta, sitemap, schema, Google indexing)',
      'Google Business Profile integration',
      'Custom animations and scroll interactions',
      'Blog or gallery system',
      'Social media integration',
      'Performance tuning (fast load scores)',
      'Mobile-first responsive across every device',
      '3 rounds of revisions'
    ]
  },
  'website-advanced': {
    service: 'Website', bundle: 'Advanced', total: 2200, timeline: '~4-5 weeks',
    summary: 'When the website IS the product — accounts, dashboards, custom logic.',
    features: [
      'Everything in Business',
      'Unlimited pages',
      'Custom backend / serverless functions',
      'User accounts, logins, and authentication',
      'Customer dashboard — your users get their own logged-in area',
      'Admin panel — manage content, orders, and users yourself',
      'Database design and integration',
      'Subscriptions and recurring billing (not just one-off payments)',
      'Third-party API integrations (CRM, inventory, shipping, whatever you run on)',
      'Automated emails (receipts, confirmations, reminders)',
      'Role-based permissions (staff vs customer vs admin)',
      'Security hardening and server-side validation',
      'Automated testing',
      '30 days of post-launch support',
      'Unlimited revisions during the build'
    ]
  },

  // ---------- BOTS ----------
  'bot-starter': {
    service: 'Bot', bundle: 'Starter', total: 180, timeline: '~2-3 days',
    summary: 'A simple bot that nails a handful of jobs.',
    features: [
      'Up to 5 custom slash commands',
      'Core moderation (kick, ban, warn, purge)',
      'Welcome / goodbye messages',
      'Hosting setup guide included',
      'Full source code, yours to keep',
      '1 round of revisions'
    ]
  },
  'bot-standard': {
    service: 'Bot', bundle: 'Standard', total: 700, timeline: '~1.5 weeks',
    summary: 'A bot with a memory — logs, records, and persistent data.',
    features: [
      'Everything in Starter',
      'Up to 20 custom slash commands',
      'SQLite database (infractions, user records, logs)',
      'Interactive buttons, dropdowns, and modals',
      'Role assignment panels',
      'Automod triggers and filters',
      'Scheduled and recurring tasks',
      'Logging channels for every action',
      '3 rounds of revisions'
    ]
  },
  'bot-premium': {
    service: 'Bot', bundle: 'Premium', total: 1500, timeline: '~3 weeks',
    summary: 'A full platform — tiered permissions, dashboards, external APIs.',
    features: [
      'Everything in Standard',
      'Unlimited commands',
      'Tiered permission system (staff ranks, access levels)',
      'Web dashboard to configure the bot',
      'External API integrations (Twitch, YouTube, payments, etc.)',
      'Ticket / support system',
      'Economy, leveling, or custom game mechanics',
      'Multi-server support',
      '24/7 hosting setup and deployment',
      '30 days of post-launch support'
    ]
  },

  // ---------- APPS ----------
  'app-starter': {
    service: 'App', bundle: 'Starter', total: 400, timeline: '~1 week',
    summary: 'A working tool that solves one problem properly.',
    features: [
      'Single-purpose application (web or desktop)',
      'Clean, functional UI',
      'Local data storage',
      'One core feature, built to your spec',
      'Full source code and setup docs',
      '1 round of revisions'
    ]
  },
  'app-standard': {
    service: 'App', bundle: 'Standard', total: 1200, timeline: '~2.5 weeks',
    summary: 'A real application with a backend and users.',
    features: [
      'Everything in Starter',
      'Backend API',
      'Database (SQLite or Postgres)',
      'User accounts and authentication',
      'Multi-screen interface',
      'Third-party API integration',
      'Deployment to live hosting',
      '3 rounds of revisions'
    ]
  },
  'app-premium': {
    service: 'App', bundle: 'Premium', total: 2100, timeline: '~4-5 weeks',
    summary: 'Production-grade software. The whole thing, built properly.',
    features: [
      'Everything in Standard',
      'Full-stack production application',
      'Admin panel and role-based permissions',
      'Payment processing (Stripe)',
      'Real-time features (websockets, live updates)',
      'Automated testing',
      'CI/CD pipeline — push to deploy',
      'Scalable architecture',
      '30 days of post-launch support',
      'Unlimited revisions during the build'
    ]
  },

  // ---------- AUTOMATION ----------
  'automation-starter': {
    service: 'Automation', bundle: 'Starter', total: 125, timeline: '~1-2 days',
    summary: 'Kill one repetitive task. The cheapest way to get your time back.',
    features: [
      'Single automation script',
      'One task automated end to end',
      'Plain-English setup instructions',
      'Full source code',
      '1 round of revisions'
    ]
  },
  'automation-standard': {
    service: 'Automation', bundle: 'Standard', total: 450, timeline: '~1 week',
    summary: 'A multi-step workflow that runs itself.',
    features: [
      'Everything in Starter',
      'Multi-step workflow automation',
      'API integrations (connect your tools together)',
      'Web scraping / data collection',
      'Error handling and retry logic',
      'Email or Discord notifications on completion',
      'Run logs so you can see what happened and when',
      '3 rounds of revisions'
    ]
  },
  'automation-premium': {
    service: 'Automation', bundle: 'Premium', total: 1000, timeline: '~2 weeks',
    summary: 'A full pipeline. Set it up once, never think about it again.',
    features: [
      'Everything in Standard',
      'Full data pipeline (ingest, transform, store, report)',
      'Database integration',
      'Custom dashboard to monitor runs',
      'Cloud deployment (runs without your computer on)',
      'Alerting and monitoring',
      'Automated reports',
      '30 days of post-launch support'
    ]
  }
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