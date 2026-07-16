'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, BookOpen, BarChart3, Settings,
  Wallet, LogOut, ChevronLeft, ChevronRight, ScrollText, X, Newspaper, Sparkles
} from 'lucide-react'
import { BrandMonogram, BrandWordmark } from '@/components/BrandWordmark'

const NAV = [
  { label: 'Main', items: [
    { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
    { href: '/journal',   label: 'Journal',    icon: BookOpen },
    { href: '/analytics', label: 'Analytics',  icon: BarChart3 },
  ]},
  { label: 'Tools', items: [
    { href: '/weekly-roundup', label: 'Weekly Round-up', icon: Sparkles },
    { href: '/calendar',  label: 'Econ Calendar', icon: Newspaper },
    { href: '/playbooks', label: 'Playbooks',  icon: ScrollText },
    { href: '/accounts',  label: 'Accounts',   icon: Wallet },
  ]},
  { label: 'Other', items: [
    { href: '/pricing',   label: 'Pricing',    icon: Sparkles },
    { href: '/settings',  label: 'Settings',   icon: Settings },
  ]},
]

export default function Sidebar({ isCollapsed, onToggle, isMobileOpen, onMobileClose }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  /** Full reload after clearing cookies — avoids App Router / SessionProvider getting out of sync (blank screens, chunk errors). */
  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
    } catch {
      /* network / API hiccup — still leave the app */
    }
    window.location.assign('/')
  }

  const initials = session?.user?.name
    ? session.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <>
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={onMobileClose}
        aria-hidden={!isMobileOpen}
      />
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <header className="sidebar-header">
        <Link href="/dashboard" className="logo-link" title="TradeXEssence">
          <BrandMonogram />
          <BrandWordmark />
        </Link>
        <div className="sidebar-header-actions">
          <button
            type="button"
            onClick={onToggle}
            className="sidebar-collapse-btn"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} strokeWidth={2.25} /> : <ChevronLeft size={16} strokeWidth={2.25} />}
          </button>
          <button type="button" onClick={onMobileClose} className="sidebar-close-btn-only touch-target" aria-label="Close navigation">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(section => (
          <div key={section.label} className="nav-section">
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`} title={isCollapsed ? item.label : ''}>
                  <Icon size={18} />
                  <span className="nav-label">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{session?.user?.name || 'Trader'}</div>
            <div className="user-email">{session?.user?.email || ''}</div>
          </div>
          <button
            type="button"
            onClick={() => handleSignOut()}
            className="btn btn-ghost btn-icon logout-btn"
            style={{ flexShrink: 0, padding: 6 }}
            title="Sign out"
          >
            <LogOut size={15} className="sidebar-logout-icon" />
          </button>
        </div>
      </div>
      </aside>
    </>
  )
}
