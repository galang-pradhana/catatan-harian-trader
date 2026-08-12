'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Harus ada minimal 1 huruf besar')
      .regex(/[0-9]/, 'Harus ada minimal 1 angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: 'Min. 8 karakter', valid: password.length >= 8 },
    { label: 'Huruf besar', valid: /[A-Z]/.test(password) },
    { label: 'Angka', valid: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.valid).length

  const colors = ['bg-destructive', 'bg-amber-500', 'bg-primary']
  const labels = ['', 'Lemah', 'Cukup', 'Kuat']

  if (!password) return null

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-[10px] flex items-center gap-1 ${
                c.valid ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="text-[8px]">{c.valid ? '✓' : '○'}</span>
              {c.label}
            </span>
          ))}
        </div>
        <span
          className={`text-[10px] font-semibold ${
            score === 3 ? 'text-primary' : score === 2 ? 'text-amber-500' : 'text-destructive'
          }`}
        >
          {labels[score]}
        </span>
      </div>
    </div>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const passwordValue = watch('password')

  // Cek apakah session recovery valid
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { createClient } = await import('@/services/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        setIsValidSession(!!session)
      } catch {
        setIsValidSession(false)
      }
    }
    checkSession()
  }, [])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    try {
      const { createClient } = await import('@/services/supabase/client')
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        toast(error.message || 'Gagal memperbarui password', 'error')
        setIsLoading(false)
        return
      }

      setIsDone(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 3000)
    } catch (err: any) {
      toast(err?.message || 'Terjadi kesalahan sistem', 'error')
      setIsLoading(false)
    }
  }

  // Loading check session
  if (isValidSession === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Memverifikasi link reset...</p>
        </div>
      </div>
    )
  }

  // Session tidak valid
  if (!isValidSession) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-3xl">
            ⚠️
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground">Link Tidak Valid</h2>
          <p className="text-sm text-muted-foreground">
            Link reset password sudah kadaluarsa atau tidak valid. Silakan minta link baru.
          </p>
        </div>
        <Button
          variant="primary"
          className="w-full h-11"
          onClick={() => router.push('/forgot-password')}
        >
          Minta Link Baru
        </Button>
      </div>
    )
  }

  // Sukses
  if (isDone) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground">
            Password Berhasil Diubah! 🎉
          </h2>
          <p className="text-sm text-muted-foreground">
            Password kamu sudah diperbarui. Mengalihkan ke dashboard...
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">
            Jika tidak otomatis teralihkan,{' '}
            <button
              onClick={() => router.push('/dashboard')}
              className="text-primary font-semibold hover:underline"
            >
              klik di sini
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Form Reset Password
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Buat Password Baru
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Masukkan password baru yang kuat untuk akun trading kamu.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Password Baru */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground/80 uppercase tracking-wider">
            Password Baru
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 karakter, huruf besar & angka"
              className="flex h-11 w-full rounded-lg border border-border bg-card px-3.5 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive font-medium mt-1">{errors.password.message}</p>
          )}
          <PasswordStrengthBar password={passwordValue} />
        </div>

        {/* Konfirmasi Password */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground/80 uppercase tracking-wider">
            Konfirmasi Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Ulangi password baru"
              className="flex h-11 w-full rounded-lg border border-border bg-card px-3.5 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
          className="w-full h-11 font-bold text-sm mt-2"
          isLoading={isLoading}
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          Simpan Password Baru
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
