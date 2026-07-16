'use client'

import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'
import BrokerConnectShowcase from '@/components/auth/BrokerConnectShowcase'

export default function AuthSplitLayout({ children }) {
  return (
    <div className="auth-split-page">
      <div className="auth-split-bg" aria-hidden />
      <aside className="auth-split-aside">
        <Link href="/" className="auth-split-brand">
          <BrandMonogram />
          <BrandWordmark className="auth-split-wordmark" />
        </Link>

        <div className="auth-split-badge">
          <Sparkles size={14} strokeWidth={2.5} aria-hidden />
          Secure sign-in
        </div>

        <h1 className="auth-split-headline">
          Your journal.<br />
          <span className="gradient-text">Broker sync, staged.</span>
        </h1>
        <p className="auth-split-lead">
          After sign-in, connect <strong>Alpaca</strong> (API keys) or <strong>Tradovate</strong> (hosted login or API keys) on{' '}
          <strong>Accounts</strong> to sync fills into your journal. CSV import and manual accounts are always available.
        </p>

        <ul className="auth-split-checks">
          <li>
            <Check size={18} strokeWidth={2.5} className="auth-split-check-icon" aria-hidden />
            <span><strong>Alpaca</strong> &amp; <strong>Tradovate</strong> sync fills today; explore more venues in the interactive grid.</span>
          </li>
          <li>
            <Check size={18} strokeWidth={2.5} className="auth-split-check-icon" aria-hidden />
            <span><strong>Live now:</strong> CSV import, manual accounts, full analytics &amp; Essence score.</span>
          </li>
          <li>
            <Check size={18} strokeWidth={2.5} className="auth-split-check-icon" aria-hidden />
            <span>Black, gold, and teal — same premium shell as the marketing site.</span>
          </li>
        </ul>

        <BrokerConnectShowcase />
      </aside>

      <main className="auth-split-main">{children}</main>
    </div>
  )
}
