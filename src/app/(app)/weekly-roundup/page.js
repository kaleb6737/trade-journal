'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown, Target, Brain,
  Trophy, AlertTriangle, Zap, Calendar, BarChart2, BookOpen,
  Check, X, ChevronDown, PenLine,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import WeeklyCharts from '@/components/trading/WeeklyCharts'

const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }
const stagger = { show: { transition: { staggerChildren: 0.06 } } }

const TABS = [
  { id: 'overview', label: 'Overview',  icon: BarChart2 },
  { id: 'charts',   label: 'Charts',    icon: TrendingUp },
  { id: 'coaching', label: 'AI Coach',  icon: Brain },
  { id: 'trades',   label: 'Trades',    icon: Trophy },
  { id: 'reflect',  label: 'Reflect',   icon: PenLine },
]

const SECTION = {
  strength: { color: '#22c55e', border: 'rgba(34,197,94,0.25)',  left: '#22c55e', bg: 'rgba(34,197,94,0.04)',  hdr: 'rgba(34,197,94,0.1)' },
  mistake:  { color: '#ef4444', border: 'rgba(239,68,68,0.25)',  left: '#ef4444', bg: 'rgba(239,68,68,0.04)',  hdr: 'rgba(239,68,68,0.1)' },
  pattern:  { color: '#eab308', border: 'rgba(234,179,8,0.25)',  left: '#eab308', bg: 'rgba(234,179,8,0.04)',  hdr: 'rgba(234,179,8,0.1)' },
  focus:    { color: '#d4af37', border: 'rgba(212,175,55,0.25)', left: '#d4af37', bg: 'rgba(212,175,55,0.04)', hdr: 'rgba(212,175,55,0.1)' },
  mindset:  { color: '#a855f7', border: 'rgba(168,85,247,0.25)', left: '#a855f7', bg: 'rgba(168,85,247,0.04)', hdr: 'rgba(168,85,247,0.1)' },
}

function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [val, setVal] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(parseFloat((target * ease).toFixed(decimals)))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target])
  return val
}

function gradeInfo(winRate, pnl) {
  if (winRate >= 70 && pnl > 0) return { g: 'A+', c: '#22c55e', l: 'Outstanding' }
  if (winRate >= 60 && pnl > 0) return { g: 'A',  c: '#22c55e', l: 'Excellent' }
  if (winRate >= 50 && pnl > 0) return { g: 'B+', c: '#d4af37', l: 'Good week' }
  if (winRate >= 50)            return { g: 'B',  c: '#d4af37', l: 'Decent' }
  if (winRate >= 40)            return { g: 'C',  c: '#f97316', l: 'Needs work' }
  return                               { g: 'D',  c: '#ef4444', l: 'Struggling' }
}

function WinLossRing({ winners, losers }) {
  const total = (winners || 0) + (losers || 0)
  if (!total) return null
  const wr = Math.round((winners / total) * 100)
  const data = [{ v: winners, c: '#22c55e' }, { v: losers, c: '#ef4444' }].filter(d => d.v > 0)
  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={44} dataKey="v" strokeWidth={0}>
          {data.map((e, i) => <Cell key={i} fill={e.c} />)}
        </Pie></PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Space Grotesk', lineHeight: 1 }}>{wr}%</div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>win</div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon, sub }) {
  return (
    <motion.div variants={fadeUp} style={{ flex: '1 1 130px', padding: '18px 20px 14px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
      {Icon && <Icon size={14} style={{ color: color || 'var(--text-muted)', marginBottom: 8, opacity: 0.8 }} />}
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text-primary)', fontFamily: 'Space Grotesk', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
    </motion.div>
  )
}

function AiSection({ type, icon: Icon, title, items, text, open, onToggle }) {
  const s = SECTION[type]
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${s.border}`, borderLeft: `3px solid ${s.left}` }}>
      <button onClick={onToggle} style={{ width: '100%', padding: '12px 18px', background: s.hdr, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: 'none', outline: 'none' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} style={{ color: s.color }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 11, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
        {items && <span style={{ marginLeft: 8, fontSize: 11, color: s.color, opacity: 0.6 }}>{items.length} point{items.length !== 1 ? 's' : ''}</span>}
        <motion.span style={{ marginLeft: 'auto' }} animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: s.color }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', background: s.bg }}>
              {items && type === 'strength' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{items.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}><div style={{ width: 22, height: 22, borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><Check size={11} color="white" strokeWidth={3} /></div><p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }}>{t}</p></div>
              ))}</div>}
              {items && type === 'mistake' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{items.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}><div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><X size={11} color="#ef4444" strokeWidth={2.5} /></div><p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }}>{t}</p></div>
              ))}</div>}
              {items && type === 'focus' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{items.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}><div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #d4af37', flexShrink: 0, marginTop: 2 }} /><p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }}>{t}</p></div>
              ))}</div>}
              {text && <div style={{ position: 'relative', paddingTop: 6 }}><div style={{ fontSize: 42, color: `${s.color}30`, lineHeight: 0.6, marginBottom: 8, fontFamily: 'Georgia, serif' }}>"</div><p style={{ margin: 0, fontSize: 15, fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.75 }}>{text}"</p></div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmotionDot({ score }) {
  const c = { 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#06b6d4' }
  if (!score) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  return <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: c[score] }} /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{score}/5</span></div>
}

function TradeRow({ t }) {
  const [expanded, setExpanded] = useState(false)
  const pnl = parseFloat(t.netPnl) || 0
  const pnlColor = pnl > 0 ? '#22c55e' : pnl < 0 ? '#ef4444' : 'var(--text-muted)'
  let emoTags = []; try { emoTags = JSON.parse(t.emotionTags || '[]') } catch {}
  let notes = t.notes || ''
  try { const p = JSON.parse(notes); if (p?.html) notes = p.html.replace(/<[^>]+>/g, ' ').trim() } catch {}
  return (
    <div style={{ borderBottom: '1px solid var(--border-default)' }}>
      <button onClick={() => setExpanded(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 88 }}><span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t.symbol}</span><span style={{ marginLeft: 6, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: t.side === 'LONG' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: t.side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{t.side}</span></div>
        <div style={{ fontWeight: 800, fontSize: 14, color: pnlColor, minWidth: 80 }}>{formatCurrency(t.netPnl)}</div>
        <EmotionDot score={t.emotionScore} />
        {t.tradeSession && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 10, background: 'var(--bg-elevated)' }}>{t.tradeSession}</span>}
        {emoTags.slice(0, 2).map((tag, i) => <span key={i} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>{tag}</span>)}
        <motion.span style={{ marginLeft: 'auto' }} animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.2 }}><ChevronDown size={13} style={{ color: 'var(--text-muted)' }} /></motion.span>
      </button>
      <AnimatePresence>
        {expanded && notes && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px 12px', background: 'var(--bg-elevated)', borderRadius: 8, margin: '0 4px 10px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{notes.slice(0, 500)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function WeeklyRoundupPage() {
  const [log, setLog]               = useState(null)
  const [history, setHistory]       = useState([])
  const [trades, setTrades]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState(null)
  const [activeTab, setActiveTab]   = useState('overview')
  const [openSections, setOpenSections] = useState({ strength: true, mistake: true, pattern: false, focus: true, mindset: false })
  const [reflections, setReflections]   = useState({})

  const fetchHistory = async () => {
    const r = await fetch('/api/weekly-roundup/history')
    const d = await r.json()
    const logs = d.logs || []
    setHistory(logs)
    setLog(prev => prev ?? (logs[0] || null))
    setLoading(false)
  }
  useEffect(() => { fetchHistory() }, [])

  useEffect(() => {
    if (!log) return
    setTrades([])
    fetch('/api/trades').then(r => r.json()).then(d => {
      const start = new Date(log.periodStart), end = new Date(log.periodEnd)
      setTrades((d.trades || []).filter(t => {
        const w = t.occurredAt || t.exitDate || t.entryDate
        return w && new Date(w) >= start && new Date(w) < end && t.status === 'CLOSED'
      }))
    }).catch(() => {})
  }, [log])

  const generate = async () => {
    setGenerating(true); setError(null)
    const r = await fetch('/api/weekly-roundup/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ previewOnly: false }) })
    const d = await r.json()
    if (!r.ok) { setError(d.error || 'Failed'); setGenerating(false); return }
    await fetchHistory()
    setGenerating(false)
  }

  const deleteRoundup = async (id) => {
    await fetch('/api/weekly-roundup/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setHistory(prev => { const next = prev.filter(h => h.id !== id); if (log?.id === id) setLog(next[0] || null); return next })
  }

  const ai = (() => { try { return log?.aiAnalysis ? (typeof log.aiAnalysis === 'string' ? JSON.parse(log.aiAnalysis) : log.aiAnalysis) : null } catch { return null } })()
  const pnlNum   = log?.netPnl != null ? parseFloat(log.netPnl) : null
  const pnlColor = pnlNum != null ? (pnlNum >= 0 ? '#22c55e' : '#ef4444') : 'var(--text-primary)'
  const winRate  = log ? (log.winners + log.losers > 0 ? (log.winners / (log.winners + log.losers)) * 100 : 0) : 0
  const { g, c: gradeColor, l: gradeLabel } = log ? gradeInfo(winRate, pnlNum || 0) : { g: '—', c: '#888', l: '' }
  const animPnl  = useCountUp(Math.abs(pnlNum || 0), { duration: 900, decimals: 2 })
  const animWR   = useCountUp(winRate, { duration: 800, decimals: 0 })
  const reflectionLines = log?.reflectionPrompt ? log.reflectionPrompt.split('\n').filter(l => /^\d+\)/.test(l.trim())).map(l => l.replace(/^\d+\)\s*/, '')) : []

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  if (loading) return <div className="page-wrapper" style={{ padding: 100, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>

  return (
    <div className="page-wrapper">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '1.75rem' }}>Weekly Round-up</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>AI coaching from your trades, notes & emotions this week</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn btn-primary" style={{ gap: 8 }}>
          {generating ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Generating…</> : <><Sparkles size={15} /> Generate Now</>}
        </button>
      </div>

      {error && <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 14, marginBottom: 20 }}>{error}</div>}

      {!log ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Brain size={34} style={{ color: 'var(--gold-primary)' }} /></div>
          <h2 style={{ marginBottom: 10, fontFamily: 'Space Grotesk' }}>No round-up yet</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto 28px' }}>Generate your first AI-powered weekly coaching session reviewing all trades, notes and emotions from the past 7 days.</p>
          <button onClick={generate} disabled={generating} className="btn btn-primary" style={{ justifyContent: 'center' }}>{generating ? 'Generating…' : <><Sparkles size={15} /> Generate my first round-up</>}</button>
        </motion.div>
      ) : (
        <motion.div initial="hidden" animate="show" variants={stagger}>

          {/* History strip */}
          {history.length > 1 && (
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
              {history.map(h => {
                const p = parseFloat(h.netPnl) || 0
                const wr = h.winners + h.losers > 0 ? Math.round((h.winners / (h.winners + h.losers)) * 100) : 0
                const active = h.id === log?.id
                return (
                  <div key={h.id} style={{ flexShrink: 0, borderRadius: 12, position: 'relative', background: active ? 'var(--bg-elevated)' : 'var(--bg-surface)', border: active ? '1px solid var(--gold-primary)' : '1px solid var(--border-default)' }}>
                    <button onClick={() => setLog(h)} style={{ display: 'block', padding: '10px 32px 10px 14px', cursor: 'pointer', textAlign: 'left', background: 'none', border: 'none', outline: 'none' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{new Date(h.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(h.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'Space Grotesk', color: p >= 0 ? '#22c55e' : '#ef4444' }}>{formatCurrency(h.netPnl)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{h.createdTrades}T · {wr}% WR</div>
                    </button>
                    <button onClick={() => { if (window.confirm('Delete this round-up?')) deleteRoundup(h.id) }} title="Delete" style={{ position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 5, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5 }} onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444' }} onMouseLeave={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.color = 'var(--text-muted)' }}><X size={11} /></button>
                  </div>
                )
              })}
            </motion.div>
          )}

          {/* Hero */}
          <motion.div variants={fadeUp} style={{ borderRadius: 20, padding: '28px 32px', marginBottom: 16, background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)', border: `1px solid ${pnlColor}22`, boxShadow: `0 0 40px ${pnlColor}12`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', flexShrink: 0, background: `radial-gradient(circle, ${gradeColor}1a 0%, ${gradeColor}05 100%)`, border: `2px solid ${gradeColor}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: gradeColor, fontFamily: 'Space Grotesk', lineHeight: 1 }}>{g}</div>
                <div style={{ fontSize: 8, color: gradeColor, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{gradeLabel}</div>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={10} />{new Date(log.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(log.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: pnlColor, fontFamily: 'Space Grotesk', lineHeight: 1 }}>{pnlNum < 0 ? '-' : ''}{formatCurrency(animPnl)}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 5 }}>{log.createdTrades} trade{log.createdTrades !== 1 ? 's' : ''} · {log.winners}W / {log.losers}L</div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}><span>Win Rate</span><span style={{ fontWeight: 700, color: winRate >= 50 ? '#22c55e' : '#ef4444' }}>{animWR}%</span></div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border-default)', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }} style={{ height: '100%', borderRadius: 3, background: winRate >= 50 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <WinLossRing winners={log.winners} losers={log.losers} />
                <button onClick={generate} disabled={generating} className="btn btn-secondary btn-sm" style={{ gap: 6 }}><RefreshCw size={12} /> Regenerate</button>
              </div>
            </div>
          </motion.div>

          {/* Tab bar */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-surface)', borderRadius: 14, padding: 5, border: '1px solid var(--border-default)' }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', border: 'none', outline: 'none', background: active ? 'var(--bg-elevated)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.15)' : 'none' }}>
                  <Icon size={13} style={{ color: active ? 'var(--gold-primary)' : 'var(--text-muted)' }} />
                  <span style={{ display: 'none' }} className="sm-show">{tab.label}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {activeTab === 'overview' && (
                <motion.div variants={stagger} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <StatCard label="Net P&L"  value={formatCurrency(log.netPnl)} color={pnlColor} icon={pnlNum >= 0 ? TrendingUp : TrendingDown} />
                  <StatCard label="Trades"   value={log.createdTrades}           icon={BarChart2} />
                  <StatCard label="Wins"     value={log.winners}  color="#22c55e" icon={Trophy} />
                  <StatCard label="Losses"   value={log.losers}   color="#ef4444" icon={AlertTriangle} />
                  <StatCard label="Win Rate" value={`${winRate.toFixed(0)}%`} color={winRate >= 50 ? '#22c55e' : '#ef4444'} icon={Target} sub={`${log.winners}W · ${log.losers}L`} />
                </motion.div>
              )}

              {activeTab === 'charts' && (
                trades.length > 0 ? <WeeklyCharts trades={trades} /> : <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 14 }}>No trade data available for this period.</div>
              )}

              {activeTab === 'coaching' && (
                ai ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 16px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                      <Brain size={15} style={{ color: 'var(--gold-primary)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Coaching Report</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Generated {new Date(log.sentAt).toLocaleString()}</span>
                      <div style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', fontSize: 11, color: 'var(--gold-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Zap size={10} /> Groq</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ai.strengths?.length > 0 && <AiSection type="strength" icon={TrendingUp}  title="What you did well"   items={ai.strengths} open={openSections.strength} onToggle={() => toggleSection('strength')} />}
                      {ai.mistakes?.length  > 0 && <AiSection type="mistake"  icon={TrendingDown} title="What went wrong"     items={ai.mistakes}  open={openSections.mistake}  onToggle={() => toggleSection('mistake')} />}
                      {ai.patterns          &&      <AiSection type="pattern"  icon={RefreshCw}    title="Pattern spotted"     text={ai.patterns}   open={openSections.pattern}  onToggle={() => toggleSection('pattern')} />}
                      {ai.focus?.length     > 0 && <AiSection type="focus"    icon={Target}       title="Focus for next week" items={ai.focus}     open={openSections.focus}    onToggle={() => toggleSection('focus')} />}
                      {ai.mindset           &&      <AiSection type="mindset"  icon={Brain}        title="Mindset & emotions"  text={ai.mindset}    open={openSections.mindset}  onToggle={() => toggleSection('mindset')} />}
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}><p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No AI analysis. Set <code>GROQ_API_KEY</code> in <code>.env.local</code> and regenerate.</p></div>
                )
              )}

              {activeTab === 'trades' && (
                trades.length > 0 ? (
                  <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 12, borderBottom: '1px solid var(--border-default)' }}>
                      <BarChart2 size={14} style={{ color: 'var(--gold-primary)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Trades This Week</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{trades.length} closed · click to expand notes</span>
                    </div>
                    {trades.map(t => <TradeRow key={t.id} t={t} />)}
                  </div>
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 14 }}>No trades found for this period.</div>
                )
              )}

              {activeTab === 'reflect' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reflectionLines.length > 0 ? reflectionLines.map((q, i) => (
                    <div key={i} className="card">
                      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}><span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-primary)' }}>{i + 1}</span></div>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{q}</p>
                      </div>
                      <textarea value={reflections[i] || ''} onChange={e => setReflections(prev => ({ ...prev, [i]: e.target.value }))} placeholder="Write your reflection here…" rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.55, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )) : <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No reflection prompts available.</div>}
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </motion.div>
      )}
    </div>
  )
}
