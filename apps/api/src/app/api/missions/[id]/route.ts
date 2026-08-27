export const dynamic = 'force-dynamic';

import { getAuthenticatedUser, ok, unauthorized, notFound, serverError } from '@/lib/auth';
import { db } from '@capabilio/db';
import { missions } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const mission = await db.query.missions.findFirst({
      where: eq(missions.id, params.id),
      with: {
        role: true,
        company: true,
        missionSkills: { with: { skill: true } },
      },
    });

    if (!mission) return notFound('Mission');
    if (mission.status !== 'published') return notFound('Mission');

    // Strip hidden test cases from response
    const sanitizedMission = {
      ...mission,
      testCases: mission.testCases.filter(tc => !tc.isHidden).map(tc => ({
        id: tc.id,
        name: tc.name,
        input: tc.input,
        // Don't expose expectedOutput for non-hidden cases either — evaluation is server-side
      })),
    };

    return ok({ mission: sanitizedMission });
  } catch (error) {
    console.error('Get mission error:', error);
    return serverError();
  }
}
