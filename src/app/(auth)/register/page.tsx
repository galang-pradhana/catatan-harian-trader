'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { registerSchema, RegisterFormData } from '@/utils/validation-schemas'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
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
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              display_name: data.name,
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


        toast('Registrasi berhasil! Silakan cek email Anda untuk konfirmasi.', 'success')
        setTimeout(() => {
          router.push('/login')
        }, 1500)
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

  const handleOAuthRegister = (provider: 'Google' | 'Apple') => {
    toast(`Daftar dengan ${provider} (Simulasi OAuth)`, 'info')
    setTimeout(() => {
      router.push('/dashboard')
    }, 800)
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
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleOAuthRegister('Google')}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-sm cursor-pointer"
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
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuthRegister('Apple')}
          className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-sm cursor-pointer"
        >
          <svg className="h-4 w-4 fill-current text-foreground" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.33.13-9.13-1.9-14.4-6.07-3.17-2.58-7.06-7.24-11.67-13.98-7.64-11.1-13.71-23.75-18.23-37.94-4.51-14.2-6.77-27.53-6.77-40 0-14.61 3.73-26.9 11.19-36.87 7.46-9.98 16.92-15.09 28.38-15.34 4.87-.13 10.15 1.13 15.86 3.78 5.71 2.65 9.77 3.98 12.18 3.98 2.03 0 6.09-1.27 12.18-3.8 6.09-2.53 11.45-3.73 16.08-3.6 8.5.38 15.93 2.92 22.3 7.62 6.37 4.7 10.85 10.88 13.44 18.54-7.62 4.59-11.55 11.06-11.8 19.42-.25 8.36 3.11 15.42 10.09 21.18 6.98 5.76 15.17 8.87 24.58 9.33-2.03 6.01-4.71 12.16-8.04 18.45zM119.22 31.04c0-6.73 2.51-13.43 7.53-20.1 5.02-6.67 11.43-10.98 19.23-12.94.38 1.14.57 2.22.57 3.24 0 6.73-2.57 13.56-7.71 20.48-5.14 6.92-11.58 11.25-19.32 12.99-.25-1.14-.38-2.37-.38-3.67z" />
          </svg>
          <span>Apple</span>
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
