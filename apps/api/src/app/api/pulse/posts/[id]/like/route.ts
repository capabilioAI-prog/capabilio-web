export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, serverError } from '@/lib/auth';
import { db, pulsePosts, pulseLikes } from '@capabilio/db';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const post = await db.query.pulsePosts.findFirst({
      where: eq(pulsePosts.id, params.id),
    });
    if (!post) return notFound('Post');

    // Check existing like
    const existing = await db.query.pulseLikes.findFirst({
      where: and(eq(pulseLikes.userId, user.id as any), eq(pulseLikes.postId, params.id)),
    });

    let liked = false;
    if (existing) {
      await db.delete(pulseLikes).where(eq(pulseLikes.id, existing.id));
      await db.update(pulsePosts)
        .set({ likesCount: sql`GREATEST(0, ${pulsePosts.likesCount} - 1)` })
        .where(eq(pulsePosts.id, params.id));
      liked = false;
    } else {
      await db.insert(pulseLikes).values({
        userId: user.id as any,
        postId: params.id,
      });
      await db.update(pulsePosts)
        .set({ likesCount: sql`${pulsePosts.likesCount} + 1` })
        .where(eq(pulsePosts.id, params.id));
      liked = true;
    }

    const updatedPost = await db.query.pulsePosts.findFirst({
      where: eq(pulsePosts.id, params.id),
    });

    return ok({
      postId: params.id,
      liked,
      likesCount: updatedPost?.likesCount ?? 0,
    });
  } catch (error: any) {
    console.error('Like post error:', error);
    return serverError(error.message);
  }
}
