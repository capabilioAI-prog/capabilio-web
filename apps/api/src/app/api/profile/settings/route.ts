export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const SettingsSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/, 'Username must be lowercase alphanumeric with hyphens').optional(),
  profileVisibility: z.enum(['public', 'recruiter_only', 'private']).optional(),
  evidenceVisibility: z.record(z.enum(['public', 'recruiter_only', 'private'])).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    return ok({
      username: profile?.username,
      profileVisibility: profile?.profileVisibility || 'public',
      evidenceVisibility: profile?.evidenceVisibility || {},
      publicUrl: `http://localhost:3000/p/${profile?.username || ''}`,
    });
  } catch (error: any) {
    console.error('Profile settings GET error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const parsed = SettingsSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message || 'Invalid settings payload');

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    if (!profile) return unauthorized();

    // Check unique username if changing
    if (parsed.data.username && parsed.data.username !== profile.username) {
      const existing = await db.query.profiles.findFirst({
        where: eq(profiles.username, parsed.data.username),
      });
      if (existing && existing.userId !== user.id) {
        return badRequest('This username is already taken. Please choose another.');
      }
    }

    const updated = await db.update(profiles).set({
      ...(parsed.data.username ? { username: parsed.data.username } : {}),
      ...(parsed.data.profileVisibility ? { profileVisibility: parsed.data.profileVisibility } : {}),
      ...(parsed.data.evidenceVisibility ? { evidenceVisibility: parsed.data.evidenceVisibility as any } : {}),
      updatedAt: new Date(),
    }).where(eq(profiles.id, profile.id)).returning();

    return ok({
      settings: {
        username: updated[0]?.username,
        profileVisibility: updated[0]?.profileVisibility,
        evidenceVisibility: updated[0]?.evidenceVisibility,
      }
    });
  } catch (error: any) {
    console.error('Profile settings POST error:', error);
    return serverError(error.message);
  }
}
