import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env'

const LOGIN_PATH = '/admin/login'

/**
 * Keeps the Supabase auth cookie fresh on every request and turns unauthenticated
 * visitors away from /admin.
 *
 * This is the outermost of three layers, not the only one:
 *   proxy       -> is there a valid session at all?
 *   admin layout-> is this user an *active admin*, and what may they do?
 *   RLS         -> the database has the final say on every row.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginRoute = pathname === LOGIN_PATH

  if (!isSupabaseConfigured) {
    // Without a backend there is nothing to protect and no session to refresh;
    // the admin pages render their own "setup required" state.
    return response
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() revalidates the JWT with Supabase; getSession() would trust the
  // cookie as-is, which is not good enough for an authorization decision.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isAdminRoute && !isLoginRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = LOGIN_PATH
    redirectUrl.search = ''
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isLoginRoute && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/admin'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static assets - the session
     * cookie has to be refreshed on public pages too, or it silently expires
     * while an admin is browsing the storefront.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)',
  ],
}
