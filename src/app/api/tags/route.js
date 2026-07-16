import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tags = await prisma.tag.findMany({ where: { userId: session.user.id }, orderBy: { name: 'asc' } })
  return NextResponse.json({ tags })
}

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, color } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  try {
    const tag = await prisma.tag.create({ data: { userId: session.user.id, name, color: color || '#D4AF37' } })
    return NextResponse.json({ tag }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 })
  }
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
