import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const googleConfigured =
  typeof process.env.GOOGLE_CLIENT_ID === 'string' &&
  process.env.GOOGLE_CLIENT_ID.length > 0 &&
  typeof process.env.GOOGLE_CLIENT_SECRET === 'string' &&
  process.env.GOOGLE_CLIENT_SECRET.length > 0

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        if (account?.provider === 'google') {
          const email = (user.email || profile?.email || '').toLowerCase().trim()
          if (!email) return token
          const dbUser = await prisma.user.upsert({
            where: { email },
            create: {
              email,
              name: user.name || profile?.name || null,
              image: user.image || profile?.picture || null,
              password: null,
            },
            update: {
              name: user.name || profile?.name || undefined,
              image: user.image || profile?.picture || undefined,
            },
          })
          token.id = dbUser.id
        } else {
          token.id = user.id
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
