import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, name: true, email: true, password: true, role: true, theme: true, accentColor: true },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          theme: (user as any).theme ?? 'dark',
          accentColor: (user as any).accentColor ?? 'blue',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role        = (user as any).role
        token.id          = user.id
        token.theme       = (user as any).theme       ?? 'dark'
        token.accentColor = (user as any).accentColor ?? 'blue'
        token.iat         = Math.floor(Date.now() / 1000)
      }
      // Invalidate token if password was changed after it was issued
      if (token.id && token.iat) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true },
        }).catch(() => null)
        if (dbUser?.passwordChangedAt) {
          const changedAt = Math.floor(dbUser.passwordChangedAt.getTime() / 1000)
          if ((token.iat as number) < changedAt) return {}
        }
      }
      return token
    },
    async session({ session, token }) {
      if (!token.id) return { ...session, user: undefined } as any
      if (session.user) {
        (session.user as any).role        = token.role
        ;(session.user as any).id         = token.id
        ;(session.user as any).theme      = token.theme      ?? 'dark'
        ;(session.user as any).accentColor = token.accentColor ?? 'blue'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
