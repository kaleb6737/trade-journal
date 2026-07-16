/** Auth pages use client hooks + SessionProvider; avoid stale static shells that break next-auth. */
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }) {
  return children
}
