import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const role = user?.app_metadata?.role as string | undefined

  // Não autenticado tentando acessar área protegida
  if (!user && (path.startsWith('/admin') || path.startsWith('/cliente'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticado tentando acessar /login → redireciona para o dashboard correto
  if (user && path === '/login') {
    const dest = role === 'admin' ? '/admin/dashboard' : '/cliente/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Admin tentando acessar área de cliente
  if (user && role === 'admin' && path.startsWith('/cliente')) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Cliente tentando acessar área de admin
  if (user && role !== 'admin' && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/cliente/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/login', '/admin/:path*', '/cliente/:path*'],
}
