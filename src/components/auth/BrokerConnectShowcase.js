'use client'

import { useState, useCallback } from 'react'
import { Link2, Zap } from 'lucide-react'

/** Stylized marks (original artwork — brand-inspired palette only). */
function MarkAlpaca() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(245, 215, 110, 0.12)" />
      <path
        d="M14 32c2-8 6-14 10-14s8 6 10 14M18 22l-3-4M30 22l3-4M22 18h4"
        stroke="#F5D76E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="26" r="1.5" fill="#F5D76E" />
      <circle cx="28" cy="26" r="1.5" fill="#F5D76E" />
    </svg>
  )
}

function MarkTradovate() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(45, 212, 191, 0.1)" />
      <path d="M14 14h8v20H14V14zm12 8h8v12h-8V22zm12-6h8v26h-8V16z" fill="#2dd4bf" opacity="0.9" />
    </svg>
  )
}

function MarkIBKR() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(59, 130, 246, 0.1)" />
      <rect x="14" y="12" width="5" height="24" rx="1" fill="#E11D48" />
      <rect x="22" y="12" width="5" height="24" rx="1" fill="#fff" opacity="0.9" />
      <rect x="30" y="12" width="5" height="24" rx="1" fill="#3b82f6" />
    </svg>
  )
}

function MarkSchwab() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(0, 102, 204, 0.12)" />
      <path
        d="M16 30c4-8 8-12 16-14M20 18c6 2 10 6 12 14"
        stroke="#06c"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MarkTasty() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(236, 72, 153, 0.12)" />
      <path d="M24 14v20M16 22h16" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="22" r="10" stroke="#ec4899" strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  )
}

function MarkWebull() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(59, 130, 246, 0.12)" />
      <path d="M16 32c4-12 6-16 8-16s4 4 8 16" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 20c6 4 14 4 20 0" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MarkTradeStation() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(148, 163, 184, 0.12)" />
      <path d="M14 34V18l6 10 6-10 8 16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function MarkNinja() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(234, 179, 8, 0.12)" />
      <ellipse cx="24" cy="24" rx="12" ry="8" stroke="#eab308" strokeWidth="2" fill="none" />
      <path d="M16 24h16" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MarkThinkOrSwim() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(16, 185, 129, 0.12)" />
      <path d="M16 32V16l8 12 8-12v16" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function MarkRobinhood() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(0, 200, 83, 0.12)" />
      <path d="M24 36V16M18 22l6-6 6 6" stroke="#00c853" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MarkManual() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(212, 175, 55, 0.1)" />
      <path d="M18 30l6-14 6 14M21 24h6" stroke="var(--gold-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MarkETRADE() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(139, 92, 246, 0.12)" />
      <path d="M16 16h16v6H22v10h-6V16z" fill="#8b5cf6" opacity="0.9" />
    </svg>
  )
}

function MarkOther() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="auth-broker-mark-svg">
      <rect width="48" height="48" rx="12" fill="rgba(255,255,255,0.06)" />
      <circle cx="18" cy="24" r="2.5" fill="var(--text-muted)" />
      <circle cx="24" cy="24" r="2.5" fill="var(--text-muted)" />
      <circle cx="30" cy="24" r="2.5" fill="var(--text-muted)" />
    </svg>
  )
}

const BROKER_TILES = [
  {
    id: 'alpaca',
    name: 'Alpaca',
    live: true,
    Mark: MarkAlpaca,
    blurb: 'API keys — sync stock & crypto fills after sign-in.',
  },
  {
    id: 'tradovate',
    name: 'Tradovate',
    live: true,
    Mark: MarkTradovate,
    blurb: 'Hosted OAuth or API keys — futures fills via FIFO.',
  },
  {
    id: 'manual',
    name: 'Manual & CSV',
    live: true,
    Mark: MarkManual,
    blurb: 'Journal any account; import spreadsheets anytime.',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    live: false,
    Mark: MarkIBKR,
    blurb: 'On our roadmap for deeper sync.',
  },
  {
    id: 'schwab',
    name: 'Charles Schwab',
    live: false,
    Mark: MarkSchwab,
    blurb: 'Planned — vote with feedback after you join.',
  },
  {
    id: 'tasty',
    name: 'Tastytrade',
    live: false,
    Mark: MarkTasty,
    blurb: 'Coming later — same journal shell.',
  },
  {
    id: 'webull',
    name: 'Webull',
    live: false,
    Mark: MarkWebull,
    blurb: 'Planned broker connection.',
  },
  {
    id: 'ts',
    name: 'TradeStation',
    live: false,
    Mark: MarkTradeStation,
    blurb: 'Planned.',
  },
  {
    id: 'tos',
    name: 'thinkorswim',
    live: false,
    Mark: MarkThinkOrSwim,
    blurb: 'Planned.',
  },
  {
    id: 'rh',
    name: 'Robinhood',
    live: false,
    Mark: MarkRobinhood,
    blurb: 'Planned.',
  },
  {
    id: 'etrade',
    name: 'E*TRADE',
    live: false,
    Mark: MarkETRADE,
    blurb: 'Planned.',
  },
  {
    id: 'ninja',
    name: 'NinjaTrader',
    live: false,
    Mark: MarkNinja,
    blurb: 'Planned.',
  },
  {
    id: 'other',
    name: 'Other',
    live: false,
    Mark: MarkOther,
    blurb: 'Tag trades manually or request a venue.',
  },
]

export default function BrokerConnectShowcase() {
  const [activeId, setActiveId] = useState('alpaca')

  const active = BROKER_TILES.find((b) => b.id === activeId) || BROKER_TILES[0]

  const onKeyNav = useCallback(
    (e, index) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = BROKER_TILES[Math.min(index + 1, BROKER_TILES.length - 1)]
        setActiveId(next.id)
        document.getElementById(`auth-broker-tile-${next.id}`)?.focus()
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prev = BROKER_TILES[Math.max(index - 1, 0)]
        setActiveId(prev.id)
        document.getElementById(`auth-broker-tile-${prev.id}`)?.focus()
      }
    },
    []
  )

  return (
    <div className="auth-broker-panel auth-broker-showcase">
      <div className="auth-broker-panel-head">
        <Link2 size={16} strokeWidth={2.25} aria-hidden />
        <span>Brokers &amp; venues</span>
        <span className="auth-broker-beta">Explore</span>
      </div>
      <p className="auth-broker-panel-desc">
        Hover or focus a tile. <strong>Alpaca</strong> and <strong>Tradovate</strong> connect from{' '}
        <strong>Accounts</strong> after you sign in — never on this screen.
      </p>

      <ul className="auth-broker-showcase-grid" aria-label="Broker venues">
        {BROKER_TILES.map((b, index) => {
          const Mark = b.Mark
          const isActive = activeId === b.id
          return (
            <li key={b.id} className="auth-broker-showcase-cell">
              <button
                id={`auth-broker-tile-${b.id}`}
                type="button"
                className={`auth-broker-tile ${isActive ? 'auth-broker-tile--active' : ''} ${b.live ? 'auth-broker-tile--live' : ''}`}
                onMouseEnter={() => setActiveId(b.id)}
                onFocus={() => setActiveId(b.id)}
                onKeyDown={(e) => onKeyNav(e, index)}
                aria-pressed={isActive}
                aria-label={`${b.name}. ${b.blurb} ${b.live ? 'Available now.' : 'Planned.'}`}
              >
                <span className="auth-broker-tile-mark">
                  <Mark />
                </span>
                <span className="auth-broker-tile-name">{b.name}</span>
                <span className={`auth-broker-tile-badge ${b.live ? 'auth-broker-tile-badge--live' : ''}`}>
                  {b.live ? (
                    <>
                      <Zap size={10} strokeWidth={3} aria-hidden />
                      Live
                    </>
                  ) : (
                    'Soon'
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="auth-broker-showcase-detail" aria-live="polite">
        <strong>{active.name}</strong>
        <span className="auth-broker-showcase-detail-text">{active.blurb}</span>
      </div>

      <p className="auth-broker-foot">
        Broker keys and OAuth tokens are only entered after authentication — your journal stays the hub.
      </p>
    </div>
  )
}

/** Compact floating strip for the login card (overlapping marks). */
export function BrokerLoginStrip() {
  const [hover, setHover] = useState(null)
  const preview = BROKER_TILES.filter((b) => ['alpaca', 'tradovate', 'ibkr', 'schwab', 'tasty', 'webull'].includes(b.id))

  return (
    <div className="auth-login-broker-strip">
      <p className="auth-login-broker-strip-label">Sync-ready venues</p>
      <div className="auth-login-broker-orbit" role="group" aria-label="Broker venues preview">
        {preview.map((b, i) => {
          const Mark = b.Mark
          return (
            <button
              key={b.id}
              type="button"
              className={`auth-login-broker-orb ${hover === b.id ? 'auth-login-broker-orb--hover' : ''}`}
              style={{ zIndex: i + 1 }}
              title={b.name}
              aria-label={b.name}
              onMouseEnter={() => setHover(b.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(b.id)}
              onBlur={() => setHover(null)}
            >
              <Mark />
            </button>
          )
        })}
      </div>
      {hover && (
        <p className="auth-login-broker-strip-hint" aria-live="polite">
          {BROKER_TILES.find((x) => x.id === hover)?.name}
          {BROKER_TILES.find((x) => x.id === hover)?.live ? ' — connect after sign-in' : ' — planned'}
        </p>
      )}
    </div>
  )
}
