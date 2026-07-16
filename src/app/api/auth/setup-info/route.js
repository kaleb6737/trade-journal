import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe, hasStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * Given a Stripe Checkout session_id, returns the email the customer paid
 * with — so the /auth/setup page can display it. Only returns an email
 * when the paired local user is still password-less (i.e. this is a fresh
 * account waiting to be finalized).
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  if (!hasStripe()) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  try {
    const stripe = getStripe()
    const checkout = await stripe.checkout.sessions.retrieve(sessionId)
    if (checkout.payment_status !== 'paid' && checkout.status !== 'complete') {
      return NextResponse.json({ error: 'Checkout not completed' }, { status: 400 })
    }

    const email = (checkout.customer_details?.email || '').toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'No email on session' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, password: true },
    })
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    return NextResponse.json({
      email: user.email,
      needsPassword: !user.password,
    })
  } catch (err) {
    console.error('[auth.setup-info]', err)
    return NextResponse.json({ error: 'Failed to load setup info' }, { status: 500 })
  }
}
