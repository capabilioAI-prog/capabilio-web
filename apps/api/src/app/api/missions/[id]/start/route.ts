export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, serverError, badRequest } from '@/lib/auth';
import { db, missions, submissions } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { checkArenaTaskAllowance } from '@/lib/entitlements';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const mission = await db.query.missions.findFirst({
      where: and(eq(missions.id, params.id), eq(missions.status, 'published')),
    });
    if (!mission) return notFound('Mission');

    // Check if already in progress (allow resuming without consuming daily quota)
    const existing = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.userId, user.id),
        eq(submissions.missionId, params.id),
        eq(submissions.status, 'in_progress')
      ),
    });

    if (existing) {
      return ok({
        submission: existing,
        isExisting: true,
        starterFiles: (existing.files && Object.keys(existing.files).length > 0) ? existing.files : mission.starterFiles
      });
    }

    // Strict Backend Daily Entitlement Enforcement
    const allowance = await checkArenaTaskAllowance(user.id);
    if (!allowance.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DAILY_ARENA_LIMIT_EXCEEDED',
          message: `Daily Arena limit reached (${allowance.used} / ${allowance.limit} completed today). Upgrade to ${allowance.plan === 'free' ? 'Pro for 3 tasks/day' : 'Elite for 6 tasks/day'}.`,
          used: allowance.used,
          limit: allowance.limit,
          plan: allowance.plan,
          reset: allowance.reset,
        }
      }, { status: 403 });
    }

    // Create new submission
    const [submission] = await db.insert(submissions).values({
      userId: user.id,
      missionId: mission.id,
      status: 'in_progress',
      files: mission.starterFiles,
      workspaceSnapshot: {},
    }).returning();

    return ok({ submission, isExisting: false, starterFiles: mission.starterFiles });
  } catch (error) {
    console.error('Start mission error:', error);
    return serverError();
  }
}
