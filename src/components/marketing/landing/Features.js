'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowRight, Check, Flame, Layers, Shield, Tags, Target, TrendingUp,
} from 'lucide-react'
import { FADE_UP, STAGGER, handleSpotlight } from './shared'

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

export default function Features() {
  const [activeJourney, setActiveJourney] = useState(JOURNEY_STAGES[0])

  return (
    <>
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
          <motion.div variants={FADE_UP} className="bento-item wide" onMouseMove={handleSpotlight}>
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

          <motion.div variants={FADE_UP} className="bento-item" onMouseMove={handleSpotlight}>
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

          <motion.div variants={FADE_UP} className="bento-item tall" onMouseMove={handleSpotlight}>
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

          <motion.div variants={FADE_UP} className="bento-item" onMouseMove={handleSpotlight}>
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

          <motion.div variants={FADE_UP} className="bento-item" onMouseMove={handleSpotlight}>
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
    </>
  )
}
