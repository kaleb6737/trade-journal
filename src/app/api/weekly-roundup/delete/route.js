import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const log = await prisma.weeklyRoundupLog.findUnique({ where: { id } })
  if (!log || log.userId !== session.user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.weeklyRoundupLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
