export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError, badRequest, notFound } from '@/lib/auth';
import { db } from '@capabilio/db';
import { submissions } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const SaveProgressSchema = z.object({
  submissionId: z.string().uuid(),
  files: z.record(z.string(), z.string()),
  workspaceSnapshot: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const userSubmissions = await db.query.submissions.findMany({
      where: eq(submissions.userId, user.id),
      with: { mission: { with: { role: true } }, evaluation: true },
      orderBy: (s, { desc }) => [desc(s.createdAt)],
      limit: 20,
    });

    return ok({ submissions: userSubmissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = SaveProgressSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid data');

    const submission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.id, parsed.data.submissionId),
        eq(submissions.userId, user.id)
      ),
    });
    if (!submission) return notFound('Submission');

    await db.update(submissions).set({
      files: parsed.data.files,
      workspaceSnapshot: parsed.data.workspaceSnapshot ?? {},
      updatedAt: new Date(),
    }).where(eq(submissions.id, parsed.data.submissionId));

    return ok({ saved: true });
  } catch (error) {
    console.error('Save progress error:', error);
    return serverError();
  }
}
