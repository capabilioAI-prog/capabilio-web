export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ok, badRequest, serverError } from '@/lib/auth';
import { db, users, profiles, careerGoals, roles, eloRecords } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(100),
  collegeName: z.string().min(2).max(150),
  stream: z.string().min(2).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    
    if (!parsed.success) {
      return badRequest('Invalid registration data. Please provide name, email, password, college, and stream/branch.', parsed.error.flatten());
    }

    const { email, password, displayName, collegeName, stream } = parsed.data;

    // Check if email already registered in database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existingUser) {
      return badRequest('Email is already registered. Please sign in.');
    }

    let userId: string = randomUUID();

    // Try Supabase auth if configured
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { display_name: displayName, college: collegeName, stream } },
      });

      if (!authError && authData?.user?.id) {
        userId = authData.user.id;
      }
    } catch {
      // Database fallback
    }

    // 1. Create user record
    await db.insert(users).values({
      id: userId as any,
      email: email.toLowerCase().trim(),
      role: 'student',
      isActive: true,
    }).onConflictDoNothing();

    // 2. Create profile with college and stream
    await db.insert(profiles).values({
      userId: userId as any,
      displayName,
      headline: `${stream} Student @ ${collegeName}`,
      collegeName,
      stream,
      onboardingCompleted: false,
      hasCompletedCareerOnboarding: false,
    }).onConflictDoNothing();

    // 3. Set starting role and initial baseline ELO = 400 for Students
    try {
      const defaultRole = await db.query.roles.findFirst({
        where: eq(roles.slug, 'data-analyst'),
      }) || await db.query.roles.findFirst({
        where: eq(roles.slug, 'software-engineer'),
      });

      if (defaultRole) {
        await db.insert(careerGoals).values({
          userId: userId as any,
          targetRoleId: defaultRole.id,
          timeline: 'immediate',
          currentLevel: 'student',
          isActive: true,
        }).onConflictDoNothing();

        // Initial student baseline ELO is 400
        await db.insert(eloRecords).values({
          userId: userId as any,
          roleId: defaultRole.id,
          eloScore: 400,
          totalMissions: 0,
          passedMissions: 0,
        }).onConflictDoNothing();
      }
    } catch (e) {
      console.warn('Initial goal note:', e);
    }

    return ok({
      userId,
      email: email.toLowerCase().trim(),
      displayName,
      collegeName,
      stream,
      startingElo: 400,
      hasCompletedCareerOnboarding: false,
      requiresVerification: false,
    }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Register error:', error);
    return serverError(error.message || 'Registration failed');
  }
}
