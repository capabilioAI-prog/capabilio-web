export const dynamic = 'force-dynamic';

import { getAuthenticatedUser, ok, unauthorized, notFound, serverError } from '@/lib/auth';
import { db } from '@capabilio/db';
import { submissions } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const submission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.id, params.id),
        eq(submissions.userId, user.id)
      ),
      with: {
        mission: { with: { role: true } },
        evaluation: true,
      },
    });

    if (!submission) return notFound('Submission');
    return ok({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    return serverError();
  }
}
