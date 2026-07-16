import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, hasStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { upsertSubscriptionFromStripe } from '@/lib/syncStripeSubscription'

export const runtime = 'nodejs'

/**
 * Pulls the user's current Stripe subscription and rewrites the local
 * `Subscription` row + `User.plan`. Useful when the browser returns from
 * Checkout before the webhook has fired (common in dev without `stripe listen`).
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasStripe()) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true, stripeCustomerId: true },
    })
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ plan: user?.plan || 'FREE', synced: false })
    }

    const stripe = getStripe()
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 1,
      expand: ['data.items.data.price'],
    })
    const sub = subs.data[0]
    if (sub) {
      await upsertSubscriptionFromStripe(sub)
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    })
    return NextResponse.json({ plan: refreshed?.plan || 'FREE', synced: Boolean(sub) })
  } catch (err) {
    console.error('[billing.sync]', err)
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 })
  }
}
