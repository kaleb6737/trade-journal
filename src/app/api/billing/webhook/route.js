import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { upsertSubscriptionFromStripe } from '@/lib/syncStripeSubscription'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleSubscriptionDeleted(sub) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  })
  if (!existing) return
  await prisma.$transaction([
    prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: { status: 'canceled', cancelAtPeriodEnd: false },
    }),
    prisma.user.update({
      where: { id: existing.userId },
      data: { plan: 'FREE' },
    }),
  ])
}

export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe.webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const body = await req.text()
  const stripe = getStripe()

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('[stripe.webhook] bad signature', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object
        if (s.mode === 'subscription' && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof s.subscription === 'string' ? s.subscription : s.subscription.id,
          )
          if (!sub.metadata?.userId && s.metadata?.userId) {
            await stripe.subscriptions.update(sub.id, {
              metadata: { userId: s.metadata.userId, ...(sub.metadata || {}) },
            })
            sub.metadata = { ...sub.metadata, userId: s.metadata.userId }
          }
          await upsertSubscriptionFromStripe(sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await upsertSubscriptionFromStripe(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe.webhook] handler error', err)
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 })
  }
}
