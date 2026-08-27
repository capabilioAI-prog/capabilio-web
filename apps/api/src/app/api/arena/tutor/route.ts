export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, badRequest } from '@/lib/auth';
import { z } from 'zod';
import { processTutorRequest } from '@/lib/arena/tutor-engine';

const TutorRequestSchema = z.object({
  missionId: z.string(),
  roleSlug: z.string().default('data-analyst'),
  requestedLevel: z.number().min(1).max(5).optional(),
  userMessage: z.string().optional(),
  currentCode: z.string().optional(),
  executionResults: z.any().optional(),
  executionError: z.string().nullable().optional(),
  executiveSummary: z.string().optional(),
  hintsUsedCount: z.number().default(0),
  timeRemainingSeconds: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return badRequest('Authentication required');

  const body = await request.json();
  const parsed = TutorRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest('Invalid tutor request');

  const tutorResult = processTutorRequest({
    missionId: parsed.data.missionId,
    roleSlug: parsed.data.roleSlug,
    userMessage: parsed.data.userMessage,
    requestedLevel: parsed.data.requestedLevel,
    currentCode: parsed.data.currentCode,
    executionResults: parsed.data.executionResults,
    executionError: parsed.data.executionError,
    executiveSummary: parsed.data.executiveSummary,
    hintsUsedCount: parsed.data.hintsUsedCount,
  });

  return ok(tutorResult);
}
