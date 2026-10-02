'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Target, ClipboardCheck, BarChart2, TrendingUp, TrendingDown, Shield,
  Layers, Clock, Brain, RefreshCw, Eye, Check, X, Minus, HelpCircle, Zap, ListChecks,
} from 'lucide-react'

const GOLD = '#E8C66A'
const GREEN = '#22c55e'
const RED = '#ef4444'
const AMBER = '#eab308'
const PURPLE = '#a855f7'
const BLUE = '#3b82f6'

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : [])
const text = { margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }
const muted = { fontSize: 12, color: 'var(--text-muted)' }

function Section({ title, icon: Icon, color, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}` }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', padding: '12px 18px', background: `${color}14`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: 'none' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} style={{ color }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
        {count != null && <span style={{ fontSize: 11, color, opacity: 0.6 }}>{count}</span>}
        <motion.span style={{ marginLeft: 'auto', display: 'flex' }} animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', background: `${color}08`, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Bullets({ items, marker = '•', color = 'var(--text-muted)' }) {
  return list(items).map((t, i) => (
    <div key={i} style={{ display: 'flex', gap: 10 }}>
      <span style={{ color, fontWeight: 800, flexShrink: 0, width: 14, textAlign: 'center' }}>{marker}</span>
      <p style={text}>{t}</p>
    </div>
  ))
}

function Pill({ label, color }) {
  return <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 20, color, background: `${color}1f`, border: `1px solid ${color}40`, flexShrink: 0 }}>{label}</span>
}

const VERDICT = { keep: GREEN, refine: AMBER, pause: RED }
const RISK = { strong: GREEN, mixed: AMBER, weak: RED }
const STATUS = {
  followed: { color: GREEN, icon: Check },
  partial: { color: AMBER, icon: Minus },
  missed: { color: RED, icon: X },
  unknown: { color: '#888', icon: HelpCircle },
}

export default function DeepCoachReport({ ai, generatedAt }) {
  const score = Number(ai.processScore?.score)
  const scoreColor = score >= 75 ? GREEN : score >= 50 ? GOLD : RED
  const plan = ai.gamePlan || {}
  const rules = list(plan.rules)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ padding: '20px 22px', borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {Number.isFinite(score) && (
          <div style={{ width: 84, height: 84, borderRadius: '50%', flexShrink: 0, border: `2px solid ${scoreColor}66`, background: `${scoreColor}12`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: scoreColor, fontFamily: 'Space Grotesk', lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 8, color: scoreColor, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>Process</div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Brain size={13} style={{ color: GOLD }} />
            <span style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deep coaching review</span>
            {generatedAt && <span style={{ ...muted, marginLeft: 'auto' }}>{new Date(generatedAt).toLocaleString()}</span>}
          </div>
          {ai.headline && <h3 style={{ margin: '0 0 8px', fontFamily: 'Space Grotesk', fontSize: 19, lineHeight: 1.3 }}>{ai.headline}</h3>}
          {ai.summary && <p style={{ ...text, color: 'var(--text-secondary)' }}>{ai.summary}</p>}
          {ai.processScore?.rationale && <p style={{ ...muted, marginTop: 10, lineHeight: 1.55 }}><strong style={{ color: scoreColor }}>Why {score}:</strong> {ai.processScore.rationale}</p>}
        </div>
      </div>

      <Section title="Game plan for next week" icon={Target} color={GOLD} defaultOpen>
        {plan.primaryObjective && (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: `${GOLD}14`, border: `1px solid ${GOLD}40` }}>
            <div style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Primary objective</div>
            <p style={{ ...text, fontWeight: 700 }}>{plan.primaryObjective}</p>
          </div>
        )}
        {(plan.dailyMaxLoss || plan.maxTradesPerDay) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            {plan.dailyMaxLoss && <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-elevated)' }}><div style={{ ...muted, marginBottom: 4 }}>Daily max loss</div><p style={text}>{plan.dailyMaxLoss}</p></div>}
            {plan.maxTradesPerDay && <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-elevated)' }}><div style={{ ...muted, marginBottom: 4 }}>Max trades per day</div><p style={text}>{plan.maxTradesPerDay}</p></div>}
          </div>
        )}
        {rules.length > 0 && (
          <div>
            <div style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>If → then rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 10, alignItems: 'center', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-elevated)' }}>
                  <p style={{ ...text, fontSize: 13 }}><strong style={{ color: AMBER }}>IF</strong> {r.if}</p>
                  <Zap size={13} style={{ color: GOLD }} />
                  <p style={{ ...text, fontSize: 13 }}><strong style={{ color: GREEN }}>THEN</strong> {r.then}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {list(plan.focusSetups).length > 0 && <div><div style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Prioritize</div><Bullets items={plan.focusSetups} marker="+" color={GREEN} /></div>}
        {list(plan.avoid).length > 0 && <div><div style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cut</div><Bullets items={plan.avoid} marker="−" color={RED} /></div>}
      </Section>

      {list(plan.preMarketChecklist).length > 0 && (
        <Section title="Pre-market checklist" icon={ListChecks} color={BLUE} count={list(plan.preMarketChecklist).length} defaultOpen>
          {list(plan.preMarketChecklist).map((c, i) => (
            <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" style={{ marginTop: 4, accentColor: GOLD }} />
              <span style={text}>{c}</span>
            </label>
          ))}
        </Section>
      )}

      {list(ai.watchlist).length > 0 && (
        <Section title="Red flags to watch live" icon={Eye} color={RED} count={list(ai.watchlist).length} defaultOpen>
          <Bullets items={ai.watchlist} marker="!" color={RED} />
        </Section>
      )}

      {list(ai.lastWeekScorecard).length > 0 && (
        <Section title="Last week's plan — scorecard" icon={ClipboardCheck} color={PURPLE} count={list(ai.lastWeekScorecard).length}>
          {list(ai.lastWeekScorecard).map((s, i) => {
            const st = STATUS[String(s.status).toLowerCase()] || STATUS.unknown
            const Icon = st.icon
            return (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${st.color}22`, border: `1px solid ${st.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Icon size={11} color={st.color} strokeWidth={3} /></div>
                <div><p style={{ ...text, fontWeight: 600 }}>{s.item}</p>{s.evidence && <p style={{ ...muted, fontSize: 13, marginTop: 3, lineHeight: 1.55 }}>{s.evidence}</p>}</div>
              </div>
            )
          })}
        </Section>
      )}

      {list(ai.keyNumbers).length > 0 && (
        <Section title="Key numbers" icon={BarChart2} color={BLUE} count={list(ai.keyNumbers).length}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {list(ai.keyNumbers).map((k, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-elevated)' }}>
                <div style={muted}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Space Grotesk', margin: '2px 0 6px' }}>{k.value}</div>
                <p style={{ ...text, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{k.read}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {list(ai.strengths).length > 0 && <Section title="What you did well" icon={TrendingUp} color={GREEN} count={list(ai.strengths).length}><Bullets items={ai.strengths} marker="✓" color={GREEN} /></Section>}
      {list(ai.mistakes).length > 0 && <Section title="What cost you" icon={TrendingDown} color={RED} count={list(ai.mistakes).length}><Bullets items={ai.mistakes} marker="✕" color={RED} /></Section>}

      {ai.riskAudit && (
        <Section title="Risk audit" icon={Shield} color={RISK[String(ai.riskAudit.rating).toLowerCase()] || AMBER} count={ai.riskAudit.rating}>
          <Bullets items={ai.riskAudit.points} />
        </Section>
      )}

      {list(ai.playbookReview).length > 0 && (
        <Section title="Playbook review" icon={Layers} color={GOLD} count={list(ai.playbookReview).length}>
          {list(ai.playbookReview).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Pill label={p.verdict || '—'} color={VERDICT[String(p.verdict).toLowerCase()] || '#888'} />
              <div><p style={{ ...text, fontWeight: 700 }}>{p.name}</p><p style={{ ...text, fontSize: 13, color: 'var(--text-secondary)' }}>{p.insight}</p></div>
            </div>
          ))}
        </Section>
      )}

      {list(ai.timing).length > 0 && (
        <Section title="Timing — where edge shows up or leaks" icon={Clock} color={BLUE} count={list(ai.timing).length}>
          {list(ai.timing).map((t, i) => (
            <div key={i}><p style={{ ...text, fontWeight: 700 }}>{t.window}</p><p style={{ ...text, fontSize: 13, color: 'var(--text-secondary)' }}>{t.insight}</p></div>
          ))}
        </Section>
      )}

      {list(ai.psychology).length > 0 && <Section title="Psychology & emotions" icon={Brain} color={PURPLE} count={list(ai.psychology).length}><Bullets items={ai.psychology} color={PURPLE} /></Section>}
      {ai.patterns && <Section title="Pattern spotted" icon={RefreshCw} color={AMBER}><p style={text}>{ai.patterns}</p></Section>}

      {ai.mindset && (
        <div style={{ padding: '16px 20px', borderRadius: 16, background: `${PURPLE}0d`, border: `1px solid ${PURPLE}33` }}>
          <div style={{ ...muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Coach&apos;s note</div>
          <p style={{ ...text, fontSize: 15, fontStyle: 'italic', lineHeight: 1.75 }}>{ai.mindset}</p>
        </div>
      )}
    </div>
  )
}
