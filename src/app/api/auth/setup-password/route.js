import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getStripe, hasStripe } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * Finishes a guest signup that was started via Stripe Checkout.
 *
 * Inputs: { session_id, password }
 *
 * We treat the Stripe Checkout `session_id` as a one-shot proof of purchase.
 * It must:
 *   - belong to a completed checkout,
 *   - map to an existing local User (created by `/billing/complete`),
 *   - and that user must not already have a password (so this endpoint
 *     cannot be used to take over an existing account).
 */
export async function POST(req) {
  if (!hasStripe()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    const { session_id: sessionId, password } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const stripe = getStripe()
    const checkout = await stripe.checkout.sessions.retrieve(sessionId)
    if (checkout.payment_status !== 'paid' && checkout.status !== 'complete') {
      return NextResponse.json({ error: 'Checkout not completed' }, { status: 400 })
    }

    const email = (checkout.customer_details?.email || '').toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'No email on session' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    if (user.password) {
      // This path only finalizes brand-new accounts. Existing accounts must
      // use the normal login flow (possibly with password reset).
      return NextResponse.json(
        { error: 'This account already has a password. Please sign in instead.' },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    })

    return NextResponse.json({ email: user.email })
  } catch (err) {
    console.error('[auth.setup-password]', err)
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
  }
}
