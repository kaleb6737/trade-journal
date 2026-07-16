import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureStripeCustomer, loadBillingContext } from '@/lib/billing'
import { appUrl, getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await loadBillingContext(session.user.id)
    const customerId = await ensureStripeCustomer(user)

    const stripe = getStripe()
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: appUrl('/settings'),
    })
    return NextResponse.json({ url: portal.url })
  } catch (err) {
    console.error('[billing.portal]', err)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
