import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  buildTradovateOAuthState,
  getTradovateOAuthRedirectUri,
  isTradovateOAuthConfigured,
  TRADOVATE_OAUTH_AUTHORIZE,
} from '@/lib/tradovateOAuth'
import { PlanError, gateFeature, planErrorResponse } from '@/lib/gateApi'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await gateFeature(session.user.id, 'brokerSync', { upgradeTo: 'ULTIMATE' })
  } catch (e) {
    if (e instanceof PlanError) return planErrorResponse(e)
    throw e
  }

  if (!isTradovateOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Tradovate OAuth is not configured. Set TRADOVATE_OAUTH_CLIENT_ID and TRADOVATE_OAUTH_CLIENT_SECRET.' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const demo = searchParams.get('demo') !== '0'

  if (!accountId) {
    return NextResponse.json({ error: 'accountId query parameter is required' }, { status: 400 })
  }

  const acc = await prisma.tradingAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })
  if (!acc) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (acc.broker !== 'Tradovate') {
    return NextResponse.json({ error: 'Account must use broker Tradovate' }, { status: 400 })
  }

  let redirectUri
  try {
    redirectUri = getTradovateOAuthRedirectUri(req)
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Bad OAuth config' }, { status: 500 })
  }

  const state = buildTradovateOAuthState({
    userId: session.user.id,
    accountId,
    demo,
  })

  const clientId = process.env.TRADOVATE_OAUTH_CLIENT_ID
  const url = new URL(TRADOVATE_OAUTH_AUTHORIZE)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'read')

  return NextResponse.redirect(url.toString())
}
