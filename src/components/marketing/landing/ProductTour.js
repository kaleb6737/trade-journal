'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, BookOpen, Calendar, MousePointerClick, Target } from 'lucide-react'
import { FADE_UP, STAGGER } from './shared'

const JOURNAL_ROWS = [
  { date: 'Sep 22', sym: 'NVDA', side: 'LONG', tags: ['Breakout', 'A+ Setup'], pnl: '+$2,340', win: true },
  { date: 'Sep 22', sym: 'ES', side: 'SHORT', tags: ['Mean Rev'], pnl: '+$875', win: true },
  { date: 'Sep 21', sym: 'TSLA', side: 'LONG', tags: ['FOMO'], pnl: '−$410', win: false },
  { date: 'Sep 21', sym: 'AAPL', side: 'LONG', tags: ['Patient', 'A+ Setup'], pnl: '+$1,120', win: true },
  { date: 'Sep 20', sym: 'NQ', side: 'SHORT', tags: ['Overtrade'], pnl: '−$260', win: false },
]

const PLAYBOOK_ROWS = [
  { name: 'Breakout Momentum', wr: '68%', trades: 84, r: '1.9R', pnl: '+$8,240', c: 'var(--green)' },
  { name: 'Mean Reversion', wr: '55%', trades: 61, r: '1.3R', pnl: '+$3,180', c: 'var(--gold-primary)' },
  { name: 'Opening Range Break', wr: '61%', trades: 47, r: '1.6R', pnl: '+$2,910', c: 'var(--blue, #60a5fa)' },
  { name: 'Revenge Re-entry', wr: '31%', trades: 22, r: '−0.4R', pnl: '−$1,340', c: 'var(--red)' },
]

const CAL_DAYS = [0,1,2,-1,3,1,0, 2,0,-2,1,3,-1,0, 1,-1,2,0,3,1,-1, 0,2,1,-2,0,3,1]

function tone(v) {
  if (v > 1) return 'rgba(34,197,94,0.55)'
  if (v > 0) return 'rgba(34,197,94,0.28)'
  if (v < -1) return 'rgba(239,68,68,0.5)'
  if (v < 0) return 'rgba(239,68,68,0.25)'
  return 'rgba(255,255,255,0.05)'
}

const TABS = [
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'playbooks', label: 'Playbooks', icon: Target },
]

export default function ProductTour() {
  const [tab, setTab] = useState('journal')

  return (
    <section id="tour" className="lp-tour-section">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={STAGGER} className="lp-section-head">
        <motion.div variants={FADE_UP} className="hero-badge" style={{ margin: '0 auto 20px' }}>
          <MousePointerClick size={14} /> Try It Yourself
        </motion.div>
        <motion.h2 variants={FADE_UP} className="lp-section-title">Poke around. It&apos;s already loaded.</motion.h2>
        <motion.p variants={FADE_UP} className="lp-section-sub">A live look at the workspace — click a tab to see how each view thinks.</motion.p>
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP} className="lp-tour-tabs">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`lp-tour-tab${tab === t.id ? ' active' : ''}`}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={FADE_UP} className="lp-tour-frame">
        <div className="landing-preview-chrome">
          <span className="landing-preview-dot" /><span className="landing-preview-dot" /><span className="landing-preview-dot" />
          <span className="landing-preview-url">app.tradexessence.com/{tab}</span>
        </div>

        <div className="lp-tour-panel-wrap">
          <AnimatePresence mode="wait">
            {tab === 'journal' && (
              <motion.div key="journal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="lp-tour-panel">
                {JOURNAL_ROWS.map((r, i) => (
                  <div key={i} className="lp-tour-journal-row">
                    <span className="lp-tour-journal-date">{r.date}</span>
                    <span className="lp-tour-journal-sym">{r.sym}</span>
                    <span className={`hero-float-side hero-float-side--${r.side === 'LONG' ? 'long' : 'short'}`}>{r.side}</span>
                    <span className="lp-tour-journal-tags">
                      {r.tags.map(tg => <span key={tg} className="lp-tag" style={{ fontSize: 11 }}>{tg}</span>)}
                    </span>
                    <span style={{ color: r.win ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 13, marginLeft: 'auto' }}>{r.pnl}</span>
                  </div>
                ))}
              </motion.div>
            )}

            {tab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="lp-tour-panel lp-tour-analytics">
                <div className="lp-tour-stat-tiles">
                  {[{ l: 'Win Rate', v: '72.4%', c: 'var(--gold-primary)' }, { l: 'Profit Factor', v: '2.41', c: 'var(--green)' }, { l: 'Avg R', v: '1.7R', c: 'var(--text-primary)' }].map(s => (
                    <div key={s.l} className="lp-tour-stat-tile">
                      <div className="lp-preview-stat-label">{s.l}</div>
                      <div className="lp-preview-stat-value" style={{ color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="lp-tour-analytics-row">
                  <div className="landing-preview-bars" style={{ flex: 1, height: 90 }}>
                    {[40,52,48,60,55,65,58,70,64,75,68,80,72,83,76,87,80,90].map((h, i) => (
                      <div key={i} className="landing-preview-bar" style={{ height: `${h}%`, background: `linear-gradient(to top, #E8C66A, rgba(232,198,106,${0.3 + (i/18)*0.7}))` }} />
                    ))}
                  </div>
                  <div className="lp-score-visual" style={{ padding: 0 }}>
                    <div className="lp-score-ring">
                      <svg viewBox="0 0 80 80" className="lp-score-svg">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--green)" strokeWidth="6" strokeDasharray="201" strokeDashoffset="56" strokeLinecap="round" transform="rotate(-90 40 40)" />
                      </svg>
                      <span className="lp-score-num" style={{ fontSize: 18 }}>72%</span>
                    </div>
                    <span className="lp-score-label">Win Rate</span>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="lp-tour-panel">
                <div className="lp-tour-cal-head">
                  <span>September</span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>+$9,420 this month</span>
                </div>
                <div className="lp-tour-cal-grid">
                  {CAL_DAYS.map((v, i) => (
                    <div key={i} className="lp-tour-cal-cell" style={{ background: tone(v) }}>
                      {v !== 0 && <span style={{ color: v > 0 ? 'var(--green)' : 'var(--red)' }}>{v > 0 ? `+${v}k` : `${v}k`}</span>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {tab === 'playbooks' && (
              <motion.div key="playbooks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="lp-tour-panel">
                {PLAYBOOK_ROWS.map(r => (
                  <div key={r.name} className="lp-bento-row" style={{ padding: '12px 4px' }}>
                    <div className="lp-bento-dot" style={{ background: r.c }} />
                    <span className="lp-bento-row-name">{r.name}</span>
                    <span className="lp-bento-row-wr">{r.wr} WR · {r.trades} trades</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, marginRight: 10 }}>{r.r}</span>
                    <span style={{ color: r.c, fontWeight: 700, fontSize: 13 }}>{r.pnl}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  )
}
