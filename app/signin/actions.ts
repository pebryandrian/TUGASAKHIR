'use server'

import { createClient } from '@/lib/supabase/server'

// Sesuai Gambar 4.13 (Sequence Diagram UC-01): data login dikirim ke server
// action Next.js, divalidasi, lalu diverifikasi oleh Supabase Auth.
export interface SignInResult {
  ok: boolean
  error?: string
}

export async function signInAction(input: {
  email: string
  password: string
  remember?: boolean
}): Promise<SignInResult> {
  const email = input.email.trim().toLowerCase()
  const password = input.password

  // Validasi di sisi server sebelum menyentuh layanan autentikasi.
  if (!email) return { ok: false, error: 'Email wajib diisi.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Format email tidak valid.' }
  }
  if (!password) return { ok: false, error: 'Kata sandi wajib diisi.' }
  if (password.length < 6) {
    return { ok: false, error: 'Kata sandi minimal 6 karakter.' }
  }

  const supabase = await createClient({ remember: input.remember !== false })
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Pesan Supabase diteruskan apa adanya agar pengguna tahu penyebabnya
    // (mis. "Invalid login credentials").
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
