import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await prisma.weeklyRoundupLog.findMany({
    where: { userId: session.user.id },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      createdTrades: true,
      winners: true,
      losers: true,
      netPnl: true,
      sentAt: true,
      aiAnalysis: true,
      reflectionPrompt: true,
    },
  })

  return NextResponse.json({ logs })
}
