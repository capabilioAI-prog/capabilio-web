export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { 
  db, 
  roles, 
  userMissionAttempts,
  userSkills,
  skills
} from '@capabilio/db';
import { recordFeatureUsage, getIstDateString, checkArenaTaskAllowance } from '@/lib/entitlements';
import { evaluateMissionWork } from '@/lib/arena/evaluation-engine';
import { applyCareerEloUpdate } from '@/lib/arena/elo-engine';
import { mintAndSyncEvidence } from '@/lib/arena/evidence-engine';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const SubmitMissionSchema = z.object({
  roleSlug: z.string().default('data-analyst'),
  sqlCode: z.string().optional(),
  analysisNotes: z.string().optional(),
  recommendations: z.string().optional(),
  hintsUsedCount: z.number().default(0),
  isFlawedAttempt: z.boolean().default(false),
  missionTitle: z.string().optional(),
  scenarioFamily: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const missionId = params.id;

    // 1. Permanent Mission Lock Check
    const existingAttempt = await db.query.userMissionAttempts.findFirst({
      where: and(
        eq(userMissionAttempts.userId, user.id as any),
        eq(userMissionAttempts.missionId, missionId)
      ),
    });

    if (existingAttempt) {
      return badRequest('MISSION_ALREADY_COMPLETED', {
        message: 'This career mission has already been evaluated and permanently locked. You cannot resubmit completed missions.',
        attempt: existingAttempt,
      });
    }

    // 2. Check Daily Allowance
    const allowance = await checkArenaTaskAllowance(user.id);
    if (!allowance.allowed) {
      return badRequest('DAILY_ARENA_LIMIT_REACHED', {
        message: `You have reached your daily Arena mission allowance (${allowance.used}/${allowance.limit} used). Upgrade to Pro or Elite to continue practicing today.`,
        plan: allowance.plan,
        used: allowance.used,
        limit: allowance.limit,
      });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = SubmitMissionSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid submission payload');

    const isDba = parsed.data.roleSlug.includes('dba') || parsed.data.roleSlug.includes('database');

    // Find actual target role in DB
    const searchSlug = isDba ? 'database-administrator' : 'data-analyst';
    let targetRole = await db.query.roles.findFirst({
      where: eq(roles.slug, searchSlug),
    });
    if (!targetRole) {
      targetRole = await db.query.roles.findFirst();
    }
    const roleId = targetRole?.id || 'role_default';

    // 3. Real Work Evaluation via evaluation-engine
    const evalResult = evaluateMissionWork({
      missionId,
      roleSlug: parsed.data.roleSlug,
      sqlCode: parsed.data.sqlCode,
      analysisNotes: parsed.data.analysisNotes,
      recommendations: parsed.data.recommendations,
      hintsUsedCount: parsed.data.hintsUsedCount,
      isFlawedAttempt: parsed.data.isFlawedAttempt,
    });

    const scenarioTitle = parsed.data.missionTitle || (
      isDba 
        ? 'Optimize Degraded Production Query Scanning 1.8M Rows' 
        : (missionId.includes('dedup') || missionId.includes('812')
            ? 'Prevent Customer Duplication in a Production Retention Pipeline'
            : 'Diagnose 18% Customer Churn Spike via Cohort Retention Matrix')
    );

    const scenarioFamily = parsed.data.scenarioFamily || (
      isDba 
        ? 'slow_query' 
        : (missionId.includes('dedup') || missionId.includes('812') ? 'join_deduplication' : 'customer_churn')
    );

    // 4. Authoritative ELO Update via elo-engine
    const eloResult = await applyCareerEloUpdate({
      userId: user.id,
      roleId,
      roleSlug: parsed.data.roleSlug,
      score: evalResult.score,
      difficulty: 'entry',
      scenarioTitle,
    });

    // 5. Mint Cryptographic Proof and Sync to Vault & Portfolio via evidence-engine
    const proof = await mintAndSyncEvidence({
      userId: user.id,
      roleId,
      roleSlug: parsed.data.roleSlug,
      missionId,
      scenarioTitle,
      scenarioFamily,
      difficulty: 'entry',
      score: evalResult.score,
      passed: evalResult.passed,
      eloBefore: eloResult.previousElo,
      eloDelta: eloResult.delta,
      eloAfter: eloResult.newElo,
      subscores: evalResult.subscores,
      skillsDemonstrated: evalResult.skillAdjustments.map(s => ({ name: s.name, score: s.newProficiency })),
      deliverables: {
        sql: parsed.data.sqlCode,
        summary: parsed.data.analysisNotes,
        recommendation: parsed.data.recommendations,
      },
      mentorFeedback: evalResult.mentorFeedback,
      hintsUsedCount: parsed.data.hintsUsedCount,
    });

    // 6. Record Permanent Attempt in DB
    await db.insert(userMissionAttempts).values({
      userId: user.id as any,
      missionId,
      trackType: 'career',
      roleSlug: isDba ? 'database-administrator' : 'data-analyst',
      title: scenarioTitle,
      scenarioFamily,
      score: evalResult.score,
      eloBefore: eloResult.previousElo,
      eloChange: eloResult.delta,
      eloAfter: eloResult.newElo,
      passed: evalResult.passed,
      status: evalResult.passed ? 'completed' : 'regression',
      skills: evalResult.skillAdjustments.map(s => ({ name: s.name, score: s.newProficiency })),
      deliverables: {
        sql: parsed.data.sqlCode,
        summary: parsed.data.analysisNotes,
        subscores: evalResult.subscores,
        hintsUsed: parsed.data.hintsUsedCount,
      },
      mentorFeedback: evalResult.mentorFeedback,
      verificationHash: proof.verificationHash,
      isLocked: true,
    });

    // 7. Record feature usage in IST
    await recordFeatureUsage(user.id, 'arena_task', getIstDateString());

    return ok({
      evaluation: {
        score: evalResult.score,
        passed: evalResult.passed,
        eloBefore: eloResult.previousElo,
        eloDelta: eloResult.delta,
        eloAfter: eloResult.newElo,
        verdict: evalResult.verdict,
        subscores: evalResult.subscores,
        strengths: evalResult.strengths,
        weaknesses: evalResult.weaknesses,
        diagnosedGaps: evalResult.diagnosedGaps,
        skillImpact: evalResult.skillImpact,
        skillAdjustments: evalResult.skillAdjustments,
        mentorFeedback: evalResult.mentorFeedback,
        nextBestAction: evalResult.nextBestAction,
        remediationTarget: evalResult.remediationTarget,
        verificationHash: proof.verificationHash,
      },
    }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Submit mission error:', error);
    return serverError(error.message);
  }
}
