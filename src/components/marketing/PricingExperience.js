'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Check, Sparkles, ArrowLeft, LogIn, LogOut } from 'lucide-react'
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Minimal top nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
      }}>
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

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href={isAuthed ? '/dashboard' : '/'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 20 }}>
            <ArrowLeft size={14} /> {isAuthed ? 'Back to dashboard' : 'Back to home'}
          </Link>
          <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 10 }}>Full access. One simple plan.</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>
            Choose monthly or yearly billing. Both include the full product, with no feature tiers.
          </p>
        </div>

        {qpPaywall === '1' && (
          <div style={{
            background: 'rgba(232, 198, 106,0.1)', border: '1px solid rgba(232, 198, 106,0.35)',
            color: 'var(--gold-primary)', borderRadius: 10, padding: '12px 14px',
            marginBottom: 20, fontSize: 13, textAlign: 'center',
          }}>
            Your account is currently on Free — upgrade to unlock the journal, analytics, and broker sync.
          </div>
        )}
        {qpCancel && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
            color: 'var(--red)', borderRadius: 10, padding: '10px 14px',
            marginBottom: 20, fontSize: 13, textAlign: 'center',
          }}>
            Checkout canceled. No charge was made.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div role="tablist" aria-label="Billing interval" style={{
            display: 'inline-flex', padding: 4, borderRadius: 999,
            border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
          }}>
            {['month', 'year'].map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={interval === k}
                onClick={() => { setInterval(k); setError('') }}
                disabled={Boolean(busyPlan)}
                className={`btn ${interval === k ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '8px 18px', borderRadius: 999, minHeight: 0 }}
              >
                {k === 'month' ? 'Monthly' : 'Yearly'}
                {k === 'year' && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold-primary)' }}>{launch.status === 'ended' ? 'save $81' : 'launch offer'}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: 'var(--red)', borderRadius: 10, padding: '10px 14px',
            marginBottom: 16, fontSize: 13, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 520, margin: '0 auto' }}>
          {tiers.map((plan) => {
            const d = OFFER
            const price = priceFor(plan)
            const isFeatured = true
            const isCurrent = isAuthed && currentPlan !== 'FREE'
            return (
              <div key={plan} className="card" style={{
                display: 'flex', flexDirection: 'column', gap: 16, position: 'relative',
                border: isFeatured ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                boxShadow: isFeatured ? '0 10px 30px -15px rgba(232, 198, 106,0.35)' : undefined,
              }}>
                {isFeatured && (
                  <div style={{
                    position: 'absolute', top: -10, left: 16,
                    background: 'var(--gold-primary)', color: '#000',
                    fontWeight: 800, fontSize: 11, letterSpacing: 0.5,
                    padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
                  }}>
                    {founding ? 'Founding offer' : 'Full access'}
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{d.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{d.tagline}</div>
                </div>

                <div>
                  <span style={{ fontSize: 32, fontWeight: 800 }}>${price.amount}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 13 }}>{price.suffix} USD</span>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>
                  {interval === 'month' ? '$15 billed monthly.' : founding ? '$59 billed upfront. Renews at $99/year.' : '$99 billed annually.'} Cancel renewal anytime. Taxes may apply.
                  {founding && <><br />{launch.status === 'active' ? `Founding enrollment ends ${new Date(launch.endsAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })} (UTC).` : 'Planned for the first 30 days of launch. Enrollment is not open yet.'}</>}
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.highlights.map((h) => (
                    <li key={h} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5 }}>
                      <Check size={16} style={{ color: 'var(--gold-primary)', flexShrink: 0, marginTop: 2 }} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                  {isCurrent ? (
                    <button
                      className="btn btn-ghost"
                      onClick={openPortal}
                      disabled={busyPlan === 'portal'}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {busyPlan === 'portal' ? 'Opening…' : 'Manage billing'}
                    </button>
                  ) : (
                    <button
                      className={`btn ${isFeatured ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => pickPlan(plan)}
                      disabled={Boolean(busyPlan) || loading || status === 'loading' || preview}
                      style={{ width: '100%', justifyContent: 'center' }}
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
              </div>
            )
          })}
        </div>

        {isAuthed && currentPlan !== 'FREE' && (
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <button className="btn btn-ghost btn-sm" onClick={openPortal} disabled={busyPlan === 'portal'}>
              {busyPlan === 'portal' ? 'Opening…' : 'Manage billing / cancel'}
            </button>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 32, textAlign: 'center' }}>
          Payments processed securely by Stripe. Cancel anytime from the billing portal.
        </p>
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
