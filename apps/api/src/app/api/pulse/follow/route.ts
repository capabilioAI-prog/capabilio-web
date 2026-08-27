export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, pulseFollows } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const FollowSchema = z.object({
  targetType: z.enum(['user', 'company', 'topic']),
  targetId: z.string(),
  targetName: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = FollowSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid follow data', parsed.error.flatten());

    const { targetType, targetId, targetName } = parsed.data;

    const existing = await db.query.pulseFollows.findFirst({
      where: and(
        eq(pulseFollows.userId, user.id as any),
        eq(pulseFollows.targetType, targetType),
        eq(pulseFollows.targetId, targetId)
      ),
    });

    let isFollowing = false;
    if (existing) {
      await db.delete(pulseFollows).where(eq(pulseFollows.id, existing.id));
      isFollowing = false;
    } else {
      await db.insert(pulseFollows).values({
        userId: user.id as any,
        targetType: targetType as any,
        targetId,
        targetName,
      });
      isFollowing = true;
    }

    return ok({ targetType, targetId, isFollowing });
  } catch (error: any) {
    console.error('Follow error:', error);
    return serverError(error.message);
  }
}
