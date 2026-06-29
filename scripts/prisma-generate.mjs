import { execSync } from 'child_process'

// prisma generate only needs DATABASE_URL to exist for schema validation.
// It does NOT connect to the database. A placeholder is safe here.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://x:x@localhost/x'
}

execSync('npx prisma generate', { stdio: 'inherit' })
