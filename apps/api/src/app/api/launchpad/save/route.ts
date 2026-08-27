export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, savedJobs } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const SaveJobSchema = z.object({
  jobId: z.string().min(1),
  isSaved: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = SaveJobSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid save payload', parsed.error.flatten());

    const { jobId, isSaved } = parsed.data;

    if (isSaved) {
      await db.insert(savedJobs).values({
        userId: user.id as any,
        jobId,
      }).onConflictDoNothing();
    } else {
      await db.delete(savedJobs).where(
        and(eq(savedJobs.userId, user.id as any), eq(savedJobs.jobId, jobId))
      );
    }

    const saved = await db.query.savedJobs.findMany({
      where: eq(savedJobs.userId, user.id as any),
    });

    return ok({ jobId, isSaved, totalSaved: saved.length });
  } catch (error: any) {
    console.error('Save job error:', error);
    return serverError(error.message);
  }
}
