const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

console.log('\n=== Environment Check ===')
console.log(`NODE_ENV:   ${process.env.NODE_ENV || 'undefined'}`)
console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}`)

let missing = false
REQUIRED.forEach((v) => {
  const present = !!process.env[v]
  console.log(`${v}: ${present ? 'PRESENT' : 'MISSING ⚠️'}`)
  if (!present) missing = true
})

// Warn (don't fail build) if service role key is absent — it's only needed for seed
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? 'PRESENT' : 'not set (only needed for seed)'}`)
console.log('=========================\n')

if (missing) {
  console.error('❌ Build abortado: variáveis obrigatórias ausentes.')
  console.error('Crie um arquivo .env.local ou configure no painel do Vercel.\n')
  process.exit(1)
}
