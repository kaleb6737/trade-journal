import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptBrokerSecret } from '@/lib/brokerCrypto'
import {
  exchangeTradovateOAuthCode,
  fetchTradovateOAuthProfile,
  getTradovateOAuthRedirectUri,
  verifyTradovateOAuthState,
} from '@/lib/tradovateOAuth'

function redirectAccounts(req, query) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || ''
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const origin = base || `${proto}://${host}`
  const q = new URLSearchParams(query)
  return NextResponse.redirect(`${origin}/accounts?${q.toString()}`)
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const err = searchParams.get('error')
  const errDesc = searchParams.get('error_description')
  if (err) {
    return redirectAccounts(req, {
      tradovate: 'error',
      msg: errDesc || err,
    })
  }

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  if (!code || !state) {
    return redirectAccounts(req, { tradovate: 'error', msg: 'Missing code or state' })
  }

  const parsed = verifyTradovateOAuthState(state)
  if (!parsed) {
    return redirectAccounts(req, { tradovate: 'error', msg: 'Invalid or expired OAuth state' })
  }

  let redirectUri
  try {
    redirectUri = getTradovateOAuthRedirectUri(req)
  } catch (e) {
    return redirectAccounts(req, { tradovate: 'error', msg: e.message || 'OAuth redirect misconfigured' })
  }

  let tokens
  try {
    tokens = await exchangeTradovateOAuthCode({
      demo: parsed.demo,
      code,
      redirectUri,
    })
  } catch (e) {
    return redirectAccounts(req, {
      tradovate: 'error',
      msg: e.message || 'Token exchange failed',
    })
  }

  const acc = await prisma.tradingAccount.findFirst({
    where: { id: parsed.accountId, userId: parsed.userId },
  })
  if (!acc) {
    return redirectAccounts(req, { tradovate: 'error', msg: 'Account no longer exists' })
  }

  const profile = await fetchTradovateOAuthProfile(parsed.demo, tokens.accessToken)
  const displayName =
    profile?.name ||
    profile?.fullName ||
    profile?.userName ||
    profile?.email ||
    profile?.login ||
    null

  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)

  await prisma.tradingAccount.update({
    where: { id: acc.id },
    data: {
      broker: 'Tradovate',
      tradovateDemo: parsed.demo,
      tradovateOAuthAccessEnc: encryptBrokerSecret(tokens.accessToken),
      tradovateOAuthExpiresAt: expiresAt,
      tradovateName: displayName ? String(displayName).slice(0, 120) : acc.tradovateName,
      tradovatePasswordEnc: null,
      tradovateCid: null,
      tradovateSecEnc: null,
      tradovateDeviceId: null,
      lastBrokerSyncError: null,
      brokerAutoSyncEnabled: true,
    },
  })

  return redirectAccounts(req, { tradovate: 'connected' })
}
