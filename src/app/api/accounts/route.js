import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeTradingAccount } from '@/lib/brokerAccountDto'
import { PlanError, gateCount, planErrorResponse } from '@/lib/gateApi'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.tradingAccount.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'asc' } })
  const accounts = rows.map(sanitizeTradingAccount)
  return NextResponse.json({ accounts })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, broker, currency, initialBalance } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  try {
    await gateCount(session.user.id, 'maxAccounts', {
      feature: 'trading accounts',
      upgradeTo: 'ULTIMATE',
    })
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    throw e
  }
  const account = await prisma.tradingAccount.create({
    data: { userId: session.user.id, name, broker: broker || 'Manual', currency: currency || 'USD', initialBalance: parseFloat(initialBalance) || 0 }
  })
  return NextResponse.json({ account: sanitizeTradingAccount(account) }, { status: 201 })
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, name, broker, currency, initialBalance, brokerAutoSyncEnabled } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const existing = await prisma.tradingAccount.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data = {}
  if (name !== undefined) data.name = name
  if (broker !== undefined) data.broker = broker
  if (currency !== undefined) data.currency = currency
  if (initialBalance !== undefined) data.initialBalance = parseFloat(initialBalance) || 0
  if (brokerAutoSyncEnabled !== undefined) data.brokerAutoSyncEnabled = !!brokerAutoSyncEnabled

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const account = await prisma.tradingAccount.update({
    where: { id },
    data,
  })
  return NextResponse.json({ account: sanitizeTradingAccount(account) })
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const existing = await prisma.tradingAccount.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.tradingAccount.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
