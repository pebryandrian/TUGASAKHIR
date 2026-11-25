import { createBrowserClient } from '@supabase/ssr'

// Opsi `remember` menentukan masa berlaku cookie sesi:
// - true  → cookie disimpan 30 hari (pengguna tetap masuk walau browser ditutup)
// - false → cookie sesi (hilang saat browser ditutup)
// Ini yang membuat checkbox "Remember me" pada halaman Sign In benar-benar berfungsi.
export function createClient(options: { remember?: boolean } = {}) {
  const remember = options.remember

  if (remember === undefined) {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Jangan memakai instance global: opsi cookie harus mengikuti pilihan pengguna.
      isSingleton: false,
      cookieOptions: remember ? { maxAge: 60 * 60 * 24 * 30 } : { maxAge: undefined },
    },
  )
}
