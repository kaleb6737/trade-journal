import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AppShell from '@/components/layout/AppShell'
import PaywallScreen from '@/components/billing/PaywallScreen'

/**
 * Wraps every `(app)/*` route.
 * - Unauthenticated → redirect to `/auth/login`
 * - FREE plan → render `<PaywallScreen />` (sidebar stays visible so they can jump to /pricing)
 * - Paid plan → render the requested page
 */
export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  })

  // Session cookie points at a user that no longer exists (e.g. after a DB
  // reset/migration). Force a fresh login so the cookie gets rewritten.
  if (!user) {
    redirect('/auth/login?reason=stale-session')
  }

  const plan = user.plan || 'FREE'
  const isPaid = plan === 'PRO' || plan === 'ULTIMATE'

  return <AppShell>{isPaid ? children : <PaywallScreen plan={plan} />}</AppShell>
}
