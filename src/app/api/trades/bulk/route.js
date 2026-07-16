import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTradeCreateData } from '@/lib/tradeCreate'
import { PlanError, gateFeature, loadGateUser, planErrorResponse } from '@/lib/gateApi'
import { assertWithinLimit, getLimits } from '@/lib/plans'

const MAX_BATCH = 500

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const trades = body?.trades
  if (!Array.isArray(trades) || trades.length === 0) {
    return NextResponse.json({ error: 'Expected { trades: [...] } with at least one item' }, { status: 400 })
  }
  if (trades.length > MAX_BATCH) {
    return NextResponse.json({ error: `Maximum ${MAX_BATCH} trades per request` }, { status: 400 })
  }

  try {
    await gateFeature(session.user.id, 'csvImport', { upgradeTo: 'PRO' })
    const user = await loadGateUser(session.user.id)
    const { maxTrades } = getLimits(user)
    if (maxTrades != null) {
      const current = await prisma.trade.count({ where: { userId: user.id } })
      assertWithinLimit(current + trades.length - 1, maxTrades, {
        feature: 'trades',
        upgradeTo: 'PRO',
      })
    }
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    throw e
  }

  const built = []
  for (let i = 0; i < trades.length; i++) {
    const row = buildTradeCreateData(session.user.id, trades[i])
    if (row.error) {
      return NextResponse.json({ error: `Row ${i}: ${row.error}` }, { status: 400 })
    }
    built.push(row.data)
  }

  try {
    const created = await prisma.$transaction(
      built.map((data) => prisma.trade.create({ data }))
    )
    return NextResponse.json({ created: created.length, trades: created }, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate trade (same userId + externalRef). Skip or dedupe broker rows.' },
        { status: 409 }
      )
    }
    console.error('Bulk trade create error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
