import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

function parseUa(ua: string): { browser: string; os: string } {
  let browser = 'Desconhecido'
  let os      = 'Desconhecido'

  if (/Edg\//.test(ua))       browser = 'Microsoft Edge'
  else if (/Chrome\//.test(ua)) browser = 'Google Chrome'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/OPR\/|Opera\//.test(ua)) browser = 'Opera'

  if (/Windows NT/.test(ua))      os = 'Windows'
  else if (/Mac OS X/.test(ua))   os = 'macOS'
  else if (/Android/.test(ua))    os = 'Android'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua))      os = 'Linux'

  return { browser, os }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null

        // Extract IP and User-Agent from the request
        const headers  = (req as any)?.headers ?? {}
        const rawIp    = headers['x-forwarded-for'] ?? headers['x-real-ip'] ?? null
        const ip       = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : null
        const ua       = typeof headers['user-agent'] === 'string' ? headers['user-agent'] : null
        const parsed   = ua ? parseUa(ua) : { browser: 'Desconhecido', os: 'Desconhecido' }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true, name: true, email: true, password: true,
            role: true, theme: true, accentColor: true,
          },
        })

        if (!user) {
          // Log failed attempt — find any user with that email to attach userId, or skip
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          await prisma.auditLog.create({
            data: {
              userId:   user.id,
              action:   'LOGIN_FAILED',
              entity:   'User',
              entityId: user.id,
              metadata: JSON.stringify({ ip, browser: parsed.browser, os: parsed.os, ua, at: new Date().toISOString() }),
            },
          }).catch(() => {})
          return null
        }

        const now = new Date()

        // Update last login info and log success in parallel
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: now, lastLoginIp: ip, lastLoginUa: ua },
          }),
          prisma.auditLog.create({
            data: {
              userId:   user.id,
              action:   'LOGIN_SUCCESS',
              entity:   'User',
              entityId: user.id,
              metadata: JSON.stringify({ ip, browser: parsed.browser, os: parsed.os, ua, at: now.toISOString() }),
            },
          }),
        ]).catch(() => {})

        return {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          theme:       (user as any).theme       ?? 'dark',
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
        ;(session.user as any).theme      = token.theme       ?? 'dark'
        ;(session.user as any).accentColor = token.accentColor ?? 'blue'
        ;(session.user as any).tokenIat   = token.iat
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
