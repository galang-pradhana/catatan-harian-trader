-- Migration: 005_add_phone_to_users.sql
-- Description: Tambahkan kolom phone ke tabel public.users dan perbarui trigger handle_new_user

-- 1. Tambah kolom phone ke tabel public.users jika belum ada
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone VARCHAR;

-- 2. Update fungsi trigger handle_new_user untuk menyimpan phone dari raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, phone, theme)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    'dark'
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
