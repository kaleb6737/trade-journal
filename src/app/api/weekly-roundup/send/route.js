import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAndSendWeeklyRoundup, smtpConfigured } from '@/lib/weeklyRoundup'

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const previewOnly = !!body.previewOnly

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    const result = await createAndSendWeeklyRoundup(user, {
      force: true,
      previewOnly: previewOnly || !smtpConfigured(),
    })
    return NextResponse.json({
      ok: true,
      ...result,
      smtpConfigured: smtpConfigured(),
      note: !smtpConfigured() ? 'SMTP not configured — generated preview/log only.' : undefined,
    })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to send weekly roundup' }, { status: 500 })
  }
}
