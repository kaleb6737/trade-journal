import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptBrokerSecret } from '@/lib/brokerCrypto'
import { randomDeviceId, tradovateBaseUrl, verifyTradovateCredentials } from '@/lib/tradovateSync'
import { sanitizeTradingAccount } from '@/lib/brokerAccountDto'
import { PlanError, gateFeature, planErrorResponse } from '@/lib/gateApi'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await gateFeature(session.user.id, 'brokerSync', { upgradeTo: 'ULTIMATE' })
    const { accountId, name, password, cid, sec, demo } = await req.json()
    if (!accountId || !name || !password || cid == null || !sec) {
      return NextResponse.json(
        { error: 'accountId, name, password, cid, and sec are required' },
        { status: 400 }
      )
    }

    const cidNum = parseInt(String(cid), 10)
    if (Number.isNaN(cidNum)) {
      return NextResponse.json({ error: 'cid must be a number' }, { status: 400 })
    }

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
      sec: String(sec).trim(),
      deviceId,
    })

    const passEnc = encryptBrokerSecret(String(password))
    const secEnc = encryptBrokerSecret(String(sec).trim())

    const updated = await prisma.tradingAccount.update({
      where: { id: accountId },
      data: {
        broker: 'Tradovate',
        tradovateName: String(name).trim(),
        tradovatePasswordEnc: passEnc,
        tradovateCid: cidNum,
        tradovateSecEnc: secEnc,
        tradovateDemo: demo !== false,
        tradovateDeviceId: deviceId,
        lastBrokerSyncError: null,
        brokerAutoSyncEnabled: true,
      },
    })

    return NextResponse.json({ success: true, account: sanitizeTradingAccount(updated) })
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    console.error('Tradovate connect:', e)
    return NextResponse.json({ error: e.message || 'Connection failed' }, { status: 400 })
  }
}
