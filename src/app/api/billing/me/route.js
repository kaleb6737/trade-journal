import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLimits, PLAN_FEATURES, planFor } from '@/lib/plans'

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const plan = planFor(user)
  const [tradeCount, accountCount] = await Promise.all([
    prisma.trade.count({ where: { userId: user.id } }),
    prisma.tradingAccount.count({ where: { userId: user.id } }),
  ])

  return NextResponse.json({
    plan,
    features: PLAN_FEATURES[plan],
    limits: getLimits(user),
    usage: { trades: tradeCount, accounts: accountCount },
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          interval: user.subscription.interval,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
        }
      : null,
  })
}
