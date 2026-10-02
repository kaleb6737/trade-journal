'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { FADE_UP, STAGGER, handleSpotlight, useCountUp, useScrolled } from './shared'
import MagneticButton from './MagneticButton'

const MARQUEE_ITEMS_TEXT = [
  'Playbook Analytics', 'Equity Curves', 'P&L Calendar', 'Prop Firm Ready',
  'Multi-Account', 'Custom Tagging', 'Win Rate Tracking', 'Streak Heatmap',
  'Essence Score', 'Behavioral Analysis', 'Broker Sync', 'Timing Breakdown',
]

const TICKER = [
  { sym: 'NVDA', px: '$142.18', chg: '+2.4%', up: true },
  { sym: 'ES', px: '5,982.25', chg: '+0.6%', up: true },
  { sym: 'TSLA', px: '$248.90', chg: '−1.2%', up: false },
  { sym: 'NQ', px: '21,340.5', chg: '+0.9%', up: true },
  { sym: 'AAPL', px: '$231.44', chg: '+0.3%', up: true },
  { sym: 'BTC', px: '$67,120', chg: '−0.8%', up: false },
  { sym: 'SPY', px: '$598.11', chg: '+0.5%', up: true },
  { sym: 'AMD', px: '$164.72', chg: '+1.8%', up: true },
]

export default function Hero() {
  const navScrolled = useScrolled()
  const heroRef = useRef(null)
  const { scrollYProgress: pageProgress } = useScroll()
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  const [t0, ref0] = useCountUp(500000)
  const [t1, ref1] = useCountUp(34)
  const [t2, ref2] = useCountUp(60)
  const [t3, ref3] = useCountUp(12)
  const statsRefs = [ref0, ref1, ref2, ref3]
  const statsValues = [t0, t1, t2, t3]

  return (
    <>
      <motion.div className="lp-scroll-progress" style={{ scaleX: pageProgress }} aria-hidden />

      {/* ── NAV ── */}
      <nav className={`landing-nav lp-nav${navScrolled ? ' lp-nav--scrolled' : ''}`}>
        <div className="landing-nav-left">
          <Link href="/" className="landing-logo-link">
            <BrandMonogram /><BrandWordmark />
          </Link>
        </div>
        <div className="landing-nav-cta">
          <Link href="/pricing" className="btn btn-ghost btn-sm lp-nav-link">Pricing</Link>
          <Link href="/auth/login" className="btn btn-ghost btn-sm lp-nav-link">Log In</Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">
            Get Started <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="landing-hero lp-hero" onMouseMove={handleSpotlight}>
        <div className="hero-grid-bg" aria-hidden />
        <div className="hero-dots" aria-hidden />
        <div className="lp-hero-aurora" aria-hidden />
        <div className="hero-orb hero-orb-1" aria-hidden />
        <div className="lp-hero-orb-2" aria-hidden />
        <div className="lp-hero-spotlight" aria-hidden />

        <motion.div
          initial="hidden" animate="visible" variants={STAGGER}
          className="lp-hero-text"
        >
          <motion.div variants={FADE_UP} className="hero-badge">
            <span className="lp-live-dot" aria-hidden />
            The Performance Journal Built for Serious Traders
          </motion.div>

          <motion.h1 variants={FADE_UP} className="lp-hero-h1">
            Your edge lives<br />
            in the <span className="gradient-text gradient-text--anim lp-gold-span">data you admit.</span>
          </motion.h1>

          <motion.p variants={FADE_UP} className="lp-hero-sub">
            Log trades automatically, dissect your performance, and build repeatable systems.
            TradeXEssence turns raw fills into profitable habits.
          </motion.p>

          <motion.div variants={FADE_UP} className="lp-hero-cta">
            <MagneticButton>
              <Link href="/auth/register" className="btn btn-primary lp-btn-hero btn-glow">
                Explore Full Access <ArrowRight size={18} />
              </Link>
            </MagneticButton>
            <Link href="#tour" className="btn btn-ghost lp-btn-ghost-hero">
              See How It Works
            </Link>
          </motion.div>

          <motion.div variants={FADE_UP} className="lp-hero-trust">
            {['One full-access plan', '$15/month USD', 'Cancel renewal anytime'].map(t => (
              <span key={t} className="lp-trust-item">
                <Check size={13} /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Live ticker strip */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" className="hero-ticker-strip lp-hero-ticker">
          <div className="hero-ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="hero-ticker-item">
                <span className="hero-ticker-sym">{t.sym}</span>
                <span className="hero-ticker-px">{t.px}</span>
                <span className={`hero-ticker-chg ${t.up ? 'up' : 'down'}`}>{t.chg}</span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* 3D Preview */}
        <motion.div
          className="hero-perspective"
          style={{ y: heroY, opacity: heroOpacity }}
          initial={{ opacity: 0, y: 80, rotateX: 22 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        >
          <div className="hero-3d-wrap">
            <div className="hero-3d-content" />
            <div className="landing-preview-scanline" />

            {/* Floating trade cards */}
            <div className="hero-float-card hero-float-card--1">
              <div className="hero-float-card-inner">
                <span className="hero-float-sym">NVDA</span>
                <span className="hero-float-side hero-float-side--long">LONG</span>
              </div>
              <div className="hero-float-pnl hero-float-pnl--win">+$2,340</div>
              <div className="hero-float-label">Today · Closed</div>
            </div>
            <div className="hero-float-card hero-float-card--2">
              <div className="hero-float-card-inner">
                <span className="hero-float-sym">ES</span>
                <span className="hero-float-side hero-float-side--short">SHORT</span>
              </div>
              <div className="hero-float-pnl hero-float-pnl--win">+$875</div>
              <div className="hero-float-label">Win Rate 74%</div>
            </div>
            <div className="hero-float-card hero-float-card--3">
              <div className="hero-float-card-inner">
                <span className="hero-float-sym">AAPL</span>
                <span className="hero-float-side hero-float-side--long">LONG</span>
              </div>
              <div className="hero-float-pnl hero-float-pnl--loss">−$180</div>
              <div className="hero-float-label">Avg Loss Tracked</div>
            </div>
            <div className="hero-float-card hero-float-card--4">
              <div className="hero-float-card-inner">
                <span className="hero-float-sym">NQ</span>
                <span className="hero-float-side hero-float-side--long">LONG</span>
              </div>
              <div className="hero-float-pnl hero-float-pnl--win">+$1,560</div>
              <div className="hero-float-label">Essence Score 91</div>
            </div>

            {/* Dashboard preview */}
            <div className="lp-preview-inner">
              <div className="landing-preview-chrome">
                <span className="landing-preview-dot" />
                <span className="landing-preview-dot" />
                <span className="landing-preview-dot" />
                <span className="landing-preview-url">app.tradexessence.com</span>
              </div>
              <div className="lp-preview-body">
                <div className="lp-preview-stats">
                  {[
                    { l: 'Net P&L', v: '+$14,285', c: 'var(--green)' },
                    { l: 'Win Rate', v: '72.4%', c: 'var(--gold-primary)' },
                    { l: 'Profit Factor', v: '2.41', c: 'var(--blue, #60a5fa)' },
                    { l: 'Trades', v: '342', c: 'var(--text-primary)' },
                  ].map(s => (
                    <div key={s.l} className="lp-preview-stat">
                      <div className="lp-preview-stat-label">{s.l}</div>
                      <div className="lp-preview-stat-value" style={{ color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="lp-preview-charts">
                  <div className="lp-preview-chart-main">
                    <div className="lp-preview-chart-title">Equity Curve</div>
                    <div className="landing-preview-bars">
                      {[25,30,28,38,35,45,40,52,48,60,55,65,58,70,64,75,68,80,72,83,76,87,80,90,82,93,85,95,88,98].map((h, i) => (
                        <div key={i} className="landing-preview-bar" style={{ height: `${h}%`, background: `linear-gradient(to top, #E8C66A, rgba(232, 198, 106,${0.3 + (i/30)*0.7}))` }} />
                      ))}
                    </div>
                  </div>
                  <div className="lp-preview-chart-side">
                    <div className="lp-preview-chart-title">Recent</div>
                    {[{ s: 'NVDA', p: '+$1,240', w: true }, { s: 'AAPL', p: '+$450', w: true }, { s: 'NQ', p: '−$200', w: false }].map(t => (
                      <div key={t.s} className="lp-preview-trade-row">
                        <span className="lp-preview-sym">{t.s}</span>
                        <span style={{ color: t.w ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 12 }}>{t.p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="marquee-container" aria-hidden>
        <div className="marquee-content">
          {[...MARQUEE_ITEMS_TEXT, ...MARQUEE_ITEMS_TEXT].map((text, i) => (
            <span key={i} className="marquee-item">
              <Sparkles size={16} /> {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section className="lp-stats-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-stats-grid">
          {[
            { suffix: '+', label: 'Trades Logged', sub: 'and counting', ref: statsRefs[0], val: statsValues[0], display: v => v >= 1000 ? `${Math.floor(v/1000)}K` : v },
            { suffix: '%', label: 'Avg Win Rate Lift', sub: 'after 30 days', ref: statsRefs[1], val: statsValues[1], display: v => v },
            { suffix: '+', label: 'Countries', sub: 'traders worldwide', ref: statsRefs[2], val: statsValues[2], display: v => v },
            { suffix: 'h', label: 'Saved Monthly', sub: 'vs. spreadsheets', ref: statsRefs[3], val: statsValues[3], display: v => v },
          ].map((s, i) => (
            <motion.div key={i} variants={FADE_UP} className="lp-stat-card" ref={s.ref}>
              <div className="lp-stat-num">{s.display(s.val)}<span className="lp-stat-suffix">{s.suffix}</span></div>
              <div className="lp-stat-label">{s.label}</div>
              <div className="lp-stat-sub">{s.sub}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </>
  )
}
