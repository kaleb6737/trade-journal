import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeTradingAccount } from '@/lib/brokerAccountDto'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { accountId } = await req.json()
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const acc = await prisma.tradingAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })
  if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const updated = await prisma.tradingAccount.update({
    where: { id: accountId },
    data: {
      tradovateName: null,
      tradovatePasswordEnc: null,
      tradovateCid: null,
      tradovateSecEnc: null,
      tradovateDeviceId: null,
      tradovateOAuthAccessEnc: null,
      tradovateOAuthExpiresAt: null,
      lastBrokerSyncError: null,
      brokerAutoSyncEnabled: false,
    },
  })

  return NextResponse.json({ success: true, account: sanitizeTradingAccount(updated) })
}
