/**
 * Testes específicos para o export do Extrato CDI
 *
 * Cenário: merchant-export tem 9 movimentações distribuídas de out/2025 a jun/2026.
 * Objetivo: verificar que o saldo inicial de cada período filtrado é reconstruído
 *           corretamente a partir de logs ANTERIORES ao dateFrom (não começa em 0).
 *
 * Filtros testados: 30d | 90d | ytd | custom (2026-03-01 a 2026-05-31)
 * Endpoints:  /api/cliente/cdi/export (seller)
 *             /api/admin/cdi/export?merchantId=... (admin)
 */

const BASE          = 'http://localhost:3000'
const MERCHANT_ID   = 'merchant-export'
const SELLER_EMAIL  = 'export@teste.com'
const SELLER_PASS   = 'teste123'
const ADMIN_EMAIL   = 'admin@masterpagamentos.com'
const ADMIN_PASS    = 'admin123'

// ─── Expected timeline ───────────────────────────────────────────────────────
// Dates are UTC. Running balance after each log is tracked precisely.
// All amounts chosen so floating-point rounding in .toFixed(2) is stable.
//
//  idx | date        | action       | amount  | balance_after
//  1   | 2025-10-01  | ADD_TO_CDI   | 10000   | 10000.00
//  2   | 2025-11-01  | CDI_CREDIT   | 60.00   | 10060.00
//  3   | 2025-12-01  | ADD_TO_CDI   | 5000    | 15060.00
//  4   | 2026-01-15  | CDI_CREDIT   | 90.36   | 15150.36
//  5   | 2026-02-15  | CDI_WITHDRAW | 2000    | 13150.36
//  6   | 2026-03-15  | CDI_CREDIT   | 78.90   | 13229.26
//  7   | 2026-04-15  | ADD_TO_CDI   | 3000    | 16229.26
//  8   | 2026-05-15  | CDI_CREDIT   | 97.38   | 16326.64
//  9   | 2026-06-15  | CDI_WITHDRAW | 1000    | 15326.64   ← final

// Period cut-offs (today = 2026-07-01):
//   30d  → dateFrom ≈ 2026-06-01  (prior: logs 1-8, initialBalance = 16326.64)
//   90d  → dateFrom ≈ 2026-04-02  (prior: logs 1-6, initialBalance = 13229.26)
//   ytd  → dateFrom = 2026-01-01  (prior: logs 1-3, initialBalance = 15060.00)
//   custom 2026-03-01→2026-05-31  (prior: logs 1-5, initialBalance = 13150.36)

const SCENARIOS = [
  {
    name: '30d',
    period: '30d',
    label: 'Últimos 30 dias',
    expectedInitialBalance: 16326.64,
    // Only log 9 (2026-06-15) falls in window. Rows are newest-first.
    expectedRows: [
      { tipo: 'Resgate CDI', valor: '1000.00', saldoAntes: '16326.64', saldoDepois: '15326.64', status: 'Concluído' },
    ],
    // What saldoAntes would be if bug (running=0) still existed:
    bugSaldoAntes: '0.00',
  },
  {
    name: '90d',
    period: '90d',
    label: 'Últimos 90 dias',
    expectedInitialBalance: 13229.26,
    // Logs 7,8,9 — reversed: 9,8,7
    expectedRows: [
      { tipo: 'Resgate CDI',        valor: '1000.00', saldoAntes: '16326.64', saldoDepois: '15326.64', status: 'Concluído' },
      { tipo: 'Rendimento Creditado', valor: '97.38',  saldoAntes: '16229.26', saldoDepois: '16326.64', status: 'Concluído' },
      { tipo: 'Aporte CDI',          valor: '3000.00', saldoAntes: '13229.26', saldoDepois: '16229.26', status: 'Concluído' },
    ],
    bugSaldoAntes: '0.00',
  },
  {
    name: 'ytd',
    period: 'ytd',
    label: 'YTD (Ano 2026)',
    expectedInitialBalance: 15060.00,
    // Logs 4-9 — reversed: 9,8,7,6,5,4
    expectedRows: [
      { tipo: 'Resgate CDI',          valor: '1000.00', saldoAntes: '16326.64', saldoDepois: '15326.64', status: 'Concluído' },
      { tipo: 'Rendimento Creditado', valor: '97.38',   saldoAntes: '16229.26', saldoDepois: '16326.64', status: 'Concluído' },
      { tipo: 'Aporte CDI',           valor: '3000.00', saldoAntes: '13229.26', saldoDepois: '16229.26', status: 'Concluído' },
      { tipo: 'Rendimento Creditado', valor: '78.90',   saldoAntes: '13150.36', saldoDepois: '13229.26', status: 'Concluído' },
      { tipo: 'Resgate CDI',          valor: '2000.00', saldoAntes: '15150.36', saldoDepois: '13150.36', status: 'Concluído' },
      { tipo: 'Rendimento Creditado', valor: '90.36',   saldoAntes: '15060.00', saldoDepois: '15150.36', status: 'Concluído' },
    ],
    bugSaldoAntes: '0.00',
  },
  {
    name: 'custom (2026-03-01 a 2026-05-31)',
    period: 'custom',
    from: '2026-03-01',
    to:   '2026-05-31',
    label: 'Custom 2026-03-01 a 2026-05-31',
    expectedInitialBalance: 13150.36,
    // Logs 6,7,8 — reversed: 8,7,6
    expectedRows: [
      { tipo: 'Rendimento Creditado', valor: '97.38',   saldoAntes: '16229.26', saldoDepois: '16326.64', status: 'Concluído' },
      { tipo: 'Aporte CDI',           valor: '3000.00', saldoAntes: '13229.26', saldoDepois: '16229.26', status: 'Concluído' },
      { tipo: 'Rendimento Creditado', valor: '78.90',   saldoAntes: '13150.36', saldoDepois: '13229.26', status: 'Concluído' },
    ],
    bugSaldoAntes: '0.00',
  },
]

// ─── Cookie jar ──────────────────────────────────────────────────────────────

class CookieJar {
  constructor() { this._map = new Map() }

  update(res) {
    if (!res) return
    // Accept either a Response object or a raw header string/array
    const entries = typeof res.headers?.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : Array.isArray(res) ? res : (res ? [res] : [])
    for (const entry of entries) {
      if (!entry) continue
      const [nameVal] = entry.split(';')
      const eqIdx = nameVal.indexOf('=')
      if (eqIdx < 0) continue
      const name = nameVal.slice(0, eqIdx).trim()
      const val  = nameVal.slice(eqIdx + 1).trim()
      this._map.set(name, val)
    }
  }

  header() {
    return [...this._map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function login(email, password) {
  const jar = new CookieJar()

  // Step 1: get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  jar.update(csrfRes)
  const { csrfToken } = await csrfRes.json()

  // Step 2: POST credentials — must follow redirect manually to capture session cookie
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': jar.header(),
    },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: BASE }),
    redirect: 'manual',
  })
  jar.update(loginRes)

  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { Cookie: jar.header() },
  })
  const session = await sessionRes.json()
  if (!session?.user?.email) throw new Error(`Login failed for ${email}`)
  return jar
}

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVRow(line) {
  const fields = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      fields.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

function parseCSV(text) {
  const lines = text.split('\n')
  const dataLines = lines.filter(l => l.trim() && !l.startsWith('#'))
  if (dataLines.length === 0) return { header: [], rows: [] }
  const [headerLine, ...rowLines] = dataLines
  const header = parseCSVRow(headerLine)
  const rows   = rowLines.filter(Boolean).map(parseCSVRow)
  return { header, rows }
}

// Map CSV row array → named object using column indices from both routes:
// 0:Data/Hora 1:Tipo 2:Valor(R$) 3:SaldoAntes 4:SaldoDepois 5:Taxa 6:Base 7:Status 8:Descrição
function rowObj(fields) {
  return {
    tipo:       fields[1],
    valor:      fields[2],
    saldoAntes: fields[3],
    saldoDepois:fields[4],
    taxa:       fields[5],
    base:       fields[6],
    status:     fields[7],
  }
}

// ─── Fetch CSV export ─────────────────────────────────────────────────────────

async function fetchSellerExport(jar, scenario) {
  let url = `${BASE}/api/cliente/cdi/export?period=${scenario.period}&format=csv`
  if (scenario.period === 'custom') url += `&from=${scenario.from}&to=${scenario.to}`
  const res = await fetch(url, { headers: { Cookie: jar.header() } })
  if (!res.ok) throw new Error(`Seller export HTTP ${res.status}: ${await res.text()}`)
  return res.text()
}

async function fetchAdminExport(jar, scenario) {
  let url = `${BASE}/api/admin/cdi/export?merchantId=${MERCHANT_ID}&period=${scenario.period}&format=csv`
  if (scenario.period === 'custom') url += `&from=${scenario.from}&to=${scenario.to}`
  const res = await fetch(url, { headers: { Cookie: jar.header() } })
  if (!res.ok) throw new Error(`Admin export HTTP ${res.status}: ${await res.text()}`)
  return res.text()
}

// ─── Assertion helpers ────────────────────────────────────────────────────────

let passCount = 0, failCount = 0
const failures = []

function assert(condition, message, extra = '') {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passCount++
  } else {
    console.log(`  ❌ ${message}${extra ? '\n     ' + extra : ''}`)
    failCount++
    failures.push(message)
  }
}

// ─── Core validator ───────────────────────────────────────────────────────────

function validateExport(csv, scenario, endpoint) {
  const { header, rows } = parseCSV(csv)

  console.log(`\n  [${endpoint}] Período: ${scenario.label}`)
  console.log(`  CSV header columns: ${header.length}, data rows: ${rows.length}`)

  // 1. Row count
  assert(
    rows.length === scenario.expectedRows.length,
    `${endpoint} — Linhas esperadas: ${scenario.expectedRows.length}, obtidas: ${rows.length}`,
    rows.length !== scenario.expectedRows.length
      ? `Tipos obtidos: ${rows.map(r => rowObj(r).tipo).join(', ')}`
      : ''
  )

  // 2. Last row in CSV (chronologically FIRST = earliest in period) must have
  //    saldoAntes equal to the reconstructed initialBalance (the bug check).
  if (rows.length > 0) {
    const lastRow     = rowObj(rows[rows.length - 1])   // oldest (last in reversed list)
    const firstExpRow = scenario.expectedRows[scenario.expectedRows.length - 1]

    assert(
      lastRow.saldoAntes === firstExpRow.saldoAntes,
      `${endpoint} — Saldo inicial do período: esperado R$ ${firstExpRow.saldoAntes}, obtido R$ ${lastRow.saldoAntes}`,
      lastRow.saldoAntes === scenario.bugSaldoAntes
        ? `⚠️  BUG CONFIRMADO: saldoAntes = ${scenario.bugSaldoAntes} (running iniciou em zero!)`
        : ''
    )
  }

  // 3. Validate every row against expected
  for (let i = 0; i < Math.min(rows.length, scenario.expectedRows.length); i++) {
    const got = rowObj(rows[i])
    const exp = scenario.expectedRows[i]

    assert(got.tipo       === exp.tipo,       `${endpoint} linha ${i+1} — tipo: "${exp.tipo}" vs "${got.tipo}"`)
    assert(got.valor      === exp.valor,      `${endpoint} linha ${i+1} — valor: ${exp.valor} vs ${got.valor}`)
    assert(got.saldoAntes === exp.saldoAntes, `${endpoint} linha ${i+1} — saldoAntes: ${exp.saldoAntes} vs ${got.saldoAntes}`)
    assert(got.saldoDepois=== exp.saldoDepois,`${endpoint} linha ${i+1} — saldoDepois: ${exp.saldoDepois} vs ${got.saldoDepois}`)
    assert(got.status     === exp.status,     `${endpoint} linha ${i+1} — status: ${exp.status} vs ${got.status}`)
  }

  // 4. Internal consistency: saldoDepois - saldoAntes = ±valor (per row)
  let allConsistent = true
  for (let i = 0; i < rows.length; i++) {
    const r     = rowObj(rows[i])
    const antes = parseFloat(r.saldoAntes)
    const dep   = parseFloat(r.saldoDepois)
    const val   = parseFloat(r.valor) || 0
    const tipo  = r.tipo

    const expectedDiff = (
      tipo === 'Aporte CDI' || tipo === 'Rendimento Creditado' ? val : -val
    )
    const actualDiff = Math.round((dep - antes) * 100) / 100
    if (Math.abs(actualDiff - expectedDiff) > 0.005) {
      console.log(`  ❌ ${endpoint} linha ${i+1} — consistência saldo: antes=${antes} + ${expectedDiff} ≠ depois=${dep} (diff=${actualDiff})`)
      allConsistent = false
      failCount++
    }
  }
  if (allConsistent && rows.length > 0) {
    console.log(`  ✅ ${endpoint} — consistência interna: saldoAntes + valor = saldoDepois em todas as ${rows.length} linhas`)
    passCount++
  }

  return rows
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  TESTES: CDI Extrato Export — Saldo Inicial Correto')
  console.log('  merchant-export | 9 logs | out/2025 → jun/2026')
  console.log('═══════════════════════════════════════════════════════════════')

  // ── Authenticate ──
  console.log('\n► Autenticando seller (export@teste.com)…')
  const sellerJar = await login(SELLER_EMAIL, SELLER_PASS)
  console.log('  ✅ Login seller OK')

  console.log('► Autenticando admin (admin@masterpagamentos.com)…')
  const adminJar  = await login(ADMIN_EMAIL, ADMIN_PASS)
  console.log('  ✅ Login admin OK')

  // ── Run scenarios ──
  for (const scenario of SCENARIOS) {
    console.log(`\n${'─'.repeat(63)}`)
    console.log(`▸ CENÁRIO: ${scenario.name}`)
    console.log(`  dateFrom context: prior logs → initialBalance esperado = R$ ${scenario.expectedInitialBalance.toFixed(2)}`)
    console.log(`  Se bug existisse: saldoAntes da linha mais antiga seria ${scenario.bugSaldoAntes}`)

    let sellerCsv, adminCsv
    try {
      sellerCsv = await fetchSellerExport(sellerJar, scenario)
      adminCsv  = await fetchAdminExport(adminJar, scenario)
    } catch (e) {
      console.log(`  ❌ Falha ao buscar export: ${e.message}`)
      failCount++; failures.push(e.message)
      continue
    }

    const sellerRows = validateExport(sellerCsv, scenario, 'SELLER')
    const adminRows  = validateExport(adminCsv,  scenario, 'ADMIN ')

    // Seller and admin must return identical data for same merchant
    const sellerSerialized = sellerRows.map(r => r.slice(2).join('|')).join('\n')
    const adminSerialized  = adminRows.map (r => r.slice(2).join('|')).join('\n')
    assert(
      sellerSerialized === adminSerialized,
      `SELLER ≡ ADMIN — exports idênticos para merchant-export no período ${scenario.name}`,
      sellerSerialized !== adminSerialized
        ? `Seller linhas: ${sellerRows.length}, Admin linhas: ${adminRows.length}`
        : ''
    )
  }

  // ── Isolation probe: seller cannot fetch another merchant's export ──
  console.log(`\n${'─'.repeat(63)}`)
  console.log('▸ PROBE DE ISOLAMENTO: seller tenta exportar merchant-other')
  const isoRes = await fetch(
    `${BASE}/api/admin/cdi/export?merchantId=merchant-other&period=90d&format=csv`,
    { headers: { Cookie: sellerJar.header() } }
  )
  assert(
    isoRes.status === 401,
    `Isolamento: /api/admin/cdi/export?merchantId=merchant-other retorna 401 para seller (obteve ${isoRes.status})`
  )

  // Seller export endpoint ignores merchantId param (uses session merchantId)
  const isoSellerExport = await fetch(
    `${BASE}/api/cliente/cdi/export?period=90d&merchantId=merchant-other&format=csv`,
    { headers: { Cookie: sellerJar.header() } }
  )
  const isoText = await isoSellerExport.text()
  const hasOtherMerchant = isoText.includes('50000') || isoText.includes('Outro Seller')
  assert(
    !hasOtherMerchant,
    'Isolamento: /api/cliente/cdi/export ignora merchantId param — retorna somente dados de merchant-export',
    hasOtherMerchant ? 'VAZAMENTO: dados de merchant-other presentes no export do seller' : ''
  )
  if (!hasOtherMerchant && isoSellerExport.ok) {
    console.log(`  🔍 Export seller contém: "${isoText.split('\n')[0].trim()}"`)
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════════════════════')
  const total = passCount + failCount
  if (failCount === 0) {
    console.log(`  ✅ TODOS OS TESTES PASSARAM: ${passCount}/${total}`)
    console.log('\n  Bug corrigido confirmado:')
    console.log('  • buildExtrato() inicia "running = initialBalance" (não 0)')
    console.log('  • initialBalance reconstruído corretamente em todos os filtros')
    console.log('  • saldo antes/valor/saldo depois consistentes em todas as linhas')
    console.log('  • seller e admin retornam dados idênticos para mesmo merchant')
    console.log('  • isolamento: seller não acessa dados de outros merchants')
  } else {
    console.log(`  ❌ FALHAS: ${failCount}/${total}`)
    for (const f of failures) console.log(`     • ${f}`)
  }
  console.log('═══════════════════════════════════════════════════════════════\n')

  process.exit(failCount > 0 ? 1 : 0)
}

run().catch(e => { console.error('Erro fatal:', e); process.exit(1) })
