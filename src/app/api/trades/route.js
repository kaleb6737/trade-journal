import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTradeCreateData } from '@/lib/tradeCreate'
import { PlanError, gateCount, planErrorResponse } from '@/lib/gateApi'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status    = searchParams.get('status')
  const assetType = searchParams.get('assetType')
  const side      = searchParams.get('side')
  const symbol    = searchParams.get('symbol')
  const accountId = searchParams.get('accountId')
  const date      = searchParams.get('date')
  const from      = searchParams.get('from')
  const to        = searchParams.get('to')
  const limit     = parseInt(searchParams.get('limit') || '1000')
  const offset    = parseInt(searchParams.get('offset') || '0')

  // Lightweight rows for grouping trades into weeks on the client (in the user's timezone).
  if (searchParams.get('summary') === '1') {
    const [rows, user] = await Promise.all([
      prisma.trade.findMany({
        where: { userId: session.user.id },
        select: { entryDate: true, netPnl: true, hidden: true },
        orderBy: { entryDate: 'desc' },
      }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { weekStarts: true } }),
    ])
    return NextResponse.json({ rows, weekStarts: user?.weekStarts || [] })
  }

  const where = { userId: session.user.id }
  if (status)    where.status    = status
  if (assetType) where.assetType = assetType
  if (side)      where.side      = side
  if (symbol)    where.symbol    = { contains: symbol.toUpperCase() }
  if (accountId) where.accountId = accountId
  if (date) {
    const startDate = new Date(date)
    startDate.setUTCHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setUTCHours(23, 59, 59, 999)
    where.entryDate = { gte: startDate, lte: endDate }
  } else if (from || to) {
    const range = {}
    if (from && !Number.isNaN(Date.parse(from))) range.gte = new Date(from)
    if (to && !Number.isNaN(Date.parse(to))) range.lt = new Date(to)
    if (Object.keys(range).length) where.entryDate = range
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.trade.count({ where }),
  ])

  return NextResponse.json({ trades, total })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await gateCount(session.user.id, 'maxTrades', { feature: 'trades', upgradeTo: 'PRO' })

    const body = await req.json()
    const parsed = buildTradeCreateData(session.user.id, body)
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const trade = await prisma.trade.create({ data: parsed.data })
    return NextResponse.json({ trade }, { status: 201 })
  } catch (error) {
    if (error instanceof PlanError) return planErrorResponse(error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate externalRef for this account — trade already imported.' },
        { status: 409 }
      )
    }
    console.error('Create trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
