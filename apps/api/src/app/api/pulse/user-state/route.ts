export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, serverError } from '@/lib/auth';
import { db, pulseFollows, pulseLikes, pulseSaved } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      return ok({ followedTargetIds: [], savedPostIds: [], likedPostIds: [] });
    }

    const follows = await db.query.pulseFollows.findMany({
      where: eq(pulseFollows.userId, user.id as any),
    });
    const likes = await db.query.pulseLikes.findMany({
      where: eq(pulseLikes.userId, user.id as any),
    });
    const saved = await db.query.pulseSaved.findMany({
      where: eq(pulseSaved.userId, user.id as any),
    });

    return ok({
      followedTargetIds: follows.map(f => f.targetId),
      likedPostIds: likes.map(l => l.postId),
      savedPostIds: saved.map(s => s.postId),
    });
  } catch (error: any) {
    console.error('User state error:', error);
    return serverError(error.message);
  }
}
