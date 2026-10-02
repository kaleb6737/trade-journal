import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncTradovateAccount, hasTradovatePasswordLogin } from '@/lib/tradovateSync'
import { PlanError, gateFeature, planErrorResponse } from '@/lib/gateApi'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let accountId
  try {
    await gateFeature(session.user.id, 'brokerSync', { upgradeTo: 'ULTIMATE' })
    const body = await req.json()
    accountId = body.accountId
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    const acc = await prisma.tradingAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    const hasOAuth = !!acc.tradovateOAuthAccessEnc
    const hasLegacy = hasTradovatePasswordLogin(acc)
    if (!hasOAuth && !hasLegacy) {
      return NextResponse.json({ error: 'Connect Tradovate first' }, { status: 400 })
    }

    const result = await syncTradovateAccount(session.user.id, acc)

    await prisma.tradingAccount.update({
      where: { id: acc.id },
      data: {
        lastBrokerSyncAt: new Date(),
        lastBrokerSyncError: null,
      },
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    console.error('Tradovate sync:', e)
    const msg = e.message || 'Sync failed'
    if (accountId) {
      await prisma.tradingAccount.updateMany({
        where: { id: accountId, userId: session.user.id },
        data: { lastBrokerSyncError: msg },
      })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
