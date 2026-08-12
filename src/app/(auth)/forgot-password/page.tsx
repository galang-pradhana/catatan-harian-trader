'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Mail, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'

// ─── Konstanta Rate Limit ─────────────────────────────────────────
const COOLDOWN_SECONDS = 60
const COOLDOWN_KEY = 'forgot_pw_last_sent'

const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid').min(1, 'Email wajib diisi'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

function ForgotPasswordContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')
  const [countdown, setCountdown] = useState(0)

  // ─── Hitung sisa cooldown dari localStorage saat halaman dimuat ──
  useEffect(() => {
    const lastSent = localStorage.getItem(COOLDOWN_KEY)
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000)
      const remaining = COOLDOWN_SECONDS - elapsed
      if (remaining > 0) {
        setCountdown(remaining)
        setEmailSent(true) // tampilkan state "sudah terkirim" jika masih dalam cooldown
      } else {
        localStorage.removeItem(COOLDOWN_KEY)
      }
    }
  }, [])

  // ─── Countdown ticker ────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          localStorage.removeItem(COOLDOWN_KEY)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // ─── Mulai cooldown setelah kirim email ──────────────────────────
  const startCooldown = useCallback(() => {
    localStorage.setItem(COOLDOWN_KEY, Date.now().toString())
    setCountdown(COOLDOWN_SECONDS)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    if (countdown > 0) return // guard tambahan
    setIsLoading(true)
    try {
      const { createClient } = await import('@/services/supabase/client')
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (error) {
        toast(error.message || 'Gagal mengirim email reset password', 'error')
        setIsLoading(false)
        return
      }

      setSentToEmail(data.email)
      setEmailSent(true)
      startCooldown()
    } catch (err: any) {
      toast(err?.message || 'Terjadi kesalahan sistem', 'error')
      setIsLoading(false)
    }
  }

  // ─── State: Email Sudah Terkirim ─────────────────────────────────
  if (emailSent) {
    return (
      <div className="space-y-6 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Email Terkirim!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Link reset password telah dikirim ke:
          </p>
          <p className="text-sm font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg px-4 py-2 inline-block">
            {sentToEmail || '—'}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Langkah selanjutnya:
          </p>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Buka inbox email kamu (termasuk folder Spam)</li>
            <li>Klik tombol <strong className="text-foreground">"Buat Password Baru"</strong> di email</li>
            <li>Buat password baru yang kuat</li>
            <li>Masuk ke dashboard trading kamu</li>
          </ol>
        </div>

        {/* Tombol Kirim Ulang dengan Countdown */}
        <div className="space-y-2">
          {countdown > 0 ? (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2.5">
              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>
                Kirim ulang tersedia dalam{' '}
                <span className="font-bold tabular-nums text-amber-500">{countdown}s</span>
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                setEmailSent(false)
                setSentToEmail('')
              }}
              className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Email tidak masuk? Kirim ulang
            </button>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full text-sm"
          onClick={() => router.push('/login')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Login
        </Button>
      </div>
    )
  }

  // ─── State: Form Input Email ──────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Login
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Lupa Password?
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Masukkan email yang terdaftar. Kami akan kirimkan link untuk membuat password baru.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email Terdaftar"
          type="email"
          placeholder="Masukkan email kamu"
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full h-11 font-bold text-sm"
          isLoading={isLoading}
        >
          <Mail className="w-4 h-4 mr-2" />
          Kirim Link Reset Password
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Ingat password?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Masuk sekarang
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
