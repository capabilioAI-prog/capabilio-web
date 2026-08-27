export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, notFound, serverError } from '@/lib/auth';
import { db, pulsePosts, pulseComments, profiles } from '@capabilio/db';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const CommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  parentId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const comments = await db.query.pulseComments.findMany({
      where: eq(pulseComments.postId, params.id),
      orderBy: [desc(pulseComments.createdAt)],
    });
    return ok({ comments });
  } catch (error: any) {
    console.error('Get comments error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const post = await db.query.pulsePosts.findFirst({
      where: eq(pulsePosts.id, params.id),
    });
    if (!post) return notFound('Post');

    const body = await request.json();
    const parsed = CommentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid comment data', parsed.error.flatten());
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    const authorName = profile?.displayName || user.email?.split('@')[0] || 'Professional';
    const authorHeadline = profile?.headline || 'Capabilio Professional';

    const [comment] = await db.insert(pulseComments).values({
      postId: (params.id as any)!,
      userId: (user.id as any)!,
      authorName,
      authorHeadline,
      content: parsed.data.content,
      parentId: parsed.data.parentId ?? null,
    }).returning();

    await db.update(pulsePosts)
      .set({ commentsCount: sql`${pulsePosts.commentsCount} + 1` })
      .where(eq(pulsePosts.id, params.id));

    return ok({ comment }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Post comment error:', error);
    return serverError(error.message);
  }
}
