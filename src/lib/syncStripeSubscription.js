import { prisma } from '@/lib/prisma'
import { planFromPriceId } from '@/lib/plans'

/**
 * Upsert a local `Subscription` + materialize `User.plan` from a Stripe
 * Subscription object. Safe to call from either webhooks or on-demand sync
 * (e.g. the /billing/complete redirect after checkout).
 */
export async function upsertSubscriptionFromStripe(sub) {
  if (!sub) return null
  const priceId = sub.items?.data?.[0]?.price?.id
  const mapped = planFromPriceId(priceId)
  if (!mapped) {
    console.warn('[billing.sync] unknown priceId', priceId)
    return null
  }

  const userId = sub.metadata?.userId
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : customerId
      ? await prisma.user.findFirst({ where: { stripeCustomerId: customerId } })
      : null
  if (!user) {
    console.warn('[billing.sync] no matching user for sub', sub.id)
    return null
  }

  const active = ['active', 'trialing', 'past_due'].includes(sub.status)
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null

  // NOTE: `Subscription.userId` is `@unique` (one live sub per user), so we
  // upsert keyed on userId — not stripeSubscriptionId. A user may roll through
  // several Stripe subscription ids over time (cancel + new checkout, Checkout
  // retries in dev, etc.); we just overwrite the row with whatever Stripe
  // says is current. If some *other* user's row already owns this
  // stripeSubscriptionId we log + skip rather than corrupt the link.
  const collidingSub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
    select: { userId: true },
  })
  if (collidingSub && collidingSub.userId !== user.id) {
    console.warn(
      '[billing.sync] stripeSubscriptionId',
      sub.id,
      'already owned by another user; ignoring',
    )
    return { userId: user.id, plan: user.plan || 'FREE' }
  }

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        plan: mapped.plan,
        interval: mapped.interval,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
      update: {
        stripeSubscriptionId: sub.id,
        stripeCustomerId: customerId,
        stripePriceId: priceId,
        plan: mapped.plan,
        interval: mapped.interval,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        plan: active ? mapped.plan : 'FREE',
        stripeCustomerId: customerId,
      },
    }),
  ])

  return { userId: user.id, plan: active ? mapped.plan : 'FREE' }
}
