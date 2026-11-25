import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Opsi `remember` mengatur masa berlaku cookie sesi:
// - true  → 30 hari (pengguna tetap masuk setelah browser ditutup)
// - false → cookie sesi
// Dipakai oleh server action login agar pilihan "Remember me" berlaku.
export async function createClient(options: { remember?: boolean } = {}) {
  const cookieStore = await cookies()
  const remember = options.remember

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions:
        remember === undefined ? undefined : remember ? { maxAge: 60 * 60 * 24 * 30 } : { maxAge: undefined },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component: safe to ignore, the proxy refreshes the session.
          }
        },
      },
    },
  )
}
