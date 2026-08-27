import { createClient } from './supabase';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { db, users, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function getAuthenticatedUser() {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) return user;
  } catch {
    // Supabase auth fallback
  }

  // Dev-only fallback: lets local development work without a fully wired
  // Supabase Auth session, by trusting a cookie/header as the user id.
  // A client-supplied id must NEVER be accepted as proof of identity in
  // production — this path is hard-disabled outside development regardless
  // of what a request sends, so it cannot be reached by setting a header.
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const cookieStore = cookies();
  const userIdCookie = cookieStore.get('capabilio-user-id')?.value;
  const headerUserId = headers().get('x-user-id');
  const effectiveUserId = userIdCookie || headerUserId;

  if (!effectiveUserId) {
    return null;
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, effectiveUserId),
  });

  if (!dbUser) {
    return null;
  }

  return { id: dbUser.id, email: dbUser.email };
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, { status: 200, ...init });
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' } },
    { status: 401 }
  );
}

export function forbidden(message = 'Insufficient permissions') {
  return NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  );
}

export function notFound(resource = 'Resource') {
  return NextResponse.json(
    { success: false, error: { code: 'NOT_FOUND', message: `${resource} not found` } },
    { status: 404 }
  );
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    { success: false, error: { code: 'BAD_REQUEST', message, details } },
    { status: 400 }
  );
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message } },
    { status: 500 }
  );
}
