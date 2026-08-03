import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === 'your_supabase_url_here'
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {

      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public auth routes and API routes (API routes handle their own auth or token validation)
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isApiRoute = pathname.startsWith('/api/')
  const isAuthCallback = pathname.startsWith('/auth/callback')
  const isOnboardingRoute = pathname === '/onboarding'

  // If user is NOT logged in and trying to access protected UI routes (e.g., /dashboard, /trades, /mt5, etc.)
  if (!user && !isAuthRoute && !isApiRoute && !isAuthCallback && pathname !== '/preview') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user IS logged in
  if (user) {
    const phone = user.user_metadata?.phone || user.phone
    
    if (!phone && !isOnboardingRoute && !isAuthRoute && !isApiRoute && !isAuthCallback) {
      // Force user to onboarding if phone is missing
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    if (phone && isOnboardingRoute) {
      // User already has phone, redirect away from onboarding
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from auth pages
    if (isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
