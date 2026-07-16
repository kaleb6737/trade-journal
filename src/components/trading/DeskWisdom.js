'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Quote, RefreshCw, Sparkles, Pause, Play, Heart } from 'lucide-react'
import { DESK_WISDOM } from '@/lib/deskWisdomData'

const ROTATE_MS = 12000

function shuffleIndices(length, rng) {
  const idx = Array.from({ length }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

function WisdomLikeButton({ quoteId, liked, disabled, busy, onToggle, size = 'md', signedIn }) {
  const sm = size === 'sm'
  const title = !signedIn
    ? 'Sign in to save favorites'
    : liked
      ? 'Remove from favorites'
      : 'Save to favorites'
  return (
    <button
      type="button"
      className={`desk-wisdom-like desk-wisdom-like--${size} ${liked ? 'desk-wisdom-like--on' : ''}`}
      onClick={() => onToggle(quoteId)}
      disabled={disabled || busy}
      aria-pressed={liked}
      aria-label={title}
      title={title}
    >
      <Heart size={sm ? 14 : 16} strokeWidth={2} aria-hidden fill={liked ? 'currentColor' : 'none'} />
    </button>
  )
}

export default function DeskWisdom() {
  const { status } = useSession()
  const signedIn = status === 'authenticated'

  const [deck, setDeck] = useState(() => shuffleIndices(DESK_WISDOM.length, Math.random))
  const [cursor, setCursor] = useState(0)
  const [paused, setPaused] = useState(false)
  const [heroKey, setHeroKey] = useState(0)
  const tickRef = useRef(0)
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [likeBusyId, setLikeBusyId] = useState(null)

  const advance = useCallback(() => {
    setCursor((c) => (c + 1) % deck.length)
    setHeroKey((k) => k + 1)
  }, [deck.length])

  useEffect(() => {
    if (paused) return undefined
    const id = setInterval(advance, ROTATE_MS)
    return () => clearInterval(id)
  }, [paused, advance])

  const reshuffle = useCallback(() => {
    tickRef.current += 1
    setDeck(shuffleIndices(DESK_WISDOM.length, Math.random))
    setCursor(0)
    setHeroKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (!signedIn) {
      setLikedIds(new Set())
      return undefined
    }
    let cancelled = false
    fetch('/api/desk-wisdom/likes')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data.likedIds)) return
        setLikedIds(new Set(data.likedIds))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [signedIn])

  const toggleLike = useCallback(
    async (quoteId) => {
      if (!signedIn) return
      setLikeBusyId(quoteId)
      try {
        const res = await fetch('/api/desk-wisdom/likes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteId }),
        })
        const data = await res.json()
        if (!res.ok) return
        setLikedIds((prev) => {
          const next = new Set(prev)
          if (data.liked) next.add(quoteId)
          else next.delete(quoteId)
          return next
        })
      } finally {
        setLikeBusyId(null)
      }
    },
    [signedIn]
  )

  const hero = DESK_WISDOM[deck[cursor % deck.length]]
  const sideIdx = [1, 2, 3].map((o) => deck[(cursor + o) % deck.length])
  const side = sideIdx.map((i) => DESK_WISDOM[i])

  return (
    <section className="desk-wisdom" aria-labelledby="desk-wisdom-heading">
      <div className="desk-wisdom-head">
        <div className="desk-wisdom-title-wrap">
          <span id="desk-wisdom-heading" className="desk-wisdom-title">
            <Sparkles size={16} strokeWidth={2} aria-hidden />
            Desk wisdom
          </span>
          <p className="desk-wisdom-sub">Rotation, shuffle, pause — psychology with some teeth.</p>
        </div>
        <div className="desk-wisdom-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm desk-wisdom-icon-btn"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            title={paused ? 'Resume rotation' : 'Pause rotation'}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
            {paused ? 'Play' : 'Pause'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm desk-wisdom-shuffle" onClick={reshuffle} title="New draw from the deck">
            <RefreshCw size={15} />
            Shuffle deck
          </button>
        </div>
      </div>

      <div className="desk-wisdom-hero-wrap">
        <div className="desk-wisdom-hero-glow" aria-hidden />
        <blockquote key={heroKey} className="desk-wisdom-hero">
          <span className={`desk-wisdom-tag desk-wisdom-tag--${tagClass(hero.tag)}`}>{hero.tag}</span>
          <p className="desk-wisdom-hero-text">&ldquo;{hero.text}&rdquo;</p>
          <footer className="desk-wisdom-hero-meta">
            <span className="desk-wisdom-author">{hero.author}</span>
            <div className="desk-wisdom-hero-meta-right">
              <WisdomLikeButton
                quoteId={hero.id}
                liked={likedIds.has(hero.id)}
                disabled={!signedIn}
                busy={likeBusyId === hero.id}
                onToggle={toggleLike}
                signedIn={signedIn}
              />
              <span className="desk-wisdom-rotate-hint" aria-live="polite">
                <Quote size={14} strokeWidth={2} aria-hidden />
                Next in ~{Math.round(ROTATE_MS / 1000)}s{paused ? ' · paused' : ''}
              </span>
            </div>
          </footer>
        </blockquote>
      </div>

      <div className="desk-wisdom-rail" role="list" aria-label="More desk quotes">
        {side.map((item) => (
          <blockquote key={item.id} className="desk-wisdom-card" role="listitem">
            <span className={`desk-wisdom-tag desk-wisdom-tag--sm desk-wisdom-tag--${tagClass(item.tag)}`}>{item.tag}</span>
            <p className="desk-wisdom-card-text">&ldquo;{item.text}&rdquo;</p>
            <footer className="desk-wisdom-card-footer">
              <span className="desk-wisdom-card-author">{item.author}</span>
              <WisdomLikeButton
                quoteId={item.id}
                liked={likedIds.has(item.id)}
                disabled={!signedIn}
                busy={likeBusyId === item.id}
                onToggle={toggleLike}
                size="sm"
                signedIn={signedIn}
              />
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

function tagClass(tag) {
  const t = (tag || '').toLowerCase()
  if (['risk', 'sizing', 'fomo'].includes(t)) return 'risk'
  if (['patience', 'composure', 'expectations', 'clarity', 'context'].includes(t)) return 'calm'
  if (['mind', 'psychology', 'ego'].includes(t)) return 'mind'
  if (['execution', 'edge', 'focus', 'discipline', 'review', 'process', 'habits', 'journal', 'asymmetry'].includes(t))
    return 'edge'
  return 'default'
}
