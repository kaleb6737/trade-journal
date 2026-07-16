import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe, hasStripe } from '@/lib/stripe'
import { upsertSubscriptionFromStripe } from '@/lib/syncStripeSubscription'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe Checkout success landing page.
 *
 * Two flows funnel through here:
 *
 *   1. Authenticated user upgraded → we sync the subscription, then bounce
 *      them into the app. They're already signed in.
 *
 *   2. Guest bought via `/api/billing/checkout-guest` (no account yet) →
 *      Stripe collected their email and card. We:
 *        - retrieve the Checkout session + subscription from Stripe,
 *        - find-or-create a local User with that email,
 *        - link the Stripe customer id and subscription,
 *        - send them to `/auth/setup?session_id=…` to pick a password.
 *
 *    If the email already belongs to an existing account (with a password),
 *    we send them to the login page with a success flash instead.
 */
export default async function BillingCompletePage({ searchParams }) {
  const sessionId =
    typeof searchParams?.session_id === 'string' ? searchParams.session_id : null

  if (!sessionId) {
    redirect('/pricing')
  }
  if (!hasStripe()) {
    return renderError('Stripe is not configured. Please contact support.')
  }

  const stripe = getStripe()
  const authSession = await getServerSession(authOptions)

  let checkout
  try {
    checkout = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })
  } catch (err) {
    console.error('[billing.complete] could not retrieve session', err)
    return renderError('We could not confirm your subscription. If you were charged, email support@tradexessence.com and we’ll fix it.')
  }

  if (checkout.payment_status !== 'paid' && checkout.status !== 'complete') {
    return renderError('Your payment has not completed yet. Refresh in a few seconds.')
  }

  // Pull the subscription (creating it in metadata if needed)
  let sub = null
  if (checkout.subscription) {
    sub =
      typeof checkout.subscription === 'string'
        ? await stripe.subscriptions.retrieve(checkout.subscription)
        : checkout.subscription
  }

  // --- AUTHENTICATED FLOW ------------------------------------------------
  if (authSession?.user?.id) {
    if (sub) {
      if (!sub.metadata?.userId) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { ...(sub.metadata || {}), userId: authSession.user.id },
        })
        sub.metadata = { ...(sub.metadata || {}), userId: authSession.user.id }
      }
      await upsertSubscriptionFromStripe(sub)
    }
    redirect('/settings?billing=success&tab=billing')
  }

  // --- GUEST FLOW --------------------------------------------------------
  const customerId =
    typeof checkout.customer === 'string'
      ? checkout.customer
      : checkout.customer?.id || null
  const rawEmail =
    checkout.customer_details?.email ||
    (typeof checkout.customer === 'object' && checkout.customer?.email) ||
    null
  const email = rawEmail ? rawEmail.toLowerCase().trim() : null

  if (!email) {
    return renderError('Stripe did not return an email for this checkout. Please contact support.')
  }

  // Find or create a user with this email.
  let user = await prisma.user.findUnique({ where: { email } })
  const isNewAccount = !user
  const needsPasswordSetup = !user || !user.password

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: checkout.customer_details?.name || null,
        password: null,
        stripeCustomerId: customerId,
      },
    })
  } else if (customerId && user.stripeCustomerId !== customerId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    })
  }

  // Backfill subscription metadata with the resolved userId so webhook routing works.
  if (sub && !sub.metadata?.userId) {
    try {
      await stripe.subscriptions.update(sub.id, {
        metadata: { ...(sub.metadata || {}), userId: user.id },
      })
      sub.metadata = { ...(sub.metadata || {}), userId: user.id }
    } catch (err) {
      console.warn('[billing.complete] could not backfill sub metadata', err)
    }
  }

  if (sub) {
    await upsertSubscriptionFromStripe(sub)
  }

  if (needsPasswordSetup) {
    redirect(`/auth/setup?session_id=${encodeURIComponent(sessionId)}`)
  }

  // Existing account, already has a password → send to login.
  redirect(`/auth/login?email=${encodeURIComponent(email)}&billing=success`)
}

function renderError(message) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div className="card" style={{ maxWidth: 520, padding: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>{message}</p>
        <Link href="/pricing" className="btn btn-primary">Back to pricing</Link>
      </div>
    </div>
  )
}
