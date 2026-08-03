'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, LoginFormData } from '@/utils/validation-schemas'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'

import { Suspense } from 'react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      toast(errorParam, 'error')
    }

    const codeParam = searchParams.get('code')
    if (codeParam) {
      // Supabase OAuth fallback redirected here. Forward the code to the callback handler.
      window.location.href = `/auth/callback?code=${codeParam}`
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

      if (isSupabaseConfigured) {
        const { createClient } = await import('@/services/supabase/client')
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            toast(
              'Email belum dikonfirmasi. Cek inbox email Anda atau matikan "Confirm email" di Supabase Dashboard (Authentication > Providers > Email)',
              'error'
            )
          } else {
            toast(error.message || 'Email atau password salah', 'error')
          }
          setIsLoading(false)
          return
        }

        toast('Masuk berhasil! Mengalihkan ke Dashboard...', 'success')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 800)
        return
      }

      // Demo static fallback if Supabase env is not configured yet
      setTimeout(() => {
        setIsLoading(false)
        const emailLower = data.email.toLowerCase()

        if (emailLower === 'wrong@test.com') {
          toast('Email atau password salah', 'error')
          return
        }

        toast('Masuk berhasil (Demo)! Mengalihkan ke Dashboard...', 'success')
        setTimeout(() => {
          router.push('/dashboard')
        }, 800)
      }, 1000)
    } catch (err: any) {
      toast(err?.message || 'Terjadi kesalahan sistem saat masuk', 'error')
      setIsLoading(false)
    }
  }

  const handleOAuthLogin = async () => {
    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

      if (isSupabaseConfigured) {
        const { createClient } = await import('@/services/supabase/client')
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) {
          if (error.message.toLowerCase().includes('provider is not enabled') || error.message.toLowerCase().includes('validation_failed')) {
            toast('Google Login belum diaktifkan di Supabase Dashboard (Authentication > Providers > Google)', 'error')
          } else {
            toast(error.message, 'error')
          }
          return
        }
        return
      }

      toast('Masuk dengan Google (Simulasi Demo)', 'info')
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    } catch (err: any) {
      toast(err?.message || 'Gagal memulai login Google', 'error')
    }
  }


  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Welcome Back!
        </h2>
        <p className="text-xs text-muted-foreground">
          Welcome back! Please enter your details.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password with Eye Toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground/80 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Input password"
              className="flex h-11 w-full rounded-lg border border-border bg-card px-3.5 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive font-medium mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-card"
            />
            <span>Remember me</span>
          </label>
          <button
            type="button"
            onClick={() => toast('Fitur Lupa Password dikirim ke email', 'info')}
            className="text-primary hover:underline font-semibold"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Log In Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full mt-3 h-11 font-bold text-sm"
          isLoading={isLoading}
        >
          Log In
        </Button>
      </form>

      {/* Or continue with Separator */}
      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-border w-full" />
        <span className="bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-wider absolute">
          Or continue with
        </span>
      </div>

      {/* Social Login OAuth Buttons */}
      <div>
        <button
          type="button"
          onClick={handleOAuthLogin}
          className="flex items-center justify-center gap-2.5 w-full h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-sm cursor-pointer hover:border-primary/40"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Masuk dengan Google</span>
        </button>
      </div>


      {/* Footer link */}
      <div className="text-center pt-3">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-primary font-bold hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
