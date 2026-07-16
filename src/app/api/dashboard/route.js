import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeStats, buildEquityCurve, buildDayOfWeekData, buildCalendarData, buildSymbolData, buildActivityData, resolveTradeStatsTimeZone } from '@/lib/utils'
import { toMoneyNumber } from '@/lib/money'
import { tradesForAggregations } from '@/lib/tradePrivacy'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await prisma.trade.findMany({
    where: { userId: session.user.id },
    orderBy: { entryDate: 'desc' },
  })

  const trades = tradesForAggregations(rows)

  const account = await prisma.tradingAccount.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  const stats = computeStats(trades)
  const equityCurve = buildEquityCurve(trades, toMoneyNumber(account?.initialBalance) ?? 0)

  const { searchParams } = new URL(req.url)
  const statsTz = resolveTradeStatsTimeZone(searchParams.get('tz'))

  const dayOfWeek = buildDayOfWeekData(trades, statsTz)
  const calendar = buildCalendarData(trades, statsTz)
  const symbolData = buildSymbolData(trades)
  const activityData = buildActivityData(trades)
  const recentTrades = trades.slice(0, 10)

  return NextResponse.json({
    stats,
    equityCurve,
    dayOfWeek,
    calendar,
    symbolData,
    activityData,
    recentTrades,
    statsTimeZone: statsTz,
  })
}
