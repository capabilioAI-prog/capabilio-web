import { db, eloRecords, eloChanges, userSkills, skills } from '@capabilio/db';
import { eq, and, desc } from 'drizzle-orm';

export interface EloUpdateParams {
  userId: string;
  roleId: string;
  roleSlug: string;
  score: number;
  difficulty: 'entry' | 'junior' | 'mid' | 'senior';
  scenarioTitle: string;
}

export interface EloUpdateResult {
  previousElo: number;
  newElo: number;
  delta: number;
  tier: string;
  passed: boolean;
}

export function calculateCareerEloDelta(score: number, difficulty: string): { delta: number; passed: boolean } {
  const passed = score >= 70;
  if (!passed) {
    return { delta: -14, passed: false };
  }
  if (score >= 85) {
    return { delta: 18, passed: true };
  }
  return { delta: 12, passed: true };
}

export async function applyCareerEloUpdate(params: EloUpdateParams): Promise<EloUpdateResult> {
  const { delta, passed } = calculateCareerEloDelta(params.score, params.difficulty);

  // Fetch current Career ELO
  let previousElo = 400;
  const existing = await db.query.eloRecords.findFirst({
    where: and(eq(eloRecords.userId, params.userId as any), eq(eloRecords.roleId, params.roleId as any)),
  }) || await db.query.eloRecords.findFirst({
    where: eq(eloRecords.userId, params.userId as any),
    orderBy: [desc(eloRecords.updatedAt)],
  });

  if (existing) {
    previousElo = existing.eloScore;
    const newElo = Math.max(100, previousElo + delta);
    await db.update(eloRecords).set({
      eloScore: newElo,
      totalMissions: (existing.totalMissions || 0) + 1,
      passedMissions: (existing.passedMissions || 0) + (passed ? 1 : 0),
      updatedAt: new Date(),
    }).where(eq(eloRecords.id, existing.id));

    // Record change
    await db.insert(eloChanges).values({
      userId: params.userId as any,
      roleId: params.roleId as any,
      previousElo,
      newElo,
      delta,
      reason: passed ? `Completed: ${params.scenarioTitle}` : `Regression: ${params.scenarioTitle}`,
      difficulty: params.difficulty,
      passed,
    });

    return {
      previousElo,
      newElo,
      delta,
      tier: newElo < 1000 ? 'Novice' : 'Practitioner',
      passed,
    };
  }

  // Initial insert
  const newElo = Math.max(100, previousElo + delta);
  await db.insert(eloRecords).values({
    userId: params.userId as any,
    roleId: params.roleId as any,
    eloScore: newElo,
    totalMissions: 1,
    passedMissions: passed ? 1 : 0,
    updatedAt: new Date(),
  });

  await db.insert(eloChanges).values({
    userId: params.userId as any,
    roleId: params.roleId as any,
    previousElo,
    newElo,
    delta,
    reason: passed ? `Completed: ${params.scenarioTitle}` : `Regression: ${params.scenarioTitle}`,
    difficulty: params.difficulty,
    passed,
  });

  return {
    previousElo,
    newElo,
    delta,
    tier: 'Novice',
    passed,
  };
}
