/**
 * Seed script — usa SUPABASE_SERVICE_ROLE_KEY (nunca expor no frontend)
 * Rodar: npx tsx scripts/seed.ts
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('\n❌ Variáveis ausentes:')
  if (!url) console.error('   NEXT_PUBLIC_SUPABASE_URL não definida')
  if (!serviceKey) console.error('   SUPABASE_SERVICE_ROLE_KEY não definida')
  console.error('\nCrie um arquivo .env.local com essas variáveis.\n')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Fee plans ───────────────────────────────────────────────────
const FEE_PLANS = [
  { name: 'Start',  charged_percent: 6.50, charged_fixed: 1.80, cost_percent: 3.00, cost_fixed: 1.00 },
  { name: 'Growth', charged_percent: 5.90, charged_fixed: 1.60, cost_percent: 3.00, cost_fixed: 1.00 },
  { name: 'Prime',  charged_percent: 5.50, charged_fixed: 1.50, cost_percent: 3.00, cost_fixed: 1.00 },
  { name: 'Black',  charged_percent: 4.90, charged_fixed: 1.20, cost_percent: 3.00, cost_fixed: 1.00 },
]

// ── Merchants ───────────────────────────────────────────────────
const MERCHANTS = [
  { name: 'Loja Alpha',        email: 'alpha@loja.com',     document: '11.111.111/0001-11', type: 'ecommerce',    status: 'active',  plan: 'Prime'  },
  { name: 'Digital Pro',       email: 'contato@digital.com', document: '22.222.222/0001-22', type: 'infoprodutor', status: 'active',  plan: 'Black'  },
  { name: 'Market Fit Store',  email: 'mkt@marketfit.com',  document: '33.333.333/0001-33', type: 'ecommerce',    status: 'review',  plan: 'Growth' },
  { name: 'Curso Elite',       email: 'ola@cursoelite.com', document: '44.444.444/0001-44', type: 'infoprodutor', status: 'blocked', plan: 'Start'  },
  { name: 'Oferta Max',        email: 'max@oferta.com',     document: '55.555.555/0001-55', type: 'ecommerce',    status: 'active',  plan: 'Growth' },
]

// ── Users ────────────────────────────────────────────────────────
const USERS = [
  { email: 'admin@masterpagamentos.com', password: 'admin123',   name: 'Administrador',   role: 'admin'  },
  { email: 'cliente@teste.com',          password: 'cliente123', name: 'Cliente Teste',   role: 'client' },
]

async function seed() {
  console.log('\n🌱 Iniciando seed do Master Pagamentos...\n')

  // 1. Fee plans
  console.log('📋 Inserindo planos de taxa...')
  const { error: fpError } = await admin
    .from('fee_plans')
    .upsert(FEE_PLANS, { onConflict: 'name' })
  if (fpError) throw new Error(`fee_plans: ${fpError.message}`)
  console.log(`   ✅ ${FEE_PLANS.length} planos inseridos`)

  // 2. Merchants
  console.log('🏪 Inserindo merchants...')
  const { error: mError } = await admin
    .from('merchants')
    .upsert(MERCHANTS, { onConflict: 'email' })
  if (mError) throw new Error(`merchants: ${mError.message}`)
  console.log(`   ✅ ${MERCHANTS.length} merchants inseridos`)

  // 3. Users
  console.log('👤 Criando usuários...')
  for (const u of USERS) {
    // Check if user already exists
    const { data: existing } = await admin.auth.admin.listUsers()
    const found = existing?.users.find((x) => x.email === u.email)

    let userId: string

    if (found) {
      console.log(`   ⏭️  ${u.email} já existe, atualizando metadata...`)
      const { error: updateErr } = await admin.auth.admin.updateUserById(found.id, {
        app_metadata: { role: u.role },
      })
      if (updateErr) throw new Error(`updateUser ${u.email}: ${updateErr.message}`)
      userId = found.id
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        app_metadata: { role: u.role },
      })
      if (createErr || !created.user) throw new Error(`createUser ${u.email}: ${createErr?.message}`)
      userId = created.user.id
      console.log(`   ✅ ${u.email} criado`)
    }

    // Upsert profile
    const { error: profileErr } = await admin.from('profiles').upsert(
      { id: userId, name: u.name, email: u.email, role: u.role, status: 'active' },
      { onConflict: 'id' }
    )
    if (profileErr) throw new Error(`profile ${u.email}: ${profileErr.message}`)
  }

  console.log('\n✅ Seed concluído com sucesso!')
  console.log('\nUsuários de teste:')
  console.log('  Admin  → admin@masterpagamentos.com  / admin123')
  console.log('  Cliente → cliente@teste.com           / cliente123\n')
}

seed().catch((err) => {
  console.error('\n❌ Erro no seed:', err.message)
  process.exit(1)
})
