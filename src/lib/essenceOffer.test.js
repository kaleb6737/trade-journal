import { describe, expect, it, vi } from 'vitest'
import { ESSENCE_PRICING, launchWindow, verifiedOffer } from './essenceOffer'

const start = '2026-09-23T00:00:00Z'
const now = Date.parse(start) + 1000
const env = { ESSENCE_LAUNCH_START: start, STRIPE_PRICE_ESSENCE_MONTHLY: 'monthly', STRIPE_PRICE_ESSENCE_YEARLY: 'annual', STRIPE_COUPON_ESSENCE_FOUNDING: 'founding' }
function client(interval = 'year') {
  return { prices: { retrieve: vi.fn().mockResolvedValue({ id: interval === 'year' ? 'annual' : 'monthly', active: true, currency: 'usd', unit_amount: interval === 'year' ? 9900 : 1500, recurring: { interval, interval_count: 1, usage_type: 'licensed' }, product: 'journal' }) }, coupons: { retrieve: vi.fn().mockResolvedValue({ id: 'founding', valid: true, duration: 'once', currency: 'usd', amount_off: 4000, percent_off: null }) } }
}
describe('public Essence offer', () => {
  it('uses agreed prices', () => expect(ESSENCE_PRICING).toEqual({ monthly: 15, annual: 99, founding: 59, discount: 40 }))
  it('does not invent a launch deadline', () => expect(launchWindow('', now)).toEqual({ status: 'preview', endsAt: null }))
  it('opens for exactly 30 days', () => {
    expect(launchWindow(start, Date.parse(start) - 1).status).toBe('scheduled')
    expect(launchWindow(start, Date.parse(start)).status).toBe('active')
    expect(launchWindow(start, Date.parse(start) + 30 * 86400000).status).toBe('ended')
  })
  it('applies the first-invoice discount to the $99 recurring price', async () => {
    expect(await verifiedOffer(client(), 'year', true, env, now)).toEqual({ line_items: [{ price: 'annual', quantity: 1 }], discounts: [{ coupon: 'founding' }] })
  })
  it('leaves standard annual renewals undiscounted', async () => expect(await verifiedOffer(client(), 'year', false, env, now)).toEqual({ line_items: [{ price: 'annual', quantity: 1 }] }))
  it('uses $15 monthly without an annual coupon', async () => {
    const stripe = client('month')
    expect(await verifiedOffer(stripe, 'month', false, env, now)).toEqual({ line_items: [{ price: 'monthly', quantity: 1 }] })
    expect(stripe.coupons.retrieve).not.toHaveBeenCalled()
  })
  it('blocks checkout before launch', async () => expect(verifiedOffer(client(), 'year', true, { ...env, ESSENCE_LAUNCH_START: '' }, now)).rejects.toThrow('not open'))
  it('blocks founding discounts after the deadline', async () => expect(verifiedOffer(client(), 'year', true, env, now + 31 * 86400000)).rejects.toThrow('not open'))
  it('does not fall back to old prices', async () => expect(verifiedOffer(client(), 'year', false, {}, now)).rejects.toThrow('not available'))
  it('rejects mismatched Stripe amounts', async () => {
    const stripe = client(); stripe.prices.retrieve.mockResolvedValue({ active: true, currency: 'usd', unit_amount: 39000 })
    await expect(verifiedOffer(stripe, 'year', false, env, now)).rejects.toThrow('pricing needs updating')
  })
  it('rejects repeating discounts', async () => {
    const stripe = client(); stripe.coupons.retrieve.mockResolvedValue({ valid: true, duration: 'forever', currency: 'usd', amount_off: 4000 })
    await expect(verifiedOffer(stripe, 'year', true, env, now)).rejects.toThrow('discount needs updating')
  })
  it('rejects a coupon restricted to another product', async () => {
    const stripe = client(); const coupon = await stripe.coupons.retrieve(); stripe.coupons.retrieve.mockResolvedValue({ ...coupon, applies_to: { products: ['other'] } })
    await expect(verifiedOffer(stripe, 'year', true, env, now)).rejects.toThrow('discount needs updating')
  })
  it('rejects monthly founding discounts', async () => expect(verifiedOffer(client('month'), 'month', true, env, now)).rejects.toThrow('Invalid'))
})
