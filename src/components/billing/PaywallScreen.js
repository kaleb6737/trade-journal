'use client'

import Link from 'next/link'
import { Lock, Sparkles, Check } from 'lucide-react'
import { PLAN_DISPLAY } from '@/lib/plans'

/**
 * Shown inside the AppShell when the signed-in user is on the FREE plan.
 * FREE users can still see the sidebar + nav, but every page becomes this
 * upgrade wall until they subscribe.
 */
export default function PaywallScreen({ plan = 'FREE' }) {
  return (
    <div className="page-wrapper" style={{ maxWidth: 820 }}>
      <div
        className="card"
        style={{
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          border: '1px solid var(--gold-primary)',
          boxShadow: '0 10px 40px -20px rgba(232, 198, 106,0.45)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: 24,
            background: 'var(--gold-primary)',
            color: '#000',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            padding: '4px 10px',
            borderRadius: 6,
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Lock size={12} /> Upgrade required
        </div>

        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
            You&apos;re on the {plan.charAt(0) + plan.slice(1).toLowerCase()} plan
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            TradeXEssence is a paid tool — the journal, analytics, playbooks, and broker sync all
            require a Pro or Ultimate subscription. Pick a plan to start logging trades.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginTop: 6,
          }}
        >
          {['PRO', 'ULTIMATE'].map((p) => {
            const d = PLAN_DISPLAY[p]
            const featured = p === 'PRO'
            return (
              <div
                key={p}
                style={{
                  border: featured ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{d.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    from ${d.monthlyPriceUsd}/mo
                  </div>
                </div>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {d.highlights.slice(0, 4).map((h) => (
                    <li key={h} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Check size={14} style={{ color: 'var(--gold-primary)', flexShrink: 0, marginTop: 2 }} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
          <Link
            href="/pricing"
            className="btn btn-primary"
            style={{ padding: '12px 20px', justifyContent: 'center' }}
          >
            <Sparkles size={15} /> See plans
          </Link>
          <Link
            href="/pricing?plan=PRO&interval=year"
            className="btn btn-ghost"
            style={{ padding: '12px 20px', justifyContent: 'center' }}
          >
            Go Pro yearly ($190)
          </Link>
          <Link
            href="/pricing?plan=ULTIMATE&interval=year"
            className="btn btn-ghost"
            style={{ padding: '12px 20px', justifyContent: 'center' }}
          >
            Go Ultimate yearly ($390)
          </Link>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
          Your account stays here — you can cancel anytime from the billing portal after you subscribe.
        </p>
      </div>
    </div>
  )
}
