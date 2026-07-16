import { NextResponse } from 'next/server'
import { isTradovateOAuthConfigured } from '@/lib/tradovateOAuth'

/** Public: whether server has OAuth client credentials (no secrets returned). */
export async function GET() {
  return NextResponse.json({ configured: isTradovateOAuthConfigured() })
}
