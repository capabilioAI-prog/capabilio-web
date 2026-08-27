export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { assembleCareerProfileData } from '@/lib/profile/profile-engine';
import { db, profiles } from '@capabilio/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const data = await assembleCareerProfileData(user.id, false);
    return ok(data);
  } catch (error: any) {
    console.error('Profile GET error:', error);
    return serverError(error.message);
  }
}

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).optional(),
  headline: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  collegeName: z.string().optional(),
  stream: z.string().optional(),
  department: z.string().optional(),
  universityName: z.string().optional(),
  username: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid profile payload');

    const updateFields: any = { ...parsed.data, updatedAt: new Date() };

    const updated = await db.update(profiles)
      .set(updateFields)
      .where(eq(profiles.userId, user.id as any))
      .returning();

    return ok({ profile: updated[0] });
  } catch (error: any) {
    console.error('Profile PUT error:', error);
    return serverError(error.message);
  }
}
