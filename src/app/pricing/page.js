'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Check, Sparkles, ArrowLeft, LogIn, LogOut } from 'lucide-react'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'
import { PLAN_DISPLAY } from '@/lib/plans'

const PAID_PLANS = ['PRO', 'ULTIMATE']

function PricingPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: session, status } = useSession()
  const isAuthed = status === 'authenticated'

  const qpPlan = params.get('plan')
  const qpInterval = params.get('interval')
  const qpAuto = params.get('auto')
  const qpPaywall = params.get('paywall')
  const qpCancel = params.get('billing') === 'cancel'

  const [interval, setInterval] = useState(qpInterval === 'month' ? 'month' : 'year')
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState(null)
  const [error, setError] = useState('')
  const autoFiredRef = useRef(false)

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
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthed])

  const currentPlan = me?.plan || 'FREE'

  const startCheckout = async (plan, ivl = interval) => {
    setBusyPlan(plan)
    setError('')
    const endpoint = isAuthed ? '/api/billing/checkout' : '/api/billing/checkout-guest'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: ivl }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else if (res.status === 401 && data.code === 'STALE_SESSION') {
        // Auth cookie references a user that no longer exists (e.g. after a
        // DB reset). Sign out and fall back to guest checkout automatically.
        await signOut({ redirect: false })
        const guest = await fetch('/api/billing/checkout-guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, interval: ivl }),
        })
        const gd = await guest.json()
        if (guest.ok && gd.url) { window.location.href = gd.url; return }
        setError(gd.error || 'Could not start checkout')
        setBusyPlan(null)
      } else {
        setError(data.error || 'Could not start checkout')
        setBusyPlan(null)
      }
    } catch {
      setError('Network error. Try again.')
      setBusyPlan(null)
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

  // `?plan=...&auto=1` auto-triggers Stripe Checkout once we know the user's
  // auth state (guest vs signed-in). Used by landing-page CTAs.
  useEffect(() => {
    if (status === 'loading' || loading || autoFiredRef.current) return
    if (qpAuto !== '1' || !qpPlan || !PAID_PLANS.includes(qpPlan)) return
    if (isAuthed && currentPlan === qpPlan) return
    autoFiredRef.current = true
    startCheckout(qpPlan, qpInterval === 'month' ? 'month' : 'year')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAuthed, loading, qpAuto, qpPlan, qpInterval, currentPlan])

  const priceFor = (plan) => {
    const d = PLAN_DISPLAY[plan]
    if (!d) return { amount: 0, suffix: '' }
    const amount = interval === 'year' ? d.yearlyPriceUsd : d.monthlyPriceUsd
    return { amount, suffix: interval === 'year' ? '/year' : '/month' }
  }

  const tiers = useMemo(() => PAID_PLANS.map((p) => PLAN_DISPLAY[p] && p).filter(Boolean), [])

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
          <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 10 }}>Pick your plan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>
            TradeXEssence is paid software. Log in to browse, but you&apos;ll need Pro or Ultimate to track real trades.
          </p>
        </div>

        {qpPaywall === '1' && (
          <div style={{
            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.35)',
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
                onClick={() => setInterval(k)}
                className={`btn ${interval === k ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '8px 18px', borderRadius: 999, minHeight: 0 }}
              >
                {k === 'month' ? 'Monthly' : 'Yearly'}
                {k === 'year' && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--gold-primary)' }}>save ~17%</span>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 760, margin: '0 auto' }}>
          {tiers.map((plan) => {
            const d = PLAN_DISPLAY[plan]
            const price = priceFor(plan)
            const isFeatured = plan === 'PRO'
            const isCurrent = isAuthed && currentPlan === plan
            return (
              <div key={plan} className="card" style={{
                display: 'flex', flexDirection: 'column', gap: 16, position: 'relative',
                border: isFeatured ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                boxShadow: isFeatured ? '0 10px 30px -15px rgba(212,175,55,0.35)' : undefined,
              }}>
                {isFeatured && (
                  <div style={{
                    position: 'absolute', top: -10, left: 16,
                    background: 'var(--gold-primary)', color: '#000',
                    fontWeight: 800, fontSize: 11, letterSpacing: 0.5,
                    padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
                  }}>
                    Most popular
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{d.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{d.tagline}</div>
                </div>

                <div>
                  <span style={{ fontSize: 32, fontWeight: 800 }}>${price.amount}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 13 }}>{price.suffix}</span>
                </div>

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
                      disabled={Boolean(busyPlan) || loading}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {busyPlan === plan ? 'Redirecting…' : (
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

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageInner />
    </Suspense>
  )
}
