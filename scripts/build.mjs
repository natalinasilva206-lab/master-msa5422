import { execSync } from 'child_process'

execSync('npx next build', { stdio: 'inherit' })
