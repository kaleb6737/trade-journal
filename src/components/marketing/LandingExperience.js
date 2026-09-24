'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ESSENCE_PRICING as P } from '@/lib/essenceOffer'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'
import {
  BookOpen, BarChart3, Target, Tags, Calendar, Wallet, TrendingUp,
  ArrowRight, Check, Shield, Sparkles, ChevronDown, Activity, Layers,
  Repeat, Trophy, Flame, X, Star, Users, Award, TrendingDown, Clock,
  Zap, Lock, Settings, BrainCircuit
} from 'lucide-react'

const FADE_UP = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
}
const STAGGER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [threshold])
  return scrolled
}

function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const fired = useRef(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true
          const t0 = performance.now()
          const tick = (now) => {
            const p = Math.min((now - t0) / duration, 1)
            const ease = 1 - Math.pow(1 - p, 3)
            setCount(Math.floor(ease * target))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])
  return [count, ref]
}

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

const JOURNEY_STAGES = [
  {
    id: 'unprofitable', label: 'Unprofitable', title: 'Find Your Edge.',
    desc: "Tired of blowing accounts? Let's pinpoint where you leak money, cut bad habits, and build a systematic approach to trading.",
    features: ['Stop the bleeding', 'Track emotions', 'Isolate what works', 'Cut losing habits'],
    color: 'var(--red)',
  },
  {
    id: 'developing', label: 'Developing', title: 'Scale with Precision.',
    desc: "You have a strategy but consistency is the issue. Track playbook win rates, refine setups, and protect your early profits.",
    features: ['Playbook analytics', 'Refine execution', 'Setup filtering', 'Eliminate FOMO'],
    color: 'var(--blue)',
  },
  {
    id: 'profitable', label: 'Profitable', title: 'Protect Your Capital.',
    desc: "You make money — now keep it. Advanced portfolio-level stats, custom reporting, and deep edge analysis for high-level refinement.",
    features: ['Multi-account tracking', 'Defend profits', 'Advanced risk metrics', 'Time optimization'],
    color: 'var(--gold-primary)',
  },
  {
    id: 'prop', label: 'Prop Firm', title: 'Pass the Challenge.',
    desc: "Track max daily loss limits, payout rules, and challenge milestones across every prop firm in one centralized dashboard.",
    features: ['Challenge tracking', 'Max loss safeguards', 'Multi-firm sync', 'Payout readiness'],
    color: 'var(--green)',
  },
]

const FAQ = [
  { q: 'What does full access cost?', a: 'One full-access plan: $15/month or $99/year in USD. The founding offer is $59 for the first year during the first 30 days of launch, then renews at $99/year. Taxes may apply.' },
  { q: 'Can I import trades from my broker?', a: 'CSV import is supported for most broker exports. Map columns once and bulk-ingest history instead of retyping fills.' },
  { q: 'Where is my data stored?', a: 'Your data lives in the database configured for your deployment. Sessions follow NextAuth best practices with strong encryption.' },
  { q: 'Do you give financial advice?', a: 'No. TradeXEssence is software for journaling and analysis only — not investment, tax, or legal advice.' },
]

const MARQUEE_ITEMS = [
  { icon: <Target size={18} />, text: 'Playbook Analytics' },
  { icon: <Activity size={18} />, text: 'Equity Curves' },
  { icon: <Calendar size={18} />, text: 'P&L Calendar' },
  { icon: <Shield size={18} />, text: 'Prop Firm Ready' },
  { icon: <Layers size={18} />, text: 'Multi-Account' },
  { icon: <Tags size={18} />, text: 'Custom Tagging' },
  { icon: <TrendingUp size={18} />, text: 'Win Rate Tracking' },
  { icon: <Flame size={18} />, text: 'Streak Heatmap' },
  { icon: <Award size={18} />, text: 'Essence Score' },
  { icon: <BrainCircuit size={18} />, text: 'Behavioral Analysis' },
  { icon: <Repeat size={18} />, text: 'Broker Sync' },
  { icon: <Clock size={18} />, text: 'Timing Breakdown' },
]

export default function LandingPage({ launch }) {
  const [activeJourney, setActiveJourney] = useState(JOURNEY_STAGES[0])
  const [isYearly, setIsYearly] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)
  const founding = launch.status !== 'ended'
  const amount = isYearly ? (founding ? P.founding : P.annual) : P.monthly
  const navScrolled = useScrolled()
  const heroRef = useRef(null)
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
    <div className="landing">

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
      <section ref={heroRef} className="landing-hero lp-hero">
        <div className="hero-grid-bg" aria-hidden />
        <div className="hero-dots" aria-hidden />
        <div className="lp-hero-aurora" aria-hidden />
        <div className="hero-orb hero-orb-1" aria-hidden />
        <div className="lp-hero-orb-2" aria-hidden />

        <motion.div
          initial="hidden" animate="visible" variants={STAGGER}
          className="lp-hero-text"
        >
          <motion.div variants={FADE_UP} className="hero-badge">
            <Sparkles size={13} />
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
            <Link href="/auth/register" className="btn btn-primary lp-btn-hero btn-glow">
              Explore Full Access <ArrowRight size={18} />
            </Link>
            <Link href="#features" className="btn btn-ghost lp-btn-ghost-hero">
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
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="marquee-item">
              {item.icon} {item.text}
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

      {/* ── JOURNEY SELECTOR ── */}
      <section id="features" className="lp-journey-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-section-head">
          <motion.div variants={FADE_UP} className="hero-badge" style={{ margin: '0 auto 20px' }}>
            <Activity size={14} /> Built for Every Stage
          </motion.div>
          <motion.h2 variants={FADE_UP} className="lp-section-title">Where are you in your journey?</motion.h2>
          <motion.p variants={FADE_UP} className="lp-section-sub">TradeXEssence adapts to your level. Pick your stage.</motion.p>
        </motion.div>

        <div className="lp-journey-tabs">
          {JOURNEY_STAGES.map(stage => (
            <button
              key={stage.id}
              onClick={() => setActiveJourney(stage)}
              className={`lp-journey-tab${activeJourney.id === stage.id ? ' active' : ''}`}
              style={activeJourney.id === stage.id ? { '--tab-color': stage.color } : {}}
            >
              {stage.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeJourney.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="lp-journey-content"
            style={{ '--journey-color': activeJourney.color }}
          >
            <div className="lp-journey-left">
              <div className="lp-journey-eyebrow" style={{ color: activeJourney.color }}>{activeJourney.label} Traders</div>
              <h3 className="lp-journey-title">{activeJourney.title}</h3>
              <p className="lp-journey-desc">{activeJourney.desc}</p>
              <Link href="/auth/register" className="btn btn-primary lp-btn-journey">
                Get Started <ArrowRight size={14} />
              </Link>
            </div>
            <div className="lp-journey-right">
              {activeJourney.features.map(f => (
                <div key={f} className="lp-journey-feature">
                  <div className="lp-journey-check" style={{ background: `${activeJourney.color}18`, border: `1px solid ${activeJourney.color}40` }}>
                    <Check size={14} style={{ color: activeJourney.color }} />
                  </div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section className="lp-bento-section">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-section-head">
          <motion.div variants={FADE_UP} className="hero-badge" style={{ margin: '0 auto 20px' }}>
            <Layers size={14} /> Full Arsenal
          </motion.div>
          <motion.h2 variants={FADE_UP} className="lp-section-title">Everything you need to trade with precision.</motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={STAGGER} className="bento-grid">
          <motion.div variants={FADE_UP} className="bento-item wide">
            <div className="bento-icon-wrapper"><Target size={22} /></div>
            <div className="bento-content">
              <h3>Strategy Playbooks</h3>
              <p>Define your rules. Tie every trade to a playbook. See exact win rates and P-factors for your A+ setups vs. boredom trades.</p>
            </div>
            <div className="lp-bento-mock">
              {[{ name: 'Breakout Momentum', wr: '68%', pnl: '+$4,120', c: 'var(--green)' }, { name: 'Mean Reversion', wr: '55%', pnl: '+$1,840', c: 'var(--gold-primary)' }].map(r => (
                <div key={r.name} className="lp-bento-row">
                  <div className="lp-bento-dot" style={{ background: r.c }} />
                  <span className="lp-bento-row-name">{r.name}</span>
                  <span className="lp-bento-row-wr">{r.wr} WR</span>
                  <span style={{ color: r.c, fontWeight: 700, fontSize: 12 }}>{r.pnl}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={FADE_UP} className="bento-item">
            <div className="bento-icon-wrapper"><Flame size={22} /></div>
            <div className="bento-content">
              <h3>Streak Heatmap</h3>
              <p>Visualize consistency month-by-month. Instantly spot overtrading streaks and your peak performance windows.</p>
            </div>
            <div className="lp-bento-heatmap">
              {Array.from({ length: 28 }).map((_, i) => {
                const v = [0,1,2,1,0,2,1,0,1,2,0,2,1,0,2,1,2,0,1,2,1,0,2,1,0,1,2,1][i]
                const colors = ['rgba(255,255,255,0.06)', 'rgba(232, 198, 106,0.5)', 'rgba(34,197,94,0.65)']
                return <div key={i} className="lp-heatmap-cell" style={{ background: colors[v] }} />
              })}
            </div>
          </motion.div>

          <motion.div variants={FADE_UP} className="bento-item tall">
            <div className="bento-icon-wrapper"><Shield size={22} /></div>
            <div className="bento-content">
              <h3>Prop Firm Sync</h3>
              <p>Track evaluation and funded accounts separately or consolidated. Perfect for managing capital across multiple firm dashboards.</p>
            </div>
            <div className="lp-prop-visual">
              <div className="lp-prop-badge">Challenge: Passed 🏆</div>
              <div className="lp-prop-bar">
                <div className="lp-prop-bar-fill" style={{ width: '78%' }} />
              </div>
              <div className="lp-prop-stat">
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Daily Drawdown Used</span>
                <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}>22% remaining</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={FADE_UP} className="bento-item">
            <div className="bento-icon-wrapper"><Tags size={22} /></div>
            <div className="bento-content">
              <h3>Advanced Tagging</h3>
              <p>Tag emotions, execution errors, and market regimes. Filter your journal to kill the habits that cost you money.</p>
            </div>
            <div className="lp-tag-row">
              {['FOMO', 'Revenge', 'A+ Setup', 'Oversize', 'Patient'].map((tag, i) => (
                <span key={tag} className="lp-tag" style={{ opacity: 1 - i * 0.12 }}>{tag}</span>
              ))}
            </div>
          </motion.div>

          <motion.div variants={FADE_UP} className="bento-item">
            <div className="bento-icon-wrapper"><TrendingUp size={22} /></div>
            <div className="bento-content">
              <h3>Essence Score</h3>
              <p>A single number blending return quality, consistency, and risk discipline — your trading GPA, calculated in real time.</p>
            </div>
            <div className="lp-score-visual">
              <div className="lp-score-ring">
                <svg viewBox="0 0 80 80" className="lp-score-svg">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="32" fill="none" stroke="var(--gold-primary)" strokeWidth="6"
                    strokeDasharray="201" strokeDashoffset="46" strokeLinecap="round"
                    transform="rotate(-90 40 40)" />
                </svg>
                <span className="lp-score-num">87</span>
              </div>
              <span className="lp-score-label">Elite Performance</span>
            </div>
          </motion.div>
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
            <motion.div key={i} variants={FADE_UP} className="lp-testimonial-card">
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
            <Link href="/auth/register" className="btn btn-primary lp-btn-hero btn-glow">
              Get Started <ArrowRight size={18} />
            </Link>
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
    </div>
  )
}
