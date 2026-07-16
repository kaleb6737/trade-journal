'use client'

import { useId } from 'react'

export default function ZTScoreRing({ score }) {
  const gradId = useId().replace(/:/g, '')
  const r = 34
  const circ = 2 * Math.PI * r
  const progress = (score / 100) * circ
  const valueColor =
    score === 0
      ? 'var(--text-muted)'
      : score >= 70
        ? '#22C55E'
        : score >= 40
          ? '#D4AF37'
          : '#EF4444'
  const strokeColor = score >= 70 ? '#22C55E' : score >= 40 ? '#D4AF37' : '#EF4444'

  return (
    <div className="score-ring-visual" role="img" aria-label={`Essence score ${score} out of 100`}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <defs>
          <linearGradient id={`essenceGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        {score > 0 && (
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={score >= 40 ? `url(#essenceGrad-${gradId})` : strokeColor}
            strokeWidth="7"
            strokeDasharray={`${progress} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
          />
        )}
      </svg>
      <div className="score-ring-text score-ring-text--solo">
        <span className="score-ring-value" style={{ color: valueColor }}>{score}</span>
      </div>
    </div>
  )
}
