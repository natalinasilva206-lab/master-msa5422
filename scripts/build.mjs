import { execSync } from 'child_process'

if (!process.env.POSTGRES_PRISMA_URL) {
  console.error('\n❌ POSTGRES_PRISMA_URL is not set.')
  console.error('Go to Vercel → Project → Settings → Environment Variables')
  console.error('Connect a Vercel Postgres database or add POSTGRES_PRISMA_URL manually.\n')
  process.exit(1)
}

execSync('npx prisma generate', { stdio: 'inherit' })
execSync('npx prisma migrate deploy', { stdio: 'inherit' })
execSync('npx next build', { stdio: 'inherit' })
