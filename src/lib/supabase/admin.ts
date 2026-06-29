/**
 * Cliente admin com service_role key.
 * NUNCA importe este arquivo em componentes client-side ou em código que rode no browser.
 * Use apenas em scripts de seed, API routes server-side e Server Actions.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL não definida.')
  }
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não definida. ' +
      'Esta variável só deve existir em ambiente server-side (nunca exposta no frontend).'
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
