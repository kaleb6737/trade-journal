import Stripe from 'stripe'

let _stripe = null

/** Lazy Stripe client so missing keys only blow up on actual use, not app boot. */
export function getStripe() {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  _stripe = new Stripe(key, {
    apiVersion: '2026-01-28.clover',
    appInfo: { name: 'TradeXEssence', version: '0.1.0' },
  })
  return _stripe
}

export function hasStripe() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function appUrl(path = '') {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  const trimmed = base.replace(/\/$/, '')
  return path ? `${trimmed}${path.startsWith('/') ? path : `/${path}`}` : trimmed
}
