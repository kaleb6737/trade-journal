import { NextResponse } from 'next/server'
import { appUrl, getStripe, hasStripe } from '@/lib/stripe'
import { priceIdFor } from '@/lib/plans'

export const runtime = 'nodejs'

/**
 * Starts a Stripe Checkout session for a *logged-out* visitor.
 *
 * Stripe itself collects the email + card. On success the customer is
 * bounced to `/billing/complete`, which resolves the Stripe session,
 * creates (or links) a local User with that email, and hands the visitor
 * off to `/auth/setup` to pick a password.
 */
export async function POST(req) {
  if (!hasStripe()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const { plan, interval } = await req.json()
    if (!['PRO', 'ULTIMATE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    if (!['month', 'year'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

    const priceId = priceIdFor(plan, interval)
    if (!priceId) {
      return NextResponse.json(
        { error: `Price for ${plan}/${interval} is not configured.` },
        { status: 500 }
      )
    }

    const stripe = getStripe()
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // No `customer` / `customer_email` — Stripe collects the email itself
      // during checkout. In `subscription` mode Stripe always creates the
      // customer automatically (the `customer_creation` flag is only valid
      // in `payment` mode and Stripe 400s if you send it here).
      success_url: appUrl('/billing/complete?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appUrl('/pricing?billing=cancel'),
      metadata: { guest: '1', plan, interval },
      subscription_data: { metadata: { guest: '1', plan } },
    })

    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    console.error('[billing.checkout-guest]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
