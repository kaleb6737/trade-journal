/**
 * Plan, price, and feature limits.
 *
 * Prices are resolved from env vars so you can swap test/live without code changes:
 *   STRIPE_PRICE_PRO_MONTHLY
 *   STRIPE_PRICE_PRO_YEARLY
 *   STRIPE_PRICE_ULTIMATE_MONTHLY
 *   STRIPE_PRICE_ULTIMATE_YEARLY
 *
 * `limits` and `features` are the single source of truth for server-side gates
 * (`assertWithinLimit`, `requireFeature`) and UI CTAs (`planFor(user)`).
 */

export const PLAN_IDS = /** @type {const} */ (['FREE', 'PRO', 'ULTIMATE'])

/** Feature flags per plan. Keep this flat — components and API routes read it directly. */
export const PLAN_FEATURES = {
  FREE: {
    brokerSync: false,
    csvImport: false,
    weeklyRoundup: false,
    analyticsFull: false,
  },
  PRO: {
    brokerSync: false,
    csvImport: true,
    weeklyRoundup: true,
    analyticsFull: true,
  },
  ULTIMATE: {
    brokerSync: true,
    csvImport: true,
    weeklyRoundup: true,
    analyticsFull: true,
  },
}

/** Hard caps per plan. `null` = unlimited. */
export const PLAN_LIMITS = {
  FREE:     { maxTrades: 30,   maxAccounts: 1 },
  PRO:      { maxTrades: null, maxAccounts: 1 },
  ULTIMATE: { maxTrades: null, maxAccounts: null },
}

/** Display metadata (pricing page, settings). Amounts are for display only — Stripe is truth. */
export const PLAN_DISPLAY = {
  FREE: {
    name: 'Free',
    tagline: 'Get a feel for the journal.',
    monthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    highlights: [
      'Up to 30 trades',
      '1 trading account',
      'Manual entry + dashboard basics',
    ],
  },
  PRO: {
    name: 'Pro',
    tagline: 'For serious self-directed traders.',
    monthlyPriceUsd: 19,
    yearlyPriceUsd: 190,
    highlights: [
      'Unlimited trades',
      'CSV import',
      'Weekly performance email',
      'Full analytics + playbook edge',
      '1 trading account',
    ],
  },
  ULTIMATE: {
    name: 'Ultimate',
    tagline: 'Multi-account traders and prop desks.',
    monthlyPriceUsd: 39,
    yearlyPriceUsd: 390,
    highlights: [
      'Everything in Pro',
      'Unlimited trading accounts',
      'Broker sync (Alpaca, Tradovate)',
      'Priority support',
    ],
  },
}

/** Stripe price IDs resolved at runtime (server only). */
export function priceIdFor(plan, interval) {
  const key = `STRIPE_PRICE_${plan}_${interval === 'year' ? 'YEARLY' : 'MONTHLY'}`
  return process.env[key] || null
}

/** Given a Stripe price id, return { plan, interval }. Used by webhook. */
export function planFromPriceId(priceId) {
  if (!priceId) return null
  const map = {
    [process.env.STRIPE_PRICE_ESSENCE_MONTHLY || '']: { plan: 'ULTIMATE', interval: 'month' },
    [process.env.STRIPE_PRICE_ESSENCE_YEARLY || '']: { plan: 'ULTIMATE', interval: 'year' },
    [process.env.STRIPE_PRICE_PRO_MONTHLY || '']:      { plan: 'PRO',      interval: 'month' },
    [process.env.STRIPE_PRICE_PRO_YEARLY || '']:       { plan: 'PRO',      interval: 'year' },
    [process.env.STRIPE_PRICE_ULTIMATE_MONTHLY || '']: { plan: 'ULTIMATE', interval: 'month' },
    [process.env.STRIPE_PRICE_ULTIMATE_YEARLY || '']:  { plan: 'ULTIMATE', interval: 'year' },
  }
  delete map['']
  return map[priceId] || null
}

/** Effective plan for a user record (materialized on User). */
export function planFor(user) {
  if (!user) return 'FREE'
  if (!PLAN_IDS.includes(user.plan)) return 'FREE'
  return user.plan
}

export function hasFeature(user, feature) {
  const plan = planFor(user)
  return Boolean(PLAN_FEATURES[plan]?.[feature])
}

export function getLimits(user) {
  return PLAN_LIMITS[planFor(user)] || PLAN_LIMITS.FREE
}

/**
 * Throw a structured error if a user lacks a feature. API routes catch this and
 * turn it into a 402 Payment Required response.
 */
export class PlanError extends Error {
  constructor(code, message, upgradeTo = 'PRO') {
    super(message)
    this.name = 'PlanError'
    this.code = code
    this.status = 402
    this.upgradeTo = upgradeTo
  }
}

export function requireFeature(user, feature, { upgradeTo = 'PRO' } = {}) {
  if (!hasFeature(user, feature)) {
    throw new PlanError(
      'feature_not_included',
      `This action requires the ${upgradeTo} plan.`,
      upgradeTo,
    )
  }
}

export function assertWithinLimit(current, max, { feature, upgradeTo = 'PRO' } = {}) {
  if (max == null) return
  if (current < max) return
  throw new PlanError(
    'limit_reached',
    `You\u2019ve reached the ${feature} limit for your plan (${max}).`,
    upgradeTo,
  )
}
