'use client'

import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'
import { Newspaper, AlertTriangle, Clock, Filter, ChevronDown, ChevronUp, ExternalLink, MessageSquare } from 'lucide-react'

const IMPACT_CONFIG = {
  High:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'High Impact', icon: '🔴' },
  Medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', label: 'Medium',      icon: '🟠' },
  Low:    { color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)', label: 'Low',         icon: '🟡' },
}

const COUNTRY_FLAGS = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺',
  CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳',
}

function groupByDate(events) {
  const groups = {}
  events.forEach(e => {
    const dateObj = parseISO(e.date)
    const key = format(dateObj, 'yyyy-MM-dd')
    if (!groups[key]) groups[key] = { dateKey: key, dateObj, events: [] }
    groups[key].events.push(e)
  })
  return Object.values(groups).sort((a, b) => a.dateObj - b.dateObj)
}

function getDateLabel(dateObj) {
  if (isToday(dateObj)) return 'Today'
  if (isTomorrow(dateObj)) return 'Tomorrow'
  return format(dateObj, 'EEEE, MMM d')
}

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [impactFilter, setImpactFilter] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('econ-impact-filter') || 'all'
    return 'all'
  })
  const [countryFilter, setCountryFilter] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('econ-country-filter') || 'all'
    return 'all'
  })
  const [expandedDays, setExpandedDays] = useState({})

  // Persist filters
  useEffect(() => { localStorage.setItem('econ-impact-filter', impactFilter) }, [impactFilter])
  useEffect(() => { localStorage.setItem('econ-country-filter', countryFilter) }, [countryFilter])

  // Trump posts state
  const [trumpPosts, setTrumpPosts] = useState([])
  const [trumpLoading, setTrumpLoading] = useState(true)
  const [trumpExpanded, setTrumpExpanded] = useState(true)

  useEffect(() => {
    fetch('/api/calendar')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setEvents(d.events || [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load calendar'); setLoading(false) })

    // Fetch Trump posts
    fetch('/api/trump-posts')
      .then(r => r.json())
      .then(d => {
        setTrumpPosts(d.posts || [])
        setTrumpLoading(false)
      })
      .catch(() => setTrumpLoading(false))
  }, [])

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (impactFilter === 'High' && e.impact !== 'High') return false
      if (impactFilter === 'Medium' && e.impact === 'Low') return false
      if (countryFilter !== 'all' && e.country !== countryFilter) return false
      return true
    })
  }, [events, impactFilter, countryFilter])

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents])

  const countries = useMemo(() => {
    const set = new Set(events.map(e => e.country))
    return [...set].sort()
  }, [events])

  const highImpactCount = events.filter(e => e.impact === 'High').length

  const toggleDay = (key) => {
    setExpandedDays(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="empty-state-pro" style={{ border: 'none', background: 'transparent', padding: 48 }}>
        <div className="empty-icon-wrap" style={{ width: 56, height: 56, borderRadius: 16 }}>
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2 }} />
        </div>
        <h3 style={{ margin: 0 }}>Loading economic calendar</h3>
        <p style={{ margin: 0 }}>Fetching this week's market-moving events…</p>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header page-header-premium flex items-center justify-between">
        <div className="page-header-text">
          <span className="page-eyebrow">Market Intel</span>
          <h1 className="page-title-xl">Economic Calendar</h1>
          <p className="page-subtitle">
            {highImpactCount > 0
              ? `${highImpactCount} high-impact event${highImpactCount !== 1 ? 's' : ''} this week — plan your entries around the red folders.`
              : 'No high-impact events this week — smooth sailing for your setups.'}
          </p>
        </div>
      </div>

      {/* ══════════════ Trump Posts Section ══════════════ */}
      <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setTrumpExpanded(p => !p)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: trumpExpanded ? '1px solid var(--border-subtle)' : 'none', color: 'inherit',
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 22 }}>🇺🇸</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>
                Trump Truth Social
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'left' }}>
                @realDonaldTrump · Latest posts that move markets
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              background: 'rgba(239,68,68,0.12)', color: '#EF4444',
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              🔴 MARKET MOVER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {trumpPosts.length} post{trumpPosts.length !== 1 ? 's' : ''}
            </span>
            {trumpExpanded
              ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
              : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </button>

        {trumpExpanded && (
          <div>
            {trumpLoading ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto', width: 24, height: 24, borderWidth: 2 }} />
              </div>
            ) : trumpPosts.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No recent posts available
              </div>
            ) : (
              trumpPosts.map((post, i) => {
                let timeLabel = ''
                try {
                  timeLabel = format(new Date(post.date), 'MMM d, h:mm a')
                } catch {
                  timeLabel = post.dateDisplay || ''
                }

                return (
                  <div
                    key={post.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: i < trumpPosts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1DA1F2, #0D8ECF)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>T</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>Donald J. Trump</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>@realDonaldTrump</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'Space Grotesk' }}>
                        <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {timeLabel}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)',
                      paddingLeft: 36,
                    }}>
                      {post.text}
                    </div>
                    {post.url && (
                      <div style={{ paddingLeft: 36, marginTop: 8 }}>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                          style={{ fontSize: 11, color: 'var(--gold-primary)', textDecoration: 'none' }}
                        >
                          <ExternalLink size={10} /> View on Truth Social
                        </a>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ══════════════ Economic Events ══════════════ */}

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          <Filter size={14} /> Impact:
        </div>
        <div className="flex gap-2">
          {['all', 'High', 'Medium'].map(f => (
            <button
              key={f}
              type="button"
              className={`btn btn-sm ${impactFilter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setImpactFilter(f)}
              style={{ fontSize: 12 }}
            >
              {f === 'all' ? 'All Events' : f === 'High' ? '🔴 High Only' : '🟠 Med & High'}
            </button>
          ))}
        </div>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 120 }}
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
        >
          <option value="all">All Currencies</option>
          {countries.map(c => (
            <option key={c} value={c}>{COUNTRY_FLAGS[c] || '🌐'} {c}</option>
          ))}
        </select>
      </div>

      {/* Calendar Events */}
      {error ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: 12 }} />
          <h3>Calendar Unavailable</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="empty-state-pro">
          <div className="empty-icon-wrap"><Newspaper size={28} /></div>
          <h3>No events match your filters</h3>
          <p>Try broadening your impact or currency filters to see more events.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(group => {
            const dayKey = group.dateKey
            const dateLabel = getDateLabel(group.dateObj)
            const isExpanded = expandedDays[dayKey] !== false // default expanded
            const dayHighCount = group.events.filter(e => e.impact === 'High').length
            const dayIsPast = isPast(group.dateObj) && !isToday(group.dateObj)

            return (
              <div key={dayKey} className="card econ-day-card" style={{ opacity: dayIsPast ? 0.6 : 1, padding: 0 }}>
                {/* Day Header */}
                <button
                  type="button"
                  className="econ-day-header"
                  onClick={() => toggleDay(dayKey)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none', color: 'inherit',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{
                      fontSize: 15, fontWeight: 700,
                      color: isToday(group.dateObj) ? 'var(--gold-primary)' : 'var(--text-primary)',
                    }}>
                      {dateLabel}
                    </span>
                    {isToday(group.dateObj) && (
                      <span className="badge badge-gold" style={{ fontSize: 10 }}>TODAY</span>
                    )}
                    {dayHighCount > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#EF4444',
                        background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: 6,
                      }}>
                        🔴 {dayHighCount} high-impact
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </button>

                {/* Events List */}
                {isExpanded && (
                  <div style={{ padding: '0' }}>
                    {group.events.map((evt, i) => {
                      const cfg = IMPACT_CONFIG[evt.impact] || IMPACT_CONFIG.Low
                      const flag = COUNTRY_FLAGS[evt.country] || '🌐'
                      const time = format(parseISO(evt.date), 'h:mm a')
                      const eventIsPast = isPast(parseISO(evt.date))

                      return (
                        <div
                          key={`${evt.date}-${evt.title}-${i}`}
                          className="econ-event-row"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 40px 1fr auto',
                            gap: 12,
                            alignItems: 'center',
                            padding: '12px 20px',
                            borderBottom: i < group.events.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            opacity: eventIsPast && !isToday(group.dateObj) ? 0.5 : 1,
                            background: evt.impact === 'High' ? cfg.bg : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (evt.impact !== 'High') e.currentTarget.style.background = 'var(--bg-surface)' }}
                          onMouseLeave={e => { if (evt.impact !== 'High') e.currentTarget.style.background = 'transparent' }}
                        >
                          {/* Time */}
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontWeight: 500 }}>
                            <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.6 }} />
                            {time}
                          </div>

                          {/* Country flag + code */}
                          <div style={{ fontSize: 13, textAlign: 'center' }} title={evt.country}>
                            <span style={{ fontSize: 16 }}>{flag}</span>
                          </div>

                          {/* Title + Impact */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{
                                fontWeight: evt.impact === 'High' ? 700 : 500,
                                fontSize: 14,
                                color: evt.impact === 'High' ? cfg.color : 'var(--text-primary)',
                              }}>
                                {evt.title}
                              </span>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                                textTransform: 'uppercase', letterSpacing: 0.5,
                              }}>
                                {cfg.icon} {evt.impact}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {evt.country}
                            </div>
                          </div>

                          {/* Forecast / Previous */}
                          <div style={{ display: 'flex', gap: 16, flexShrink: 0, textAlign: 'right' }}>
                            {evt.forecast && (
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Forecast</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>{evt.forecast}</div>
                              </div>
                            )}
                            {evt.previous && (
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Previous</div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'Space Grotesk' }}>{evt.previous}</div>
                              </div>
                            )}
                            {evt.actual && (
                              <div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Actual</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-primary)', fontFamily: 'Space Grotesk' }}>{evt.actual}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Data Attribution */}
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', opacity: 0.6 }}>
        Calendar data via ForexFactory / Fair Economy Media · Trump posts via TrumpsTruth.org · Refreshed every 5 min
      </div>
    </div>
  )
}
