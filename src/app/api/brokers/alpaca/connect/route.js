import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encryptBrokerSecret } from '@/lib/brokerCrypto'
import { alpacaBaseUrl, verifyAlpacaKeys } from '@/lib/alpacaSync'
import { sanitizeTradingAccount } from '@/lib/brokerAccountDto'
import { PlanError, gateFeature, planErrorResponse } from '@/lib/gateApi'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await gateFeature(session.user.id, 'brokerSync', { upgradeTo: 'ULTIMATE' })
    const { accountId, keyId, secret, paper } = await req.json()
    if (!accountId || !keyId || !secret) {
      return NextResponse.json({ error: 'accountId, keyId, and secret are required' }, { status: 400 })
    }

    const acc = await prisma.tradingAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const base = alpacaBaseUrl(paper !== false)
    await verifyAlpacaKeys(base, keyId, secret)

    const enc = encryptBrokerSecret(secret)
    const updated = await prisma.tradingAccount.update({
      where: { id: accountId },
      data: {
        broker: 'Alpaca',
        alpacaKeyId: keyId,
        alpacaSecretEnc: enc,
        alpacaPaper: paper !== false,
        lastBrokerSyncError: null,
        brokerAutoSyncEnabled: true,
      },
    })

    return NextResponse.json({ success: true, account: sanitizeTradingAccount(updated) })
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    console.error('Alpaca connect:', e)
    return NextResponse.json({ error: e.message || 'Connection failed' }, { status: 400 })
  }
}
