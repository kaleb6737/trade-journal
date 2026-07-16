import { NextResponse } from 'next/server'

export async function GET(req) {
  const url = new URL(req.url)
  const error = url.searchParams.get('error') || 'unknown'
  return NextResponse.redirect(new URL(`/auth/login?error=${error}`, req.url))
}
