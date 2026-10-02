import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

function parseDayInput(value) {
  if (!value) return null
  const isoDay = String(value).slice(0, 10)
  const d = new Date(`${isoDay}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  const where = { userId: session.user.id }
  if (date) {
    const d = parseDayInput(date)
    if (!d) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    where.date = d
  } else if (start || end) {
    where.date = {}
    if (start) where.date.gte = parseDayInput(start)
    if (end) where.date.lte = parseDayInput(end)
  }

  const noTradeDays = await prisma.noTradeDay.findMany({ where, orderBy: { date: 'desc' }, take: 200 })
  return NextResponse.json({ noTradeDays })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const date = parseDayInput(body.date)
  if (!date) return NextResponse.json({ error: 'A date is required' }, { status: 400 })

  const reason = typeof body.reason === 'string' ? body.reason.trim() || null : null
  const tags = Array.isArray(body.tags) ? JSON.stringify(body.tags) : '[]'

  try {
    const noTradeDay = await prisma.noTradeDay.upsert({
      where: { userId_date: { userId: session.user.id, date } },
      create: { userId: session.user.id, date, reason, tags },
      update: { reason, tags },
    })
    return NextResponse.json({ noTradeDay }, { status: 201 })
  } catch (error) {
    console.error('Create no-trade day error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
