export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db, auraInterviews } from '@capabilio/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const interviews = await db.query.auraInterviews.findMany({
      where: eq(auraInterviews.userId, user.id as any),
      orderBy: [desc(auraInterviews.createdAt)],
    });

    return ok({ interviews });
  } catch (error: any) {
    console.error('Get interviews error:', error);
    return serverError(error.message);
  }
}
