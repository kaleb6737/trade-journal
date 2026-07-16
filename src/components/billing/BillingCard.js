'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, Sparkles } from 'lucide-react'

const PLAN_LABEL = { FREE: 'Free', PRO: 'Pro', ULTIMATE: 'Ultimate' }

export default function BillingCard() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = () => {
    fetch('/api/billing/me')
      .then((r) => r.json())
      .then((d) => setState(d))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const openPortal = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/billing/portal', { method: 'POST' })
      const d = await r.json()
      if (d.url) window.location.href = d.url
      else alert(d.error || 'Could not open billing portal')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="section-title">Plan & Billing</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  if (!state) return null

  const plan = state.plan || 'FREE'
  const sub = state.subscription
  const usage = state.usage || { trades: 0, accounts: 0 }
  const limits = state.limits || {}

  return (
    <div className="card" style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div className="section-title" style={{ marginBottom: 6 }}>Plan & Billing</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
          Manage your subscription, change plan, update payment method, or cancel.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          background: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: plan === 'FREE' ? 'rgba(255,255,255,0.05)' : 'rgba(212,175,55,0.12)',
            color: plan === 'FREE' ? 'var(--text-secondary)' : 'var(--gold-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {plan === 'FREE' ? <CreditCard size={18} /> : <Sparkles size={18} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {PLAN_LABEL[plan]} plan
            {sub?.interval && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: 13 }}> · billed {sub.interval}ly</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {sub?.currentPeriodEnd
              ? `${sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
              : plan === 'FREE'
                ? 'No subscription'
                : 'Status: ' + (sub?.status || 'unknown')}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Trades</div>
          <div style={{ fontWeight: 700 }}>
            {usage.trades}{limits.maxTrades != null ? ` / ${limits.maxTrades}` : ''}
          </div>
        </div>
        <div style={{ padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Accounts</div>
          <div style={{ fontWeight: 700 }}>
            {usage.accounts}{limits.maxAccounts != null ? ` / ${limits.maxAccounts}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {plan === 'FREE' ? (
          <Link href="/pricing" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <Sparkles size={15} /> Upgrade
          </Link>
        ) : (
          <>
            <button className="btn btn-primary" onClick={openPortal} disabled={busy} style={{ justifyContent: 'center' }}>
              <CreditCard size={15} /> {busy ? 'Opening…' : 'Manage billing'}
            </button>
            <Link href="/pricing" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              Change plan
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
