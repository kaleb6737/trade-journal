// Public offer: one feature set, two billing intervals. Legacy plans stay intact.
export const ESSENCE_PRICING = { monthly: 15, annual: 99, founding: 59, discount: 40 }

export function launchWindow(start = process.env.ESSENCE_LAUNCH_START, now = Date.now()) {
  const begins = start ? Date.parse(start) : NaN
  if (!Number.isFinite(begins)) return { status: 'preview', endsAt: null }
  const ends = begins + 30 * 86400000
  return { status: now < begins ? 'scheduled' : now < ends ? 'active' : 'ended', endsAt: new Date(ends).toISOString() }
}

export async function verifiedOffer(stripe, interval, founding, env = process.env, now = Date.now()) {
  if (!['month', 'year'].includes(interval) || typeof founding !== 'boolean' || (founding && interval !== 'year')) throw new Error('Invalid billing selection.')
  if (founding && launchWindow(env.ESSENCE_LAUNCH_START, now).status !== 'active') throw new Error('The founding offer is not open. Please review the current pricing before continuing.')
  const id = interval === 'month' ? env.STRIPE_PRICE_ESSENCE_MONTHLY : env.STRIPE_PRICE_ESSENCE_YEARLY
  if (!id) throw new Error('Checkout for this offer is not available yet. No payment has been taken.')
  const price = await stripe.prices.retrieve(id)
  const amount = (interval === 'month' ? ESSENCE_PRICING.monthly : ESSENCE_PRICING.annual) * 100
  if (!price.active || price.currency !== 'usd' || price.unit_amount !== amount || price.recurring?.interval !== interval || price.recurring?.interval_count !== 1 || price.recurring?.usage_type !== 'licensed') throw new Error('Checkout pricing needs updating. No payment has been taken.')
  let discounts
  if (founding) {
    if (!env.STRIPE_COUPON_ESSENCE_FOUNDING) throw new Error('The founding discount is not configured yet. No payment has been taken.')
    const coupon = await stripe.coupons.retrieve(env.STRIPE_COUPON_ESSENCE_FOUNDING)
    const product = typeof price.product === 'string' ? price.product : price.product?.id
    if (!coupon.valid || coupon.duration !== 'once' || coupon.currency !== 'usd' || coupon.amount_off !== ESSENCE_PRICING.discount * 100 || coupon.percent_off != null || (coupon.applies_to?.products && !coupon.applies_to.products.includes(product))) throw new Error('The founding discount needs updating. No payment has been taken.')
    discounts = [{ coupon: coupon.id }]
  }
  return { line_items: [{ price: id, quantity: 1 }], ...(discounts ? { discounts } : {}) }
}
