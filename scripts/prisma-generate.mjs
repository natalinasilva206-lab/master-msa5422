import { execSync } from 'child_process'

execSync('npx prisma generate', {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://x:x@localhost/x',
  },
})
