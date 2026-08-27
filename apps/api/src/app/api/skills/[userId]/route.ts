export const dynamic = 'force-dynamic';

import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { db } from '@capabilio/db';
import { userSkills, skills } from '@capabilio/db';
import { eq } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { userId: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();
    if (user.id !== params.userId) return unauthorized();

    const userSkillData = await db.query.userSkills.findMany({
      where: eq(userSkills.userId, params.userId),
      with: { skill: true, evidence: { limit: 5, orderBy: (e, { desc }) => [desc(e.createdAt)] } },
      orderBy: (us, { desc }) => [desc(us.eloScore)],
    });

    return ok({ skills: userSkillData });
  } catch (error) {
    console.error('Skills error:', error);
    return serverError();
  }
}
