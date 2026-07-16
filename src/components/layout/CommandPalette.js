'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Newspaper,
  ScrollText,
  Wallet,
  Settings,
  Sparkles,
  PlusCircle,
  Search,
  Command,
} from 'lucide-react'

const NAV_COMMANDS = [
  { id: 'dash', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview performance' },
  { id: 'journal', label: 'Trade Journal', href: '/journal', icon: BookOpen, keywords: 'trades log ledger' },
  { id: 'new', label: 'Log new trade', href: '/journal/new', icon: PlusCircle, keywords: 'add execution entry' },
  { id: 'analytics', label: 'Analytics deep dive', href: '/analytics', icon: BarChart3, keywords: 'stats charts expectancy' },
  { id: 'calendar', label: 'Economic calendar', href: '/calendar', icon: Newspaper, keywords: 'news events macro' },
  { id: 'playbooks', label: 'Playbooks', href: '/playbooks', icon: ScrollText, keywords: 'strategy rules setups' },
  { id: 'accounts', label: 'Broker accounts', href: '/accounts', icon: Wallet, keywords: 'connect sync alpaca tradovate' },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, keywords: 'profile plan billing' },
  { id: 'pricing', label: 'Pricing & upgrade', href: '/pricing', icon: Sparkles, keywords: 'pro ultimate subscribe' },
]

export default function CommandPalette({ open, onOpenChange }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAV_COMMANDS
    return NAV_COMMANDS.filter((c) => {
      const blob = `${c.label} ${c.keywords}`.toLowerCase()
      return blob.includes(q)
    })
  }, [query])

  const run = useCallback(
    (cmd) => {
      onOpenChange(false)
      setQuery('')
      router.push(cmd.href)
    },
    [onOpenChange, router]
  )

  useEffect(() => {
    if (open) {
      setHighlight(0)
      const t = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
    setQuery('')
  }, [open])

  useEffect(() => {
    setHighlight((h) => (filtered.length ? Math.min(h, filtered.length - 1) : 0))
  }, [filtered.length, query])

  useEffect(() => {
    const onKey = (e) => {
      const meta = e.key === 'k' && (e.metaKey || e.ctrlKey)
      if (meta) {
        e.preventDefault()
        onOpenChange((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector?.(`[data-palette-item="${highlight}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open, filtered])

  const onPaletteKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onOpenChange(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (filtered.length ? (h + 1) % filtered.length : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (filtered.length ? (h - 1 + filtered.length) % filtered.length : 0))
      return
    }
    if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault()
      run(filtered[highlight])
    }
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="command-palette-layer"
          className="command-palette-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            className="command-palette-backdrop"
            aria-label="Close command palette"
            onClick={() => onOpenChange(false)}
          />
          <div className="command-palette-anchor" role="presentation">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="command-palette"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onKeyDown={onPaletteKeyDown}
            >
              <div className="command-palette-search">
                <Search size={17} strokeWidth={2} aria-hidden />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Jump anywhere — pages, log trade, settings…"
                  aria-autocomplete="list"
                  aria-controls="command-palette-list"
                />
                <kbd className="kbd-pill" aria-hidden>
                  esc
                </kbd>
              </div>
              <ul id="command-palette-list" className="command-palette-list" ref={listRef}>
                {filtered.length === 0 && (
                  <li className="command-palette-empty">No matches — try “journal”, “analytics”, or “log”.</li>
                )}
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon
                  const active = i === highlight
                  return (
                    <li key={cmd.id}>
                      <button
                        type="button"
                        data-palette-item={i}
                        className={`command-palette-item ${active ? 'active' : ''}`}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => run(cmd)}
                      >
                        <span className="command-palette-item-icon">
                          <Icon size={17} strokeWidth={2} />
                        </span>
                        <span className="command-palette-item-label">{cmd.label}</span>
                        <span className="command-palette-item-hint">Open</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="command-palette-footer">
                <span>
                  <kbd className="kbd-pill">{isMac ? '⌘' : 'Ctrl'}</kbd>
                  <kbd className="kbd-pill">K</kbd>
                  <span className="command-palette-footer-text">toggle</span>
                </span>
                <span>
                  <kbd className="kbd-pill">↑</kbd>
                  <kbd className="kbd-pill">↓</kbd>
                  <span className="command-palette-footer-text">navigate</span>
                </span>
                <span>
                  <kbd className="kbd-pill">↵</kbd>
                  <span className="command-palette-footer-text">go</span>
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function CommandPaletteTrigger({ onClick }) {
  return (
    <button type="button" className="topbar-search command-palette-trigger" onClick={onClick} aria-label="Open command palette">
      <Search size={15} aria-hidden />
      <span className="command-palette-trigger-placeholder">Search or jump…</span>
      <span className="command-palette-trigger-keys" aria-hidden>
        <kbd className="kbd-pill kbd-pill--dim">
          <Command size={11} strokeWidth={2.5} />
        </kbd>
        <kbd className="kbd-pill kbd-pill--dim">K</kbd>
      </span>
    </button>
  )
}
