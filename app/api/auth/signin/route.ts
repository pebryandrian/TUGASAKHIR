import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Login di sisi server (sesuai Gambar 4.13: kredensial dikirim ke server,
// divalidasi, lalu diverifikasi Supabase Auth).
//
// Cookie sesi ditulis EKSPLISIT ke NextResponse — bukan hanya lewat
// cookies().set() — karena cookie auth Supabase berukuran besar dan pada
// sebagian konfigurasi tidak ikut terkirim bila hanya disimpan di cookie store.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const remember = body.remember !== false

  // Validasi di server sebelum menyentuh layanan autentikasi.
  if (!email) return NextResponse.json({ ok: false, error: 'Email wajib diisi.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Format email tidak valid.' })
  }
  if (!password) return NextResponse.json({ ok: false, error: 'Kata sandi wajib diisi.' })
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'Kata sandi minimal 6 karakter.' })
  }

  const cookieStore = await cookies()
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const cookie of cookiesToSet) pending.push(cookie as never)
        },
      },
    },
  )

  // Coba ulang sekali bila gagal karena jaringan (koneksi ke Supabase bisa
  // terputus sesaat).
  let lastError: string | null = null
  let userId: string | null = null

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (!error) {
      userId = data.user?.id ?? null
      lastError = null
      break
    }

    lastError = error.message
    const isNetwork = /fetch failed|network|timeout|ECONN|ENOTFOUND/i.test(error.message)
    if (!isNetwork) break
    await new Promise((r) => setTimeout(r, 800 * attempt))
  }

  if (!userId) {
    const isNetwork = lastError ? /fetch failed|network|timeout|ECONN|ENOTFOUND/i.test(lastError) : false
    return NextResponse.json(
      {
        ok: false,
        error: isNetwork
          ? 'Server tidak dapat menghubungi Supabase. Periksa koneksi internet lalu coba lagi.'
          : (lastError ?? 'Gagal masuk.'),
      },
      { status: isNetwork ? 503 : 401 },
    )
  }

  const response = NextResponse.json({ ok: true, userId })

  // Tulis cookie sesi langsung pada response.
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, {
      ...(options as Record<string, unknown>),
      // "Remember me" menentukan masa berlaku cookie.
      ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
      path: '/',
    } as never)
  }

  return response
}
