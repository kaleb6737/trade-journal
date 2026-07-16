import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isCronAuthorized } from '@/lib/cronAuth'
import { accountEligibleForAutoSync, runAutoSyncForAccount } from '@/lib/brokerAutoSync'

async function run(req) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.tradingAccount.findMany({
    where: {
      brokerAutoSyncEnabled: true,
      broker: { in: ['Alpaca', 'Tradovate'] },
    },
  })

  const results = []
  for (const acc of accounts) {
    if (!accountEligibleForAutoSync(acc)) {
      results.push({ accountId: acc.id, skipped: true, reason: 'not_eligible' })
      continue
    }
    try {
      const r = await runAutoSyncForAccount(acc.userId, acc)
      results.push({ accountId: acc.id, userId: acc.userId, ...r })
    } catch (e) {
      const msg = (e.message || 'Sync failed').slice(0, 500)
      await prisma.tradingAccount.update({
        where: { id: acc.id },
        data: { lastBrokerSyncError: msg },
      })
      console.error('Cron broker-sync:', acc.id, e)
      results.push({ accountId: acc.id, userId: acc.userId, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    candidates: accounts.length,
    results,
  })
}

/** Vercel Cron invokes GET. */
export async function GET(req) {
  return run(req)
}

export async function POST(req) {
  return run(req)
}
