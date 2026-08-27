export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ok, badRequest, serverError } from '@/lib/auth';
import { db, users, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid credentials format');

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    // 1. Try Supabase Auth if configured and not placeholder
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        return ok({
          user: {
            id: data.user.id,
            email: data.user.email,
          }
        });
      }
    } catch {
      // Database fallback
    }

    // 2. Database User Lookup
    const dbUser = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: { profile: true },
    });

    if (dbUser) {
      return ok({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          displayName: dbUser.profile?.displayName || 'Capabilio User',
          collegeName: dbUser.profile?.collegeName,
          stream: dbUser.profile?.stream,
          hasCompletedCareerOnboarding: dbUser.profile?.hasCompletedCareerOnboarding || false,
        }
      });
    }

    // If demo default email is used (e.g. alex.dev@capabilio.ai)
    if (email === 'alex.dev@capabilio.ai' || email === 'alex@example.com') {
      const defaultUser = await db.query.users.findFirst();
      if (defaultUser) {
        return ok({
          user: {
            id: defaultUser.id,
            email: defaultUser.email,
          }
        });
      }
    }

    return badRequest('Invalid email or password. If you are new, please register.');
  } catch (error) {
    console.error('Login error:', error);
    return serverError();
  }
}
