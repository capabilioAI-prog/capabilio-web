export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });

    response.cookies.set('capabilio-user-id', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    response.cookies.set('sb-access-token', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    response.cookies.set('sb-refresh-token', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'LOGOUT_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
