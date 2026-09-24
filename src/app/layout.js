import './globals.css'
import Providers from '@/components/Providers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata = {
  title: 'TradeXEssence — Premium Trading Journal',
  description: 'Track your trades, analyze performance, and grow as a trader with TradeXEssence — premium journaling, analytics, and broker-ready workflows.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      </head>
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
