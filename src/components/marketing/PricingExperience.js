'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Check, Sparkles, ArrowLeft, LogIn, LogOut, ShieldCheck, RotateCcw, Zap } from 'lucide-react'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'
import { ESSENCE_PRICING as P } from '@/lib/essenceOffer'

const OFFER = { name: 'Full Access', tagline: 'The whole product. One simple plan.', highlights: ['Unlimited journal entries', 'Performance & playbook analytics', 'Multiple trading accounts', 'Guided CSV imports & exports', 'Rich notes & emotional check-ins', 'Weekly reviews & email summaries'] }

function PricingPageInner({ launch }) {
  const params = useSearchParams()
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'

  const qpInterval = params.get('interval')
  const qpPaywall = params.get('paywall')
  const qpCancel = params.get('billing') === 'cancel'

  const [interval, setInterval] = useState(qpInterval === 'month' ? 'month' : 'year')
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState(null)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const founding = interval === 'year' && launch.status !== 'ended'
  const preview = founding && launch.status !== 'active'

  useEffect(() => {
    if (!isAuthed) {
      setMe(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch('/api/billing/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setMe(d) })
      .catch(() => { if (!cancelled) setError('Could not load billing status. Please try again.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthed])

  const currentPlan = me?.plan || 'FREE'

  const startCheckout = async (plan) => {
    if (inFlight.current || preview) return
    inFlight.current = true
    setBusyPlan(plan)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval, founding }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.assign(data.url)
    } catch (e) {
      setError(e.message || 'Network error. Try again.')
      setBusyPlan(null)
      inFlight.current = false
    }
  }

  const openPortal = async () => {
    setBusyPlan('portal')
    setError('')
    try {
      const r = await fetch('/api/billing/portal', { method: 'POST' })
      const d = await r.json()
      if (r.ok && d.url) window.location.href = d.url
      else { setError(d.error || 'Could not open portal'); setBusyPlan(null) }
    } catch {
      setError('Network error. Try again.')
      setBusyPlan(null)
    }
  }

  const pickPlan = (plan) => {
    setError('')
    startCheckout(plan)
  }

  const priceFor = () => ({
    amount: interval === 'month' ? P.monthly : founding ? P.founding : P.annual,
    suffix: interval === 'month' ? '/month' : founding ? '/first year' : '/year',
  })
  const tiers = ['ULTIMATE']

  return (
    <div className="pricing-shell">
      <div className="pricing-atmosphere" />

      {/* Minimal top nav */}
      <div className="pricing-nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <BrandMonogram />
          <BrandWordmark />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isAuthed ? (
            <>
              <Link href="/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => signOut({ callbackUrl: '/' })}>
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-ghost btn-sm"><LogIn size={14} /> Log in</Link>
              <Link href="/auth/register" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>

      <div className="pricing-content">
        <div className="pricing-hero">
          <Link href={isAuthed ? '/dashboard' : '/'} className="pricing-back">
            <ArrowLeft size={14} /> {isAuthed ? 'Back to dashboard' : 'Back to home'}
          </Link>
          <span className="pricing-eyebrow">Pricing</span>
          <h1 className="pricing-title">
            Full access. <span className="gradient-text">One simple plan.</span>
          </h1>
          <p className="pricing-subtitle">
            Choose monthly or yearly billing. Both include the full product, with no feature tiers.
          </p>
        </div>

        {qpPaywall === '1' && (
          <div className="pricing-banner pricing-banner--info">
            Your account is currently on Free — upgrade to unlock the journal, analytics, and broker sync.
          </div>
        )}
        {qpCancel && (
          <div className="pricing-banner pricing-banner--error">
            Checkout canceled. No charge was made.
          </div>
        )}

        <div className="pricing-toggle-wrap">
          <div className="pricing-toggle" role="tablist" aria-label="Billing interval">
            <div className="pricing-toggle-pill" style={{ transform: interval === 'year' ? 'translateX(100%)' : 'translateX(0)' }} />
            {['month', 'year'].map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={interval === k}
                data-active={interval === k}
                onClick={() => { setInterval(k); setError('') }}
                disabled={Boolean(busyPlan)}
                className="pricing-toggle-btn"
              >
                {k === 'month' ? 'Monthly' : 'Yearly'}
                {k === 'year' && (
                  <span className="pricing-toggle-badge">{launch.status === 'ended' ? 'Save $81' : 'Launch offer'}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="pricing-banner pricing-banner--error" style={{ maxWidth: 440 }}>{error}</div>}

        <div className="pricing-card-wrap">
          {tiers.map((plan) => {
            const d = OFFER
            const price = priceFor(plan)
            const isCurrent = isAuthed && currentPlan !== 'FREE'
            return (
              <div key={plan} className="pricing-card">
                <span className="pricing-ribbon">
                  {founding ? <><Sparkles size={12} /> Founding offer</> : <><ShieldCheck size={12} /> Full access</>}
                </span>

                <h2 className="pricing-card-title">{d.name}</h2>
                <p className="pricing-card-tagline">{d.tagline}</p>

                <div className="pricing-price-row">
                  <span className="pricing-price-amount">${price.amount}</span>
                  {founding && <span className="pricing-price-strike">${P.annual}</span>}
                  <span className="pricing-price-suffix">{price.suffix} USD</span>
                </div>
                {founding && (
                  <span className="pricing-savings-badge">
                    <Zap size={12} /> Save ${P.discount} in year one
                  </span>
                )}

                <p className="pricing-billing-note">
                  {interval === 'month' ? '$15 billed monthly.' : founding ? '$59 billed upfront. Renews at $99/year.' : '$99 billed annually.'} Cancel renewal anytime. Taxes may apply.
                  {founding && <><br />{launch.status === 'active' ? `Founding enrollment ends ${new Date(launch.endsAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })} (UTC).` : 'Planned for the first 30 days of launch. Enrollment is not open yet.'}</>}
                </p>

                <div className="pricing-divider" />

                <ul className="pricing-features">
                  {d.highlights.map((h) => (
                    <li key={h} className="pricing-feature">
                      <span className="pricing-feature-icon"><Check size={12} strokeWidth={3} /></span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    className="btn btn-ghost pricing-btn"
                    onClick={openPortal}
                    disabled={busyPlan === 'portal'}
                  >
                    {busyPlan === 'portal' ? 'Opening…' : 'Manage billing'}
                  </button>
                ) : (
                  <button
                    className="btn pricing-cta pricing-btn"
                    onClick={() => pickPlan(plan)}
                    disabled={Boolean(busyPlan) || loading || status === 'loading' || preview}
                  >
                    {busyPlan === plan ? 'Redirecting…' : preview ? 'Founding enrollment opens at launch' : (
                      <>
                        <Sparkles size={15} />
                        {!isAuthed
                          ? `Get ${d.name}`
                          : currentPlan === 'FREE'
                            ? `Upgrade to ${d.name}`
                            : `Switch to ${d.name}`}
                      </>
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="pricing-trust-row">
          <span className="pricing-trust-item"><ShieldCheck size={14} /> Secured by Stripe</span>
          <span className="pricing-trust-item"><RotateCcw size={14} /> Cancel anytime</span>
          <span className="pricing-trust-item"><Zap size={14} /> Instant access</span>
        </div>

        {isAuthed && currentPlan !== 'FREE' && (
          <div className="pricing-manage">
            <button className="btn btn-ghost btn-sm" onClick={openPortal} disabled={busyPlan === 'portal'}>
              {busyPlan === 'portal' ? 'Opening…' : 'Manage billing / cancel'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PricingPage({ launch }) {
  return (
    <Suspense fallback={null}>
      <PricingPageInner launch={launch} />
    </Suspense>
  )
}
