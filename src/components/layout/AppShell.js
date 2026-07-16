'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/layout/Sidebar'
import PageTransition from '@/components/layout/PageTransition'
import CommandPalette, { CommandPaletteTrigger } from '@/components/layout/CommandPalette'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

function greetingLine() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function SharedAppLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(' ')?.[0] || 'Trader'

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setIsCollapsed(true)
  }, [])

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  return (
    <div className={`app-shell ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggleSidebar}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />
      <main className="main-content">
        <div className="topbar">
          <button
            className="btn btn-ghost btn-icon topbar-menu-btn"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="topbar-cluster">
            <div className="topbar-greeting">
              <span className="topbar-greeting-kicker">Desk</span>
              <span className="topbar-greeting-line">
                {greetingLine()}, {firstName}
              </span>
            </div>
            <CommandPaletteTrigger onClick={() => setPaletteOpen(true)} />
          </div>
        </div>
        <PageTransition>{children}</PageTransition>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </main>
    </div>
  )
}
