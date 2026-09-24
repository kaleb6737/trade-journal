# Landing page and one-plan launch offer

## Design

The public home and pricing pages retain the original black-and-gold design,
components, animation and global styles. The experimental charcoal/chartreuse
redesign was removed at the user's request. Changes are limited to pricing,
offer terms and related signup copy. Browser zoom is no longer disabled.

Original section coverage retained: hero and sample dashboard, feature ribbon,
statistics band, stage selector, bento features, testimonial cards, pricing, FAQ,
closing CTA and footer. Original marketing claims and testimonials are restored
as supplied; they have not been verified. Verify or replace those claims and
quotes before publishing.

## Prices (USD)

- Monthly: $15, recurring monthly.
- Standard annual: $99, recurring yearly.
- Founding: $59 first year, then $99/year; enrollment during the configured first
  30 days of launch. No fabricated deadline when the date is absent.

The public offer grants the existing ULTIMATE feature set. Legacy PRO/ULTIMATE
subscriptions, price IDs and entitlements are preserved; existing subscriptions
are not migrated or repriced. `/pricing` now shows one public offer, not tiers.

## Stripe configuration still required

No Stripe products, prices, coupons, secrets, or live subscriptions were changed.
Create/configure the following separately in the correct test/live Stripe mode:

| Environment variable | Required value |
| --- | --- |
| `STRIPE_PRICE_ESSENCE_MONTHLY` | Active USD 1500-cent price, monthly, interval_count 1, licensed |
| `STRIPE_PRICE_ESSENCE_YEARLY` | Active USD 9900-cent price, yearly, interval_count 1, licensed |
| `STRIPE_COUPON_ESSENCE_FOUNDING` | Valid USD 4000-cent amount-off coupon, duration `once`, applicable to the product |
| `ESSENCE_LAUNCH_START` | Actual agreed launch instant in ISO-8601 UTC, e.g. a value ending in Z; do not use a fictional launch date |

With no launch date, the website previews the planned offer and disables founding
enrollment. After the 30-day window it displays $99 annually. Monthly checkout
can operate independently once its verified price is configured.

New public checkout uses `/api/billing/checkout-offer`, validates price and coupon
amounts server-side, then reuses the existing completion/webhook subscription
flow. It never silently falls back to old plan prices or removes the promised
discount. Authenticated users with an existing non-canceled subscription are
directed to billing management rather than creating a second subscription.

Run an end-to-end TEST checkout, completion, webhook, renewal and cancellation
check before live launch. Legacy checkout endpoints and billing management are
unchanged. One-time coupon behavior reference:
https://docs.stripe.com/billing/subscriptions/coupons

## Verification

`npm test` covers offer amounts, window boundaries, missing configuration,
incorrect Stripe prices/coupons, and non-founding options. No live financial
transaction has been performed. Browser QA was blocked by the browser approval
system in this session; mobile visuals, journey tabs and focus
behavior still need a browser pass.
