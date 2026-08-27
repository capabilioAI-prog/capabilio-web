import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register', '/'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Immediately skip middleware for static assets, Next internals, and files with extensions
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  let user = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch {
      // Supabase auth fallback
    }
  }

  // Dev-only route-guard bypass, mirrors apps/api/src/lib/auth.ts's fallback.
  // Never honored in production — a cookie is not proof of identity.
  const devUserId = process.env.NODE_ENV === 'development'
    ? request.cookies.get('capabilio-user-id')?.value
    : undefined;
  const hasExplicitAuth = !!user || (devUserId && devUserId !== 'unauthenticated');
  const isAuthenticated = hasExplicitAuth;

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (hasExplicitAuth && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff|woff2|ttf|eot|ico)$).*)',
  ],
};
