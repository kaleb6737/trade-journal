import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptBrokerSecret } from '@/lib/brokerCrypto'
import { randomDeviceId, tradovateAppCredentials, tradovateBaseUrl, verifyTradovateCredentials } from '@/lib/tradovateSync'
import { sanitizeTradingAccount } from '@/lib/brokerAccountDto'
import { runAutoSyncForAccount } from '@/lib/brokerAutoSync'
import { PlanError, gateFeature, planErrorResponse } from '@/lib/gateApi'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await gateFeature(session.user.id, 'brokerSync', { upgradeTo: 'ULTIMATE' })
    const { accountId, name, password, cid, sec, demo } = await req.json()
    const ownKeys = cid != null && String(cid).trim() !== '' && !!String(sec ?? '').trim()
    const app = tradovateAppCredentials()
    if (!accountId || !name || !password) {
      return NextResponse.json({ error: 'Enter your Tradovate username and password.' }, { status: 400 })
    }
    if (!ownKeys && !app) {
      return NextResponse.json(
        { error: 'Tradovate sync isn\'t set up on this server yet (missing TRADOVATE_APP_CID / TRADOVATE_APP_SEC). Enter your own API cid and sec instead.' },
        { status: 400 }
      )
    }

    const cidNum = ownKeys ? parseInt(String(cid), 10) : app.cid
    if (Number.isNaN(cidNum)) {
      return NextResponse.json({ error: 'cid must be a number' }, { status: 400 })
    }
    const secValue = ownKeys ? String(sec).trim() : app.sec

    const acc = await prisma.tradingAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const base = tradovateBaseUrl(demo !== false)
    const deviceId = acc.tradovateDeviceId || randomDeviceId()

    await verifyTradovateCredentials(base, {
      name: String(name).trim(),
      password: String(password),
      cid: cidNum,
      sec: secValue,
      deviceId,
    })

    const passEnc = encryptBrokerSecret(String(password))
    // Only store API keys the trader supplied; app-level keys stay in env.
    const secEnc = ownKeys ? encryptBrokerSecret(secValue) : null

    const updated = await prisma.tradingAccount.update({
      where: { id: accountId },
      data: {
        broker: 'Tradovate',
        tradovateName: String(name).trim(),
        tradovatePasswordEnc: passEnc,
        tradovateCid: ownKeys ? cidNum : null,
        tradovateSecEnc: secEnc,
        tradovateDemo: demo !== false,
        tradovateDeviceId: deviceId,
        tradovateOAuthAccessEnc: null,
        tradovateOAuthExpiresAt: null,
        lastBrokerSyncError: null,
        brokerAutoSyncEnabled: true,
      },
    })

    // Import right away so the trader sees their trades without waiting for the daily run.
    try {
      const sync = await runAutoSyncForAccount(session.user.id, updated)
      return NextResponse.json({ success: true, account: sanitizeTradingAccount(updated), sync: { created: sync.created ?? 0, skipped: sync.skipped ?? 0 } })
    } catch (e) {
      const syncError = (e.message || 'Sync failed').slice(0, 500)
      await prisma.tradingAccount.update({ where: { id: accountId }, data: { lastBrokerSyncError: syncError } })
      return NextResponse.json({ success: true, account: sanitizeTradingAccount(updated), syncError })
    }
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    console.error('Tradovate connect:', e)
    return NextResponse.json({ error: e.message || 'Connection failed' }, { status: 400 })
  }
}
