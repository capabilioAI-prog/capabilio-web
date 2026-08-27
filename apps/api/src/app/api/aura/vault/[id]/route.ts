export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, serverError, forbidden } from '@/lib/auth';
import { db, auraDocuments } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const doc = await db.query.auraDocuments.findFirst({
      where: eq(auraDocuments.id, params.id),
    });
    if (!doc) return notFound('Document');

    if (doc.userId !== user.id) return forbidden();

    await db.delete(auraDocuments).where(eq(auraDocuments.id, params.id));
    return ok({ deleted: true, id: params.id });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return serverError(error.message);
  }
}
