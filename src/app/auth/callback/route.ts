import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle PKCE code exchange (OAuth & magic link & password recovery)
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Jika session berasal dari recovery (lupa password), arahkan ke halaman reset
      const sessionType = data?.user?.recovery_sent_at ? 'recovery' : null
      const redirectTarget = next === '/reset-password' || sessionType === 'recovery'
        ? '/reset-password'
        : next

      return NextResponse.redirect(`${origin}${redirectTarget}`)
    } else {
      console.error('Auth Callback Error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Link+tidak+valid+atau+sudah+kadaluarsa`)
}
