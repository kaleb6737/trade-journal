'use client'

import { SessionProvider } from 'next-auth/react'

/** Pass `session` from `getServerSession` in root layout — avoids NextAuth SSR/hydration issues in the App Router. */
export default function Providers({ children, session }) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}
