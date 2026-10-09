import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/home', '/project', '/profile', '/dashboard']
const AUTH_PAGES = ['/signin', '/signup']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session so Server Components see a valid token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))
  const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/signin?mode=login', request.url))
  }
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|woff2?)$).*)',
  ],
}
