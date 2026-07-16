import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureStripeCustomer, loadBillingContext } from '@/lib/billing'
import { appUrl, getStripe } from '@/lib/stripe'
import { priceIdFor } from '@/lib/plans'

export const runtime = 'nodejs'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const user = await loadBillingContext(session.user.id)
    if (!user) {
      // Session cookie references a user that no longer exists (e.g. after a
      // database reset/migration). Force the client to re-authenticate instead
      // of 500-ing downstream.
      return NextResponse.json(
        { error: 'Your session is out of date. Please sign out and sign in again.', code: 'STALE_SESSION' },
        { status: 401 }
      )
    }
    const customerId = await ensureStripeCustomer(user)

    const stripe = getStripe()
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: appUrl('/billing/complete?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appUrl('/pricing?billing=cancel'),
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id, plan } },
      metadata: { userId: user.id, plan, interval },
    })

    return NextResponse.json({ url: checkout.url })
  } catch (err) {
    console.error('[billing.checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
