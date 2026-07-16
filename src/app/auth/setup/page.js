'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import AuthSplitLayout from '@/components/auth/AuthSplitLayout'

function SetupPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get('session_id') || ''

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [infoError, setInfoError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setInfoError('Missing checkout session. Open the link from your confirmation page.')
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/auth/setup-info?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok) {
          setInfoError(data.error || 'Could not verify your checkout session.')
        } else if (!data.needsPassword) {
          // Already finalized — send to login with email prefilled.
          router.replace(`/auth/login?email=${encodeURIComponent(data.email || '')}&billing=success`)
          return
        } else {
          setEmail(data.email || '')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sessionId, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not finalize your account.')
        setSubmitting(false)
        return
      }
      const signInRes = await signIn('credentials', {
        email: data.email || email,
        password,
        redirect: false,
      })
      if (signInRes?.error) {
        setError('Account created, but sign in failed. Please use the login page.')
        setSubmitting(false)
        return
      }
      router.push('/dashboard')
    } catch {
      setError('Network error. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <div className="auth-card auth-card--split animate-fade-in">
        <p className="auth-card-kicker" style={{ color: 'var(--green)' }}>
          <CheckCircle2 size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
          Payment successful
        </p>
        <h1 className="auth-title" style={{ marginBottom: 6 }}>Set a password to finish</h1>
        <p className="auth-subtitle" style={{ marginBottom: 24 }}>
          {loading
            ? 'Verifying your subscription…'
            : email
              ? `Your subscription for ${email} is active. Pick a password so you can sign in next time.`
              : 'Pick a password to secure your account.'}
        </p>

        {infoError ? (
          <div className="form-error" style={{ textAlign: 'center', marginBottom: 14 }}>{infoError}</div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
            <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="setup-email">Email</label>
              <input
                id="setup-email"
                type="email"
                className="form-input"
                value={email}
                readOnly
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="setup-password">Password</label>
              <input
                id="setup-password"
                type="password"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="setup-confirm">Confirm password</label>
              <input
                id="setup-confirm"
                type="password"
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="form-error" style={{ textAlign: 'center' }}>{error}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 4, height: 48, fontSize: '0.9375rem' }}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : (
                <>Finish setup <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer" style={{ marginTop: 24 }}>
          Need help? <Link href="/auth/login">Sign in instead</Link>
        </div>
      </div>
    </AuthSplitLayout>
  )
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupPageInner />
    </Suspense>
  )
}
