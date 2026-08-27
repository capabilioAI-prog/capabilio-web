export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, notFound, serverError } from '@/lib/auth';
import { db, auraInterviews } from '@capabilio/db';
import { finalizeInterviewEvaluation, InterviewMode } from '@/lib/interview/interview-engine';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const CompleteSchema = z.object({
  taskData: z.record(z.any()).optional(),
  durationMinutes: z.number().default(15),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const interviewId = params.id;
    const session = await db.query.auraInterviews.findFirst({
      where: and(eq(auraInterviews.id, interviewId as any), eq(auraInterviews.userId, user.id as any)),
    });

    if (!session) return notFound('Interview session not found');
    if (session.status === 'completed') {
      return ok({
        evaluation: {
          score: session.score,
          readinessScore: session.readinessScore || 72,
          strengths: session.strengths,
          weaknesses: session.weaknesses,
          feedback: session.feedback,
          verificationHash: session.verificationHash,
          alreadyCompleted: true,
        }
      });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = CompleteSchema.safeParse(body);
    const taskData = parsed.success ? parsed.data.taskData : undefined;
    const durationMinutes = parsed.success ? parsed.data.durationMinutes : 15;

    const transcript = Array.isArray(session.transcript) ? session.transcript : [];
    const evaluation = await finalizeInterviewEvaluation({
      interviewId,
      userId: user.id,
      roleSlug: session.interviewType === 'technical' ? 'data-analyst' : 'data-analyst',
      mode: (session.interviewMode || 'technical') as InterviewMode,
      transcript: transcript as any,
      taskData,
      durationMinutes,
    });

    return ok({
      evaluation,
    }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Complete interview error:', error);
    return serverError(error.message);
  }
}
