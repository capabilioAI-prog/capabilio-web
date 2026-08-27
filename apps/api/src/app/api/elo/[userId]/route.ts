export const dynamic = 'force-dynamic';

import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db } from '@capabilio/db';
import { eloRecords, eloChanges } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();
    // Users can only see their own ELO (or admin can see all)
    if (user.id !== params.userId) return unauthorized();

    const records = await db.query.eloRecords.findMany({
      where: eq(eloRecords.userId, params.userId),
      with: { role: true },
      orderBy: (r, { desc }) => [desc(r.eloScore)],
    });

    const history = await db.query.eloChanges.findMany({
      where: eq(eloChanges.userId, params.userId),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      limit: 20,
    });

    return ok({ records, history });
  } catch (error) {
    console.error('ELO error:', error);
    return serverError();
  }
}
