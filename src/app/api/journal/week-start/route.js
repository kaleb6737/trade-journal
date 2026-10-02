import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const sorted = (list) => [...list].sort((a, b) => a - b)

/** Start a new journal week right now. */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { weekStarts: true } })
  const now = new Date()
  const latest = sorted(user?.weekStarts || []).at(-1)
  // A double-click shouldn't create a one-second week.
  if (latest && now - latest < 60_000) return NextResponse.json({ weekStarts: sorted(user.weekStarts) })

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { weekStarts: { push: now } },
    select: { weekStarts: true },
  })
  return NextResponse.json({ weekStarts: sorted(updated.weekStarts) })
}

/** Undo the most recent "start a new week". */
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { weekStarts: true } })
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { weekStarts: sorted(user?.weekStarts || []).slice(0, -1) },
    select: { weekStarts: true },
  })
  return NextResponse.json({ weekStarts: sorted(updated.weekStarts) })
}
