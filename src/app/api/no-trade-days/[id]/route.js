import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const noTradeDay = await prisma.noTradeDay.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!noTradeDay) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ noTradeDay })
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.noTradeDay.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.noTradeDay.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
