export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, notFound, serverError } from '@/lib/auth';
import { db, auraInterviews } from '@capabilio/db';
import { loadCandidateInterviewContext, processInterviewResponse } from '@/lib/interview/interview-engine';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const MessageSchema = z.object({
  message: z.string(),
  currentStage: z.string().default('opener'),
  questionIndex: z.number().default(1),
  liveTaskSql: z.string().optional(),
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
    if (session.status === 'completed') return badRequest('Interview already finalized and locked');

    const body = await request.json().catch(() => ({}));
    const parsed = MessageSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid message payload');

    const context = await loadCandidateInterviewContext(user.id);
    const result = processInterviewResponse({
      candidateAnswer: parsed.data.message,
      currentStage: parsed.data.currentStage,
      questionIndex: parsed.data.questionIndex,
      context,
      liveTaskState: { sql: parsed.data.liveTaskSql },
    });

    // Update transcript in DB
    const existingTranscript = Array.isArray(session.transcript) ? session.transcript : [];
    const updatedTranscript = [
      ...existingTranscript,
      {
        sender: 'candidate',
        message: parsed.data.message,
        timestamp: new Date().toISOString(),
        stage: parsed.data.currentStage,
      },
      {
        sender: 'ai',
        message: result.aiResponse,
        timestamp: new Date().toISOString(),
        stage: result.nextStage,
        telemetry: result.telemetry,
      },
    ];

    await db.update(auraInterviews).set({
      transcript: updatedTranscript as any,
    }).where(eq(auraInterviews.id, interviewId as any));

    return ok({
      response: result.aiResponse,
      nextStage: result.nextStage,
      isRefusal: result.isRefusal,
      telemetry: result.telemetry,
      liveTask: result.liveTask,
      transcript: updatedTranscript,
    });
  } catch (error: any) {
    console.error('Interview message error:', error);
    return serverError(error.message);
  }
}
