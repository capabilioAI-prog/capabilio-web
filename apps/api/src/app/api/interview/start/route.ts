export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, auraInterviews, roles } from '@capabilio/db';
import { loadCandidateInterviewContext, generateOpeningQuestion, InterviewMode } from '@/lib/interview/interview-engine';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const StartInterviewSchema = z.object({
  mode: z.enum(['technical', 'scenario', 'behavioral', 'mixed']).default('technical'),
  roleSlug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const parsed = StartInterviewSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid interview configuration');

    const mode = parsed.data.mode as InterviewMode;

    // Load authentic context (Role, ELO, Arena History, Weaknesses)
    const context = await loadCandidateInterviewContext(user.id);
    if (parsed.data.roleSlug) {
      context.roleSlug = parsed.data.roleSlug;
      context.roleTitle = parsed.data.roleSlug.includes('dba') ? 'Database Administrator' : 'Data Analyst';
    }

    const opener = generateOpeningQuestion(context, mode);

    // Find role in DB
    const searchSlug = context.roleSlug.includes('dba') ? 'database-administrator' : 'data-analyst';
    let targetRole = await db.query.roles.findFirst({ where: eq(roles.slug, searchSlug) });
    if (!targetRole) targetRole = await db.query.roles.findFirst();
    const roleId = targetRole?.id || 'role_default';

    const initialTranscript = [
      {
        sender: 'ai' as const,
        message: opener.message,
        timestamp: new Date().toISOString(),
        stage: opener.stage,
      },
    ];

    // Create session in DB
    const session = await db.insert(auraInterviews).values({
      userId: user.id as any,
      roleId: roleId as any,
      interviewType: mode === 'behavioral' ? 'behavioral' : 'technical',
      difficulty: 'junior',
      durationMinutes: 15,
      status: 'in_progress',
      score: 0,
      communicationScore: 0,
      technicalDepthScore: 0,
      problemSolvingScore: 0,
      strengths: [],
      weaknesses: [],
      recommendedSkills: [],
      transcript: initialTranscript as any,
      summary: 'Interview session active',
      interviewMode: mode,
    }).returning();

    return ok({
      interviewId: session[0]?.id,
      mode,
      roleSlug: context.roleSlug,
      roleTitle: context.roleTitle,
      careerElo: context.careerElo,
      openingQuestion: opener.message,
      transcript: initialTranscript,
      diagnosedWeakness: context.diagnosedWeakness,
      recentArenaMissions: context.arenaHistory.slice(0, 2),
    }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Start interview error:', error);
    return serverError(error.message);
  }
}
