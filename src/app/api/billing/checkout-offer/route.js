import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { loadBillingContext, ensureStripeCustomer } from '@/lib/billing'
import { appUrl, getStripe, hasStripe } from '@/lib/stripe'
import { verifiedOffer } from '@/lib/essenceOffer'

export const runtime = 'nodejs'

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (!['month', 'year'].includes(body?.interval) || typeof body?.founding !== 'boolean' || (body.founding && body.interval !== 'year')) return NextResponse.json({ error: 'Choose a billing option.' }, { status: 400 })
  if (!hasStripe()) return NextResponse.json({ error: 'Checkout is not available yet. No payment has been taken.' }, { status: 503 })
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user?.id ? await loadBillingContext(session.user.id) : null
    if (session?.user?.id && !user) return NextResponse.json({ error: 'Please sign in again before checking out.' }, { status: 401 })
    if (user?.subscription && !['canceled', 'incomplete_expired'].includes(user.subscription.status)) return NextResponse.json({ error: 'You already have a subscription. Manage it in Settings → Billing instead of purchasing again.' }, { status: 409 })
    const stripe = getStripe()
    let offer
    try { offer = await verifiedOffer(stripe, body.interval, body.founding) }
    catch (e) { return NextResponse.json({ error: e.message }, { status: 503 }) }
    const customer = user ? await ensureStripeCustomer(user) : undefined
    const identity = user ? { userId: user.id } : { guest: '1' }
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription', ...offer, ...(customer ? { customer, client_reference_id: user.id } : {}),
      billing_address_collection: 'auto',
      metadata: { ...identity, plan: 'ULTIMATE', offer: 'essence', interval: body.interval },
      subscription_data: { metadata: { ...identity, plan: 'ULTIMATE', offer: 'essence' } },
      success_url: appUrl('/billing/complete?session_id={CHECKOUT_SESSION_ID}'),
      cancel_url: appUrl('/pricing?billing=cancel'),
    })
    return NextResponse.json({ url: checkout.url })
  } catch (e) {
    console.error('[billing.offer]', e.type || e.name)
    return NextResponse.json({ error: 'Could not connect to checkout. Please try again.' }, { status: 502 })
  }
}
