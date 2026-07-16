'use client'

import { Suspense, useState } from 'react'
import dynamic from 'next/dynamic'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout'

const GoogleSignInButton = dynamic(
  () => import('@/components/auth/GoogleSignInButton'),
  { ssr: false, loading: () => null }
)

const PAID_PLANS = ['PRO', 'ULTIMATE']

function RegisterPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const qpPlan = params.get('plan')
  const qpInterval = params.get('interval') === 'month' ? 'month' : 'year'
  const nextPlan = PAID_PLANS.includes(qpPlan) ? qpPlan : null

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const postAuthDestination = () => {
    if (nextPlan) {
      const q = new URLSearchParams({ plan: nextPlan, interval: qpInterval, auto: '1' }).toString()
      return `/pricing?${q}`
    }
    // No paid plan chosen yet — funnel new signups through pricing so they subscribe.
    return '/pricing'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return }

      await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      router.push(postAuthDestination())
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-card auth-card--split animate-fade-in">
        <p className="auth-card-kicker">Get started</p>
        <h1 className="auth-title" style={{ marginBottom: 6 }}>Create your TradeXEssence account</h1>
        <p className="auth-subtitle" style={{ marginBottom: 24 }}>
          {nextPlan
            ? `Next step: checkout for the ${nextPlan === 'PRO' ? 'Pro' : 'Ultimate'} plan (${qpInterval === 'month' ? 'Monthly' : 'Yearly'}).`
            : 'Create your account, then choose a plan to unlock the journal.'}
        </p>

        <GoogleSignInButton label="Sign up with Google" />

        <div className="auth-divider">or register with email</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Jordan Trader"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="trader@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Repeat password"
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              required
            />
          </div>

          {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

          <button
            id="register-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, height: 48, fontSize: '0.9375rem' }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                Create account
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 24 }}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  )
}
