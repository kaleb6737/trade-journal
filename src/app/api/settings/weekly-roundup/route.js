import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanError, gateFeature, planErrorResponse } from '@/lib/gateApi'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      weeklyRoundupEnabled: true,
      weeklyRoundupEmail: true,
      weeklyRoundupDay: true,
      weeklyRoundupHour: true,
      weeklyRoundupLastSentAt: true,
      email: true,
    },
  })

  return NextResponse.json({
    settings: {
      enabled: user?.weeklyRoundupEnabled || false,
      email: user?.weeklyRoundupEmail || user?.email || '',
      day: user?.weeklyRoundupDay ?? 0,
      hour: user?.weeklyRoundupHour ?? 18,
      lastSentAt: user?.weeklyRoundupLastSentAt || null,
    },
  })
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const enabled = !!body.enabled
  const day = Number.isInteger(body.day) ? body.day : parseInt(body.day ?? '0', 10)
  const hour = Number.isInteger(body.hour) ? body.hour : parseInt(body.hour ?? '18', 10)
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : ''

  if (day < 0 || day > 6) {
    return NextResponse.json({ error: 'day must be between 0 and 6' }, { status: 400 })
  }
  if (hour < 0 || hour > 23) {
    return NextResponse.json({ error: 'hour must be between 0 and 23' }, { status: 400 })
  }
  if (enabled && !emailRaw) {
    return NextResponse.json({ error: 'email is required when weekly roundup is enabled' }, { status: 400 })
  }

  if (enabled) {
    try {
      await gateFeature(session.user.id, 'weeklyRoundup', { upgradeTo: 'PRO' })
    } catch (e) {
      if (e instanceof PlanError) return planErrorResponse(e)
      throw e
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      weeklyRoundupEnabled: enabled,
      weeklyRoundupEmail: emailRaw || null,
      weeklyRoundupDay: day,
      weeklyRoundupHour: hour,
    },
    select: {
      weeklyRoundupEnabled: true,
      weeklyRoundupEmail: true,
      weeklyRoundupDay: true,
      weeklyRoundupHour: true,
      weeklyRoundupLastSentAt: true,
      email: true,
    },
  })

  return NextResponse.json({
    success: true,
    settings: {
      enabled: user.weeklyRoundupEnabled,
      email: user.weeklyRoundupEmail || user.email || '',
      day: user.weeklyRoundupDay,
      hour: user.weeklyRoundupHour,
      lastSentAt: user.weeklyRoundupLastSentAt,
    },
  })
}
