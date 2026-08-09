'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { registerSchema, RegisterFormData } from '@/utils/validation-schemas'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      toast(errorParam, 'error')
    }

    const codeParam = searchParams.get('code')
    if (codeParam) {
      window.location.href = `/auth/callback?code=${codeParam}`
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      // Check if Supabase URL is configured
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

      if (isSupabaseConfigured) {
        const { createClient } = await import('@/services/supabase/client')
        const supabase = createClient()

        // Fetch approval gate toggle setting
        let isApprovalRequired = true
        try {
          const settingRes = await fetch('/api/admin/settings')
          if (settingRes.ok) {
            const settingJson = await settingRes.json()
            isApprovalRequired = settingJson.settings?.requireAdminApproval ?? true
          }
        } catch {}

        const initialStatus = isApprovalRequired ? 'pending' : 'active'

        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              display_name: data.name,
              phone: data.phone,
              status: initialStatus,
            },
          },
        })

        if (error) {
          if (error.message.toLowerCase().includes('rate limit exceeded')) {
            toast(
              'Batas email Supabase terlewati (Rate Limit). Silakan matikan "Confirm email" di Supabase Dashboard (Authentication > Providers > Email) untuk pendaftaran instan tanpa email.',
              'error'
            )
          } else {
            toast(error.message, 'error')
          }
          setIsLoading(false)
          return
        }

        // Trigger Event Notification to Admin if Pending
        if (isApprovalRequired) {
          try {
            await fetch('/api/admin/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'NEW_PENDING_USER',
                userEmail: data.email,
                userName: data.name,
                registeredAt: new Date().toISOString(),
              }),
            })
          } catch {}

          toast('Registrasi berhasil! Akun kamu sedang dalam antrian approval admin (biasanya 1x24 jam).', 'success')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          toast('Registrasi berhasil! Silakan cek email Anda untuk konfirmasi.', 'success')
          setTimeout(() => {
            router.push('/login')
          }, 1500)
        }
        return
      }

      // Demo static fallback if Supabase env is not configured yet
      setTimeout(() => {
        setIsLoading(false)
        if (data.email.toLowerCase() === 'exist@test.com') {
          toast('Email sudah terdaftar. Silakan masuk atau gunakan email lain.', 'error')
          return
        }
        toast('Registrasi berhasil (Demo)! Mengalihkan ke halaman Login...', 'success')
        setTimeout(() => {
          router.push('/login')
        }, 1000)
      }, 1000)
    } catch (err: any) {
      toast(err?.message || 'Terjadi kesalahan sistem', 'error')
      setIsLoading(false)
    }
  }

  const handleOAuthRegister = async () => {
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
            toast('Google Login/Signup belum diaktifkan di Supabase Dashboard (Authentication > Providers > Google)', 'error')
          } else {
            toast(error.message, 'error')
          }
          return
        }
        return
      }

      toast('Daftar dengan Google (Simulasi OAuth Demo)', 'info')
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    } catch (err: any) {
      toast(err?.message || 'Gagal memulai daftar dengan Google', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Create an Account
        </h2>
        <p className="text-xs text-muted-foreground">
          Start your automated trading journal & master your discipline.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
        <Input
          label="Full Name"
          placeholder="Enter your full name"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Nomor HP (WhatsApp Aktif)"
          type="tel"
          placeholder="Contoh: 081234567890"
          error={errors.phone?.message}
          {...register('phone')}
        />

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground/80 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters (letters & numbers)"
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground/80 uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              className="flex h-11 w-full rounded-lg border border-border bg-card px-3.5 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-destructive font-medium mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-3 h-11 font-bold text-sm"
          isLoading={isLoading}
        >
          Create Account
        </Button>
      </form>

      {/* Or continue with Separator */}
      <div className="relative flex items-center justify-center my-5">
        <div className="border-t border-border w-full" />
        <span className="bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-wider absolute">
          Or continue with
        </span>
      </div>

      {/* Social Login OAuth Buttons */}
      <div>
        <button
          type="button"
          onClick={handleOAuthRegister}
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
          <span>Daftar dengan Google</span>
        </button>
      </div>

      {/* Footer link */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary font-bold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
