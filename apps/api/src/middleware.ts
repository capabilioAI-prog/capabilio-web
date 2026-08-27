import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// CORS must allow-list known origins, never reflect an arbitrary request
// Origin back verbatim — combined with Allow-Credentials: true, reflecting
// any Origin lets any website make credentialed cross-origin requests and
// read the response (session riding / credential theft from any page a
// signed-in user visits).
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
].filter((value): value is string => Boolean(value));

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // Handle CORS
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set(name: string, value: string, options: any) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({ request: { headers: request.headers } });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      });
      await supabase.auth.getUser();
    } catch {}
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
