'use client'

import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout'
import { BrokerLoginStrip } from '@/components/auth/BrokerConnectShowcase'

const GoogleSignInButton = dynamic(
  () => import('@/components/auth/GoogleSignInButton'),
  { ssr: false, loading: () => null }
)

function LoginPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const billingSuccess = params.get('billing') === 'success'
  const staleSession = params.get('reason') === 'stale-session'

  // Prefill email from query (e.g. coming back from Stripe Checkout).
  useEffect(() => {
    const qpEmail = params.get('email')
    if (qpEmail) setForm((p) => ({ ...p, email: qpEmail }))
  }, [params])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })
      if (res?.error) { setError('Invalid email or password'); setLoading(false); return }
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-card auth-card--split animate-fade-in">
        <p className="auth-card-kicker">Welcome back</p>
        <h1 className="auth-title" style={{ marginBottom: 6 }}>Sign in to TradeXEssence</h1>
        <p className="auth-subtitle" style={{ marginBottom: 20 }}>
          Access your journal, analytics, and broker connections.
        </p>

        {billingSuccess && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--green-muted)', color: 'var(--green)',
            padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            marginBottom: 16,
          }}>
            <CheckCircle2 size={14} /> Subscription active — sign in to continue.
          </div>
        )}

        {staleSession && (
          <div style={{
            background: 'rgba(251, 191, 36, 0.1)', color: 'var(--yellow, #f59e0b)',
            padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            marginBottom: 16, lineHeight: 1.45,
          }}>
            Your session is out of date. Please sign in again to refresh it.
          </div>
        )}

        <BrokerLoginStrip />

        <GoogleSignInButton />

        <div className="auth-divider">or email</div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="trader@example.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4, height: 48, fontSize: '0.9375rem' }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                Continue to dashboard
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 20, marginBottom: 0 }}>
          New to TradeXEssence? Create an account and connect brokers from <strong>Accounts</strong> after you sign in.
        </p>

        <div className="auth-footer" style={{ marginTop: 16 }}>
          Don&apos;t have an account? <Link href="/auth/register">Create one free</Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
