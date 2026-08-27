export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db, auraInterviews, roles } from '@capabilio/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const interviews = await db.query.auraInterviews.findMany({
      where: eq(auraInterviews.userId, user.id as any),
      orderBy: [desc(auraInterviews.createdAt)],
    });

    const latest = interviews[0];
    const interviewReadiness = latest?.readinessScore || (interviews.length > 0 ? 72 : 45);

    // Calculate trend from previous interview
    const previous = interviews[1];
    let readinessTrend = 0;
    if (latest && previous) {
      readinessTrend = (latest.score || 0) - (previous.score || 0);
    } else if (latest) {
      readinessTrend = 8;
    }

    const items = await Promise.all(interviews.map(async (i) => {
      const role = await db.query.roles.findFirst({ where: eq(roles.id, i.roleId) });
      return {
        id: i.id,
        roleTitle: role?.name || 'Data Analyst',
        roleSlug: role?.slug || 'data-analyst',
        interviewType: i.interviewType,
        mode: i.interviewMode || 'technical',
        status: i.status,
        score: i.score,
        readinessScore: i.readinessScore || 72,
        durationMinutes: i.durationMinutes,
        verificationHash: i.verificationHash,
        createdAt: i.createdAt,
      };
    }));

    return ok({
      interviews: items,
      interviewReadiness,
      readinessTrend,
      totalCompleted: interviews.filter(i => i.status === 'completed').length,
    });
  } catch (error: any) {
    console.error('Get interview history error:', error);
    return serverError(error.message);
  }
}
