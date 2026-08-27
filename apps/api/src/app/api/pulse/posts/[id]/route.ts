export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, serverError, forbidden } from '@/lib/auth';
import { db, pulsePosts } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const post = await db.query.pulsePosts.findFirst({
      where: eq(pulsePosts.id, params.id),
    });
    if (!post) return notFound('Post');

    if (post.userId !== user.id) {
      return forbidden();
    }

    await db.delete(pulsePosts).where(eq(pulsePosts.id, params.id));
    return ok({ deleted: true, id: params.id });
  } catch (error: any) {
    console.error('Delete post error:', error);
    return serverError(error.message);
  }
}
