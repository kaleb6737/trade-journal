import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'

/** Load the user + their current subscription (if any). */
export async function loadBillingContext(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  })
  return user
}

/** Ensure a Stripe customer exists for this user, creating one lazily. */
export async function ensureStripeCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  })
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  })
  return customer.id
}
