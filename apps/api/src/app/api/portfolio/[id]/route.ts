export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, forbidden, serverError } from '@/lib/auth';
import { db, portfolioItems } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const items = await db.query.portfolioItems.findMany({
      where: eq(portfolioItems.userId, params.id as any),
      with: { role: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    return ok({ items });
  } catch (error: any) {
    console.error('Portfolio error:', error);
    return serverError(error.message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const item = await db.query.portfolioItems.findFirst({
      where: eq(portfolioItems.id, params.id),
    });
    if (!item) return notFound('Portfolio Item');
    if (item.userId !== user.id) return forbidden();

    await db.delete(portfolioItems).where(eq(portfolioItems.id, params.id));
    return ok({ deleted: true, id: params.id });
  } catch (error: any) {
    console.error('Delete portfolio item error:', error);
    return serverError(error.message);
  }
}
