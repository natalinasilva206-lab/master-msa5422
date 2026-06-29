const vars = ['POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']

console.log('\n=== Environment Check ===')
console.log(`NODE_ENV:   ${process.env.NODE_ENV || 'undefined'}`)
console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}`)
vars.forEach((v) => {
  console.log(`${v}: ${process.env[v] ? 'PRESENT' : 'MISSING ⚠️'}`)
})
console.log('=========================\n')
