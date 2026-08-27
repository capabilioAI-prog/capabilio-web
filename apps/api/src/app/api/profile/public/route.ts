export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { ok, notFound, forbidden, badRequest, serverError } from '@/lib/auth';
import { assembleCareerProfileData } from '@/lib/profile/profile-engine';
import { db, profiles } from '@capabilio/db';
import { eq, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase();

    if (!username) return badRequest('Username is required');

    // Find profile by username
    const profile = await db.query.profiles.findFirst({
      where: ilike(profiles.username, username),
    });

    if (!profile) return notFound('Profile not found');

    if (profile.profileVisibility === 'private') {
      return forbidden('This career profile is private');
    }

    // Assemble server-authoritative public profile with privacy filtering
    const data = await assembleCareerProfileData(profile.userId, true);
    return ok(data);
  } catch (error: any) {
    console.error('Public profile error:', error);
    return serverError(error.message);
  }
}
