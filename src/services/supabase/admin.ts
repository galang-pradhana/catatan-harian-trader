import { createClient } from '@supabase/supabase-js'

/**
 * Admin client menggunakan SUPABASE_SERVICE_ROLE_KEY untuk bypass RLS.
 * WAJIB di-set di environment variables (Vercel/lokal).
 * Jangan gunakan publishable key di sini — publishable key tunduk RLS!
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error(
      '[Admin Client] SUPABASE_SERVICE_ROLE_KEY tidak ditemukan. ' +
      'Tambahkan ke environment variables Vercel atau .env.local. ' +
      'Jangan gunakan publishable key — RLS akan memblokir query admin!'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
