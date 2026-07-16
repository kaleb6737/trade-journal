'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, BarChart3, BookOpen, PlusCircle, Newspaper } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

/** Context-aware headline for the trader dashboard — nudges the next best action. */
export default function EdgeInsightBanner({ stats = {} }) {
  const insight = resolveInsight(stats)
  const BannerIcon = insight.Icon

  return (
    <motion.div
      className="edge-insight-banner"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="edge-insight-icon" aria-hidden>
        <BannerIcon size={22} strokeWidth={2} />
      </div>
      <div className="edge-insight-body">
        <div className="edge-insight-title">{insight.title}</div>
        <p className="edge-insight-text">{insight.body}</p>
        <div className="edge-insight-actions">
          {insight.actions.map((a) => {
            const ChipIcon = a.icon
            return (
              <Link key={a.href + a.label} href={a.href} className="edge-insight-chip">
                {ChipIcon ? <ChipIcon size={13} aria-hidden /> : null}
                {a.label}
              </Link>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

function resolveInsight(stats) {
  const trades = stats.totalTrades || 0
  const wr = stats.winRate ?? 0
  const pf = stats.profitFactor ?? 0
  const net = stats.netPnl ?? 0

  if (trades === 0) {
    return {
      Icon: Sparkles,
      title: 'Your terminal is live',
      body: 'Log executions with notes and tags — the Essence score, equity curve, and playbooks unlock automatically from closed trades.',
      actions: [
        { href: '/journal/new', label: 'Log a trade', icon: PlusCircle },
        { href: '/playbooks', label: 'Playbooks', icon: BookOpen },
      ],
    }
  }

  if (wr < 42 && trades >= 5) {
    return {
      Icon: BarChart3,
      title: 'Tighten the process loop',
      body: `Win rate is ${wr.toFixed(1)}% across ${trades} closed trades — open Analytics and compare sessions, sides, and playbooks to spot where expectancy leaks.`,
      actions: [
        { href: '/analytics', label: 'Open analytics', icon: BarChart3 },
        { href: '/journal', label: 'Review journal', icon: BookOpen },
      ],
    }
  }

  if (pf > 0 && pf < 1 && trades >= 8) {
    return {
      Icon: BarChart3,
      title: 'Profit factor under 1',
      body: 'Losers are outweighing winners on a dollar basis. Tag the next ten trades aggressively so Analytics can surface which playbook or session type to cut.',
      actions: [
        { href: '/analytics', label: 'Find the leak', icon: BarChart3 },
        { href: '/journal/new', label: 'Log next trade', icon: PlusCircle },
      ],
    }
  }

  if (net > 0 && wr >= 55 && pf >= 1.25) {
    return {
      Icon: Sparkles,
      title: 'Edge is compiling',
      body: `Net ${formatCurrency(net)} with a ${wr.toFixed(1)}% win rate — keep journaling so streak heatmaps and symbol leaders stay truthful.`,
      actions: [
        { href: '/analytics', label: 'Stress-test stats', icon: BarChart3 },
        { href: '/calendar', label: 'Macro calendar', icon: Newspaper },
      ],
    }
  }

  return {
    Icon: BookOpen,
    title: 'Maintain the ledger',
    body: `${trades} closed trades on file — consistent logging is what turns intuition into repeatable process.`,
    actions: [
      { href: '/journal/new', label: 'Quick log', icon: PlusCircle },
      { href: '/analytics', label: 'Deep dive', icon: BarChart3 },
    ],
  }
}
