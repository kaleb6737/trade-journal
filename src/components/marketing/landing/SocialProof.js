'use client'

import { motion } from 'framer-motion'
import { Check, GitCompareArrows, Link2, Star, X } from 'lucide-react'
import { FADE_UP, STAGGER, handleSpotlight } from './shared'

const BROKERS = [
  'Interactive Brokers', 'Tradovate', 'NinjaTrader', 'ThinkorSwim', 'TradingView',
  'Webull', 'Robinhood', 'Apex Trader Funding', 'FTMO', 'MetaTrader', 'Tastytrade', 'Charles Schwab',
]

const COMPARE_ROWS = [
  { label: 'Import 6 months of fills', sheet: '2+ hours', us: 'Under 2 minutes' },
  { label: 'Playbook win-rate breakdown', sheet: false, us: true },
  { label: 'Behavioral & emotion tagging', sheet: false, us: true },
  { label: 'Prop firm drawdown tracking', sheet: false, us: true },
  { label: 'Multi-account consolidation', sheet: 'Manual formulas', us: true },
  { label: 'Updates itself as you trade', sheet: false, us: true },
]

const TESTIMONIALS = [
  {
    quote: 'Finally a journal that feels built for performance review, not data entry. The analytics actually match how I think about my book.',
    name: 'Morgan K.', role: 'Swing Trader · Equities', rating: 5,
  },
  {
    quote: 'Multi-account and tagging without friction. I can see prop vs personal behavior in one place. This replaced my entire Excel setup.',
    name: 'Jordan L.', role: 'Day Trader · Futures', rating: 5,
  },
  {
    quote: 'The Essence score and heatmap made my weekly review ten minutes instead of an hour. The black-and-gold UI is elite too.',
    name: 'Riley T.', role: 'Part-time · Options', rating: 5,
  },
]

export default function SocialProof() {
  return (
    <>
      {/* ── BROKER COMPATIBILITY ── */}
      <section className="lp-compat-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP} className="lp-compat-eyebrow">
          <Link2 size={13} /> Works with every major broker &amp; prop firm
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-compat-list">
          {BROKERS.map(b => (
            <motion.span key={b} variants={FADE_UP} className="lp-compat-item">{b}</motion.span>
          ))}
        </motion.div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="lp-compare-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-section-head">
          <motion.div variants={FADE_UP} className="hero-badge" style={{ margin: '0 auto 20px' }}>
            <GitCompareArrows size={14} /> The Alternative
          </motion.div>
          <motion.h2 variants={FADE_UP} className="lp-section-title">Retire the spreadsheet.</motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP} className="lp-compare-grid">
          <div className="lp-compare-col">
            <div className="lp-compare-col-head">Spreadsheets</div>
            {COMPARE_ROWS.map(r => (
              <div key={r.label} className="lp-compare-row">
                <span>{r.label}</span>
                {typeof r.sheet === 'boolean'
                  ? <X size={16} className="lp-compare-x" />
                  : <span className="lp-compare-note">{r.sheet}</span>}
              </div>
            ))}
          </div>
          <div className="lp-compare-col lp-compare-col--featured">
            <div className="lp-compare-col-head lp-compare-col-head--gold">TradeXEssence</div>
            {COMPARE_ROWS.map(r => (
              <div key={r.label} className="lp-compare-row">
                <span>{r.label}</span>
                {typeof r.us === 'boolean'
                  ? <Check size={16} className="lp-compare-check" />
                  : <span className="lp-compare-note lp-compare-note--gold">{r.us}</span>}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-testimonials-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-section-head">
          <motion.div variants={FADE_UP} className="hero-badge" style={{ margin: '0 auto 20px' }}>
            <Star size={13} /> Trusted by Traders
          </motion.div>
          <motion.h2 variants={FADE_UP} className="lp-section-title">What traders say.</motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={STAGGER} className="lp-testimonials-grid">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} variants={FADE_UP} className="lp-testimonial-card" onMouseMove={handleSpotlight}>
              <div className="lp-stars">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={14} fill="var(--gold-primary)" color="var(--gold-primary)" />
                ))}
              </div>
              <p className="lp-testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <div className="lp-testimonial-author">
                <div className="lp-testimonial-avatar">{t.name[0]}</div>
                <div>
                  <div className="lp-testimonial-name">{t.name}</div>
                  <div className="lp-testimonial-role">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </>
  )
}
