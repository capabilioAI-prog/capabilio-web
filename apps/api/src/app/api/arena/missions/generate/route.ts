export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, serverError } from '@/lib/auth';
import { generateAdaptiveMission } from '@/lib/arena/mission-generator';
import { db, careerGoals, roles, eloRecords, userMissionAttempts } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json().catch(() => ({}));

    // Enforce Authoritative Server-Side Role Isolation
    const goal = await db.query.careerGoals.findFirst({
      where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
    });

    let authoritativeRoleSlug = 'data-analyst';
    if (goal?.targetRoleId) {
      const role = await db.query.roles.findFirst({ where: eq(roles.id, goal.targetRoleId) });
      if (role?.slug?.includes('database') || role?.slug?.includes('dba')) {
        authoritativeRoleSlug = 'database-administrator';
      } else {
        authoritativeRoleSlug = 'data-analyst';
      }
    }

    let currentElo = 400;
    const eloRecord = await db.query.eloRecords.findFirst({
      where: eq(eloRecords.userId, user.id as any),
    });
    if (eloRecord) currentElo = eloRecord.eloScore;

    // Load full historical attempts from PostgreSQL for duplicate prevention
    const dbAttempts = await db.query.userMissionAttempts.findMany({
      where: eq(userMissionAttempts.userId, user.id as any),
    });

    const combinedHistory = [
      ...dbAttempts.map(a => ({
        id: a.missionId,
        fingerprint: a.missionId,
        scenarioFamily: a.scenarioFamily || 'default',
        title: a.title,
        status: a.status || 'completed',
        passed: a.passed,
      })),
      ...(body.history || []),
    ];

    const mission = await generateAdaptiveMission({
      userId: user.id,
      roleSlug: authoritativeRoleSlug,
      currentElo,
      history: combinedHistory,
      preferredDifficulty: body.difficulty,
    });

    return ok({ mission }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Mission generation error:', error);
    return serverError(error.message);
  }
}
