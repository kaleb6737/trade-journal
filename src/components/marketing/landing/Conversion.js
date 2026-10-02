'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Trophy } from 'lucide-react'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'
import { ESSENCE_PRICING as P } from '@/lib/essenceOffer'
import { FADE_UP, STAGGER } from './shared'
import MagneticButton from './MagneticButton'

const FAQ = [
  { q: 'What does full access cost?', a: 'One full-access plan: $15/month or $99/year in USD. The founding offer is $59 for the first year during the first 30 days of launch, then renews at $99/year. Taxes may apply.' },
  { q: 'Can I import trades from my broker?', a: 'CSV import is supported for most broker exports. Map columns once and bulk-ingest history instead of retyping fills.' },
  { q: 'Where is my data stored?', a: 'Your data lives in the database configured for your deployment. Sessions follow NextAuth best practices with strong encryption.' },
  { q: 'Do you give financial advice?', a: 'No. TradeXEssence is software for journaling and analysis only — not investment, tax, or legal advice.' },
]

export default function Conversion({ launch }) {
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)
  const founding = launch.status !== 'ended'
  const amount = isYearly ? (founding ? P.founding : P.annual) : P.monthly

  return (
    <>
      {/* ── PRICING ── */}
      <section id="pricing" className="lp-pricing-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-section-head">
          <motion.h2 variants={FADE_UP} className="lp-section-title">Choose your edge.</motion.h2>
          <motion.div variants={FADE_UP} className="lp-pricing-toggle">
            <button onClick={() => setIsYearly(false)} className={`lp-toggle-btn${!isYearly ? ' active' : ''}`}>Monthly</button>
            <button onClick={() => setIsYearly(true)} className={`lp-toggle-btn${isYearly ? ' active' : ''}`}>
              Yearly <span className="lp-toggle-badge">{founding ? 'Launch offer' : 'Save $81'}</span>
            </button>
          </motion.div>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-pricing-grid lp-pricing-grid--single">
          <motion.div variants={FADE_UP} className="lp-price-card lp-price-card--featured">
            {isYearly && founding && <div className="lp-price-badge">FOUNDING OFFER</div>}
            <div className="lp-price-tier" style={{ color: 'var(--gold-primary)' }}>FULL ACCESS</div>
            <p className="lp-price-desc">The whole product. One simple plan.</p>
            <div className="lp-price-amount"><span className="lp-price-dollar">$</span><span className="lp-price-num">{amount}</span><span className="lp-price-per">{isYearly ? (founding ? '/first year' : '/year') : '/mo'}</span></div>
            <div className="lp-price-annual">
              {isYearly ? (founding ? '$59 USD upfront. Renews at $99/year.' : '$99 USD billed annually.') : '$15 USD billed monthly.'} Taxes may apply.
            </div>
            {isYearly && founding && <p className="lp-price-desc">
              {launch.status === 'active' ? `Founding enrollment ends ${new Date(launch.endsAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' })} (UTC).` : 'Planned for the first 30 days of launch. Enrollment is not open yet.'}
            </p>}
            <Link href={`/pricing?interval=${isYearly ? 'year' : 'month'}`} className="lp-price-btn lp-price-btn--gold">Get Full Access</Link>
            <ul className="lp-price-features">
              {['Unlimited journal entries', 'Performance & playbook analytics', 'Multiple trading accounts', 'Guided CSV imports & exports', 'Rich notes & emotional check-ins', 'Weekly reviews & email summaries'].map(f => (
                <li key={f}><Check size={16} style={{ color: 'var(--gold-primary)' }} />{f}</li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FAQ ── */}
      <section className="lp-faq-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-faq-inner">
          <motion.div variants={FADE_UP} className="lp-section-head" style={{ textAlign: 'left', marginBottom: 48 }}>
            <div className="hero-badge" style={{ marginBottom: 20 }}>FAQ</div>
            <h2 className="lp-section-title" style={{ textAlign: 'left' }}>Straight answers.</h2>
          </motion.div>
          <div className="lp-faq-list">
            {FAQ.map((item, i) => (
              <motion.div key={i} variants={FADE_UP} className={`lp-faq-item${openFaq === i ? ' open' : ''}`}>
                <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {item.q}
                  <ChevronDown size={18} className="lp-faq-chevron" />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                      className="lp-faq-a"
                    >
                      <div style={{ paddingBottom: 24 }}>{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-final-cta">
        <div className="lp-final-orb-1" aria-hidden />
        <div className="lp-final-orb-2" aria-hidden />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-final-inner">
          <motion.div variants={FADE_UP} className="hero-badge" style={{ margin: '0 auto 28px', fontSize: '0.85rem' }}>
            <Trophy size={14} /> Join thousands of traders
          </motion.div>
          <motion.h2 variants={FADE_UP} className="lp-final-h2">
            Stop guessing.<br />
            <span className="gradient-text gradient-text--anim">Start knowing.</span>
          </motion.h2>
          <motion.p variants={FADE_UP} className="lp-final-sub">
            Stop building spreadsheets. Start building edge. One plan. Full access. From $15/month USD.
          </motion.p>
          <motion.div variants={FADE_UP} className="lp-final-cta-btns">
            <MagneticButton>
              <Link href="/auth/register" className="btn btn-primary lp-btn-hero btn-glow">
                Get Started <ArrowRight size={18} />
              </Link>
            </MagneticButton>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BrandMonogram /><BrandWordmark />
            </div>
            <p>Professional trading journal software.<br />Log, tag, analyze — repeat.</p>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-heading">Product</span>
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-heading">Account</span>
            <Link href="/auth/login">Log in</Link>
            <Link href="/auth/register">Sign up</Link>
          </div>
          <div className="landing-footer-col">
            <span className="landing-footer-heading">Legal</span>
            <span className="landing-footer-muted">Not financial advice.</span>
            <span className="landing-footer-muted">Use at your own risk.</span>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} TradeXEssence. All rights reserved.</span>
        </div>
      </footer>
    </>
  )
}
