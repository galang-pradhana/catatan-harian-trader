'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingSchema, OnboardingFormData } from '@/utils/validation-schemas'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { createClient } from '@/services/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    // Get current user to ensure they are logged in
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      // If user already has a phone number, send them to dashboard
      const phone = user.user_metadata?.phone || (user as any).phone
      if (phone) {
        router.push('/dashboard')
        return
      }
      
      setUserId(user.id)
    }
    
    fetchUser()
  }, [router, supabase.auth])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      phone: '',
    },
  })

  const onSubmit = async (data: OnboardingFormData) => {
    if (!userId) {
      toast('Sesi tidak valid, silakan login kembali.', 'error')
      router.push('/login')
      return
    }

    setIsLoading(true)
    try {
      // 1. Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { phone: data.phone }
      })

      if (authError) throw authError

      // 2. Update Database public.users
      const { error: dbError } = await supabase
        .from('users')
        .update({ phone: data.phone })
        .eq('id', userId)

      if (dbError) throw dbError

      toast('Nomor HP berhasil disimpan!', 'success')
      
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 800)
    } catch (err: any) {
      toast(err?.message || 'Gagal menyimpan nomor HP', 'error')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          Satu Langkah Lagi!
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Karena Anda login dengan Google, kami memerlukan Nomor HP (WhatsApp Aktif) Anda untuk melengkapi profil dan keamanan akun Anda.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2" noValidate>
        {/* Phone Number */}
        <Input
          label="Nomor HP (WhatsApp Aktif)"
          type="tel"
          placeholder="Contoh: 081234567890"
          error={errors.phone?.message}
          {...register('phone')}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full mt-4 h-11 font-bold text-sm"
          isLoading={isLoading}
        >
          Simpan & Lanjutkan
        </Button>
      </form>
    </div>
  )
}
