export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, pulseSaved, pulsePosts } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const SaveSchema = z.object({
  postId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid postId');

    const postId = parsed.data.postId;

    const existing = await db.query.pulseSaved.findFirst({
      where: and(eq(pulseSaved.userId, user.id as any), eq(pulseSaved.postId, postId)),
    });

    let saved = false;
    if (existing) {
      await db.delete(pulseSaved).where(eq(pulseSaved.id, existing.id));
      saved = false;
    } else {
      await db.insert(pulseSaved).values({
        userId: user.id as any,
        postId,
      });
      saved = true;
    }

    return ok({ postId, saved });
  } catch (error: any) {
    console.error('Save post error:', error);
    return serverError(error.message);
  }
}
