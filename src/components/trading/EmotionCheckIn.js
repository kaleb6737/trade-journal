'use client'

import { useState } from 'react'

const SCORES = [
  { value: 1, emoji: '😰', label: 'Out of control' },
  { value: 2, emoji: '😬', label: 'Struggling'     },
  { value: 3, emoji: '😐', label: 'Neutral'         },
  { value: 4, emoji: '😊', label: 'In control'      },
  { value: 5, emoji: '🧘', label: 'Fully focused'   },
]

const EMOTION_TAGS = [
  { label: 'Fear',          negative: true  },
  { label: 'Greed',         negative: true  },
  { label: 'FOMO',          negative: true  },
  { label: 'Revenge',       negative: true  },
  { label: 'Anxious',       negative: true  },
  { label: 'Overconfident', negative: true  },
  { label: 'Impulsive',     negative: true  },
  { label: 'Calm',          negative: false },
  { label: 'Patient',       negative: false },
  { label: 'Disciplined',   negative: false },
  { label: 'Confident',     negative: false },
  { label: 'Focused',       negative: false },
]

const SCORE_COLORS = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#14b8a6',
}

function ScoreRing({ score, size = 48 }) {
  if (!score) return null
  const color = SCORE_COLORS[score] || 'var(--text-muted)'
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 5) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  )
}

export function EmotionDisplay({ trade }) {
  const score     = trade.emotionScore
  const tags      = (() => { try { return JSON.parse(trade.emotionTags || '[]') } catch { return [] } })()
  if (!score && !tags.length) return null

  const scoreData  = SCORES.find(s => s.value === score)
  const color      = score ? SCORE_COLORS[score] : 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {score && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ScoreRing score={score} size={52} />
          <div>
            <div style={{ fontSize: 22 }}>{scoreData?.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 2 }}>{scoreData?.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Emotional control {score}/5</div>
          </div>
        </div>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(t => {
            const tag   = EMOTION_TAGS.find(e => e.label === t)
            const bg    = tag?.negative ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)'
            const clr   = tag?.negative ? '#ef4444' : '#22c55e'
            return (
              <span key={t} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: bg, color: clr, fontWeight: 500 }}>
                {t}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function EmotionCheckIn({ trade, onSaved }) {
  const [step, setStep]         = useState(1)
  const [score, setScore]       = useState(null)
  const [selected, setSelected] = useState([])
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  const toggleTag = (label) =>
    setSelected(p => p.includes(label) ? p.filter(x => x !== label) : [...p, label])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/trades/${trade.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emotionScore: score, emotionTags: selected }),
    })
    setSaving(false)
    setDone(true)
    onSaved?.({ emotionScore: score, emotionTags: JSON.stringify(selected) })
  }

  if (done) {
    const scoreData = SCORES.find(s => s.value === score)
    const color     = SCORE_COLORS[score]
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{scoreData?.emoji}</div>
        <div style={{ fontWeight: 700, color, fontSize: 15 }}>Check-in saved</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Emotional control: {score}/5 — {scoreData?.label}</div>
      </div>
    )
  }

  return (
    <div>
      {step === 1 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            How well did you manage your emotions during this trade?
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {SCORES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => { setScore(s.value); setStep(2) }}
                style={{
                  flex: '1 1 0',
                  minWidth: 70,
                  padding: '14px 8px',
                  borderRadius: 12,
                  border: `2px solid ${score === s.value ? SCORE_COLORS[s.value] : 'var(--border-default)'}`,
                  background: score === s.value ? `${SCORE_COLORS[s.value]}18` : 'var(--bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 24 }}>{s.emoji}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                <span style={{ fontSize: 10, color: SCORE_COLORS[s.value], fontWeight: 700 }}>{s.value}/5</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1 }}>←</button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Which emotions were present? <span style={{ color: 'var(--text-muted)' }}>(optional)</span></span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {EMOTION_TAGS.map(({ label, negative }) => {
              const active = selected.includes(label)
              const bg     = active ? (negative ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)') : 'var(--bg-surface)'
              const border = active ? (negative ? '#ef4444' : '#22c55e')   : 'var(--border-default)'
              const clr    = active ? (negative ? '#ef4444' : '#22c55e')   : 'var(--text-secondary)'
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleTag(label)}
                  style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${border}`, background: bg, color: clr, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {saving ? 'Saving…' : 'Save check-in'}
          </button>
        </>
      )}
    </div>
  )
}

// Modal wrapper — used right after importing or logging a trade
// tradeIds: string | string[]  (single id or array for bulk CSV import)
export function EmotionModal({ tradeIds, onClose }) {
  const ids = Array.isArray(tradeIds) ? tradeIds : [tradeIds]
  const [step, setStep]         = useState(1)
  const [score, setScore]       = useState(null)
  const [selected, setSelected] = useState([])
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)

  const toggleTag = (label) =>
    setSelected(p => p.includes(label) ? p.filter(x => x !== label) : [...p, label])

  const save = async () => {
    setSaving(true)
    await Promise.all(ids.map(id =>
      fetch(`/api/trades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotionScore: score, emotionTags: selected }),
      })
    ))
    setSaving(false)
    setDone(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Emotion Check-in</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {ids.length > 1 ? `Applies to all ${ids.length} imported trades` : 'Quick reflection on this trade'}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" title="Skip">Skip →</button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{SCORES.find(s => s.value === score)?.emoji}</div>
            <div style={{ fontWeight: 700, color: SCORE_COLORS[score], fontSize: 15 }}>Saved!</div>
          </div>
        ) : step === 1 ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              How well did you control your emotions during this trade?
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {SCORES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setScore(s.value); setStep(2) }}
                  style={{
                    flex: '1 1 0', minWidth: 70, padding: '14px 8px', borderRadius: 12,
                    border: `2px solid ${score === s.value ? SCORE_COLORS[s.value] : 'var(--border-default)'}`,
                    background: score === s.value ? `${SCORE_COLORS[s.value]}18` : 'var(--bg-surface)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{s.emoji}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: SCORE_COLORS[s.value], fontWeight: 700 }}>{s.value}/5</span>
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '8px 0', display: 'block', width: '100%', textAlign: 'center' }}>
              Skip for now
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Which emotions were present? <span style={{ color: 'var(--text-muted)' }}>(optional)</span></span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {EMOTION_TAGS.map(({ label, negative }) => {
                const active = selected.includes(label)
                const bg     = active ? (negative ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)') : 'var(--bg-surface)'
                const border = active ? (negative ? '#ef4444' : '#22c55e') : 'var(--border-default)'
                const clr    = active ? (negative ? '#ef4444' : '#22c55e') : 'var(--text-secondary)'
                return (
                  <button
                    key={label} type="button" onClick={() => toggleTag(label)}
                    style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${border}`, background: bg, color: clr, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Skip</button>
              <button type="button" onClick={save} disabled={saving} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                {saving ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
