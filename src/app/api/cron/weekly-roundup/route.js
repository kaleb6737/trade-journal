import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAndSendWeeklyRoundup, isDueForWeeklyRoundup } from '@/lib/weeklyRoundup'
import { isCronAuthorized } from '@/lib/cronAuth'

export async function POST(req) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: { weeklyRoundupEnabled: true },
  })

  const now = new Date()
  let sent = 0
  let skipped = 0
  const errors = []

  for (const user of users) {
    try {
      if (!isDueForWeeklyRoundup(user, now)) {
        skipped++
        continue
      }
      await createAndSendWeeklyRoundup(user, { force: true })
      sent++
    } catch (e) {
      errors.push({ userId: user.id, error: e.message || 'Unknown error' })
    }
  }

  return NextResponse.json({
    ok: true,
    runAt: now.toISOString(),
    users: users.length,
    sent,
    skipped,
    errors,
  })
}
