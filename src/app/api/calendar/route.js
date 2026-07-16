import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const res = await fetch(CALENDAR_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: { 'User-Agent': 'TradeXEssence/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 502 })
    }

    const events = await res.json()

    // Normalize and enrich the data
    const normalized = events.map(e => ({
      title: e.title || '',
      country: e.country || '',
      date: e.date || '',
      impact: e.impact || 'Low',
      forecast: e.forecast || '',
      previous: e.previous || '',
      actual: e.actual || '',
    }))

    return NextResponse.json({ events: normalized })
  } catch (err) {
    console.error('Economic calendar fetch error:', err)
    return NextResponse.json({ error: 'Internal error fetching calendar' }, { status: 500 })
  }
}
