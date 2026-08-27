export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, serverError } from '@/lib/auth';
import { db, auraInterviews, roles } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const interviewId = params.id;
    const session = await db.query.auraInterviews.findFirst({
      where: and(eq(auraInterviews.id, interviewId as any), eq(auraInterviews.userId, user.id as any)),
    });

    if (!session) return notFound('Interview not found');

    const role = await db.query.roles.findFirst({ where: eq(roles.id, session.roleId) });

    return ok({
      interview: {
        id: session.id,
        roleTitle: role?.name || 'Data Analyst',
        roleSlug: role?.slug || 'data-analyst',
        interviewType: session.interviewType,
        interviewMode: session.interviewMode,
        status: session.status,
        score: session.score,
        readinessScore: session.readinessScore || 72,
        subscores: {
          technicalKnowledge: session.technicalDepthScore,
          problemSolving: session.problemSolvingScore,
          communication: session.communicationScore,
          businessUnderstanding: session.businessReasoningScore,
          roleRelevance: session.roleRelevanceScore,
        },
        strengths: session.strengths,
        weaknesses: session.weaknesses,
        recommendedSkills: session.recommendedSkills,
        feedback: session.feedback || session.summary,
        nextBestAction: session.nextBestAction,
        verificationHash: session.verificationHash,
        transcript: session.transcript,
        taskData: session.taskData,
        durationMinutes: session.durationMinutes,
        createdAt: session.createdAt,
      }
    });
  } catch (error: any) {
    console.error('Get interview error:', error);
    return serverError(error.message);
  }
}
