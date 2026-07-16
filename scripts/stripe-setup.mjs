#!/usr/bin/env node
/**
 * One-time setup: create TradeXEssence Pro + Ultimate products with
 * month/year recurring prices in whichever Stripe mode your STRIPE_SECRET_KEY
 * belongs to. Idempotent on re-run when you pass --reuse=<prod_id>.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs
 *
 * Output: 4 price IDs. Paste them into .env.local.
 */
import Stripe from 'stripe'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const envPath = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
  }
}

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('STRIPE_SECRET_KEY is not set. Add it to .env.local or export it.')
  process.exit(1)
}
if (!key.startsWith('sk_test_')) {
  console.error('Refusing to run: key does not look like a test-mode key (sk_test_...).')
  console.error('This script is intended for test mode. Remove this guard if you really want to run against live.')
  process.exit(1)
}

const stripe = new Stripe(key, { apiVersion: '2026-01-28.clover' })

const PLANS = [
  {
    key: 'PRO',
    name: 'TradeXEssence Pro',
    description: 'Unlimited trades, CSV import, weekly roundup email, full analytics.',
    monthly: 1900,
    yearly: 19000,
  },
  {
    key: 'ULTIMATE',
    name: 'TradeXEssence Ultimate',
    description: 'Everything in Pro + broker sync (Alpaca, Tradovate) + unlimited trading accounts.',
    monthly: 3900,
    yearly: 39000,
  },
]

async function findOrCreateProduct(name, description) {
  // List active products with a matching name (small limit — plenty for 2 tiers).
  const existing = await stripe.products.list({ active: true, limit: 100 })
  const match = existing.data.find((p) => p.name === name)
  if (match) {
    console.log(`· found product ${name} -> ${match.id}`)
    return match
  }
  const p = await stripe.products.create({ name, description })
  console.log(`· created product ${name} -> ${p.id}`)
  return p
}

async function findOrCreatePrice(productId, amount, interval) {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 })
  const match = prices.data.find(
    (x) =>
      x.unit_amount === amount &&
      x.currency === 'usd' &&
      x.recurring?.interval === interval,
  )
  if (match) {
    console.log(`  · found $${amount / 100}/${interval} -> ${match.id}`)
    return match
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: 'usd',
    recurring: { interval },
  })
  console.log(`  · created $${amount / 100}/${interval} -> ${price.id}`)
  return price
}

const out = {}
for (const p of PLANS) {
  const product = await findOrCreateProduct(p.name, p.description)
  const monthly = await findOrCreatePrice(product.id, p.monthly, 'month')
  const yearly = await findOrCreatePrice(product.id, p.yearly, 'year')
  out[`STRIPE_PRICE_${p.key}_MONTHLY`] = monthly.id
  out[`STRIPE_PRICE_${p.key}_YEARLY`] = yearly.id
}

console.log('\n─── Add these to .env.local ───')
for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`)
console.log('───────────────────────────────')

if (process.argv.includes('--write-env')) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
  for (const [k, v] of Object.entries(out)) {
    const re = new RegExp(`^${k}=.*$`, 'm')
    if (re.test(content)) content = content.replace(re, `${k}=${v}`)
    else content += `\n${k}=${v}`
  }
  fs.writeFileSync(envPath, content)
  console.log(`Wrote price ids into ${envPath}`)
}
