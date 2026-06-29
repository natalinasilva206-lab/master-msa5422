import { execSync } from 'child_process'

if (!process.env.DATABASE_URL) {
  console.error('\n❌ DATABASE_URL is not set.')
  console.error('Go to Vercel → Project → Settings → Environment Variables')
  console.error('Add DATABASE_URL with your Neon connection string.')
  console.error('Mark it for: Production ✓  Preview ✓  Development ✓\n')
  process.exit(1)
}

execSync('npx prisma generate', { stdio: 'inherit' })
execSync('npx prisma migrate deploy', { stdio: 'inherit' })
execSync('npx next build', { stdio: 'inherit' })
