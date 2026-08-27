export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, notFound, serverError, badRequest } from '@/lib/auth';
import { db } from '@capabilio/db';
import { missions, submissions, evaluations, eloRecords, eloChanges, userSkills, skillEvidence, portfolioItems } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { evaluate } from '@capabilio/evaluation';
import { z } from 'zod';
import { recordFeatureUsage, getIstDateString } from '@/lib/entitlements';

const SubmitSchema = z.object({
  submissionId: z.string().uuid(),
  files: z.record(z.string(), z.string()),
  notes: z.string().optional(),
  timeSpentMinutes: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = SubmitSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid submission data', parsed.error.flatten());

    const { submissionId, files, notes, timeSpentMinutes } = parsed.data;

    // Get mission with full data
    const mission = await db.query.missions.findFirst({
      where: and(eq(missions.id, params.id), eq(missions.status, 'published')),
      with: { role: true, missionSkills: { with: { skill: true } } },
    });
    if (!mission) return notFound('Mission');

    // Get submission
    const submission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.id, submissionId),
        eq(submissions.userId, user.id),
        eq(submissions.missionId, params.id)
      ),
    });
    if (!submission) return notFound('Submission');

    // Get user current ELO for this role
    let userElo = 1000;
    const eloRecord = await db.query.eloRecords.findFirst({
      where: and(
        eq(eloRecords.userId, user.id),
        eq(eloRecords.roleId, mission.roleId)
      ),
    });
    if (eloRecord) userElo = eloRecord.eloScore;

    // Mark as submitted
    await db.update(submissions)
      .set({
        status: 'submitted',
        files,
        notes: notes ?? null,
        timeSpentMinutes: timeSpentMinutes ?? null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId));

    // Create pending evaluation record
    const [evalRecord] = await db.insert(evaluations).values({
      submissionId,
      status: 'running',
    }).returning();

    if (!evalRecord) return serverError('Failed to create evaluation record');

    // Run evaluation (async in background for production, sync for now)
    let evalResult;
    try {
      evalResult = await evaluate({
        missionId: mission.id,
        missionTitle: mission.title,
        roleName: mission.role.name,
        difficulty: mission.difficulty,
        submittedFiles: files,
        starterFiles: mission.starterFiles,
        notes: notes ?? null,
        testCases: mission.testCases,
        evaluationCriteria: mission.evaluationCriteria,
        userId: user.id,
        userElo,
      });
    } catch (evalError) {
      console.error('Evaluation failed:', evalError);
      await db.update(evaluations)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(evaluations.id, evalRecord.id));
      await db.update(submissions)
        .set({ status: 'failed' })
        .where(eq(submissions.id, submissionId));
      return serverError('Evaluation failed');
    }

    // Save evaluation results
    await db.update(evaluations).set({
      status: 'completed',
      deterministicScore: evalResult.deterministicScore,
      aiScore: evalResult.aiScore,
      totalScore: evalResult.totalScore,
      passed: evalResult.passed,
      criteriaResults: evalResult.criteriaResults,
      testResults: evalResult.testResults,
      codeExecutionResult: evalResult.codeExecutionResult,
      aiFeedback: evalResult.aiFeedback,
      eloDelta: evalResult.eloDelta,
      evaluatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(evaluations.id, evalRecord.id));

    // Update submission status
    await db.update(submissions)
      .set({ status: 'evaluated', updatedAt: new Date() })
      .where(eq(submissions.id, submissionId));

    // Record Arena daily task usage
    try {
      await recordFeatureUsage(user.id, 'arena_task', getIstDateString());
    } catch (usageErr) {
      console.error('Failed to log feature usage:', usageErr);
    }

    // Update ELO
    if (eloRecord) {
      await db.update(eloRecords).set({
        eloScore: evalResult.newElo,
        totalMissions: eloRecord.totalMissions + 1,
        passedMissions: eloRecord.passedMissions + (evalResult.passed ? 1 : 0),
        updatedAt: new Date(),
      }).where(eq(eloRecords.id, eloRecord.id));
    } else {
      await db.insert(eloRecords).values({
        userId: user.id,
        roleId: mission.roleId,
        eloScore: evalResult.newElo,
        totalMissions: 1,
        passedMissions: evalResult.passed ? 1 : 0,
      });
    }

    // Log ELO change
    await db.insert(eloChanges).values({
      userId: user.id,
      roleId: mission.roleId,
      submissionId,
      previousElo: userElo,
      newElo: evalResult.newElo,
      delta: evalResult.eloDelta,
      reason: evalResult.passed
        ? `Passed "${mission.title}" (${mission.difficulty} level)`
        : `Did not pass "${mission.title}" (${mission.difficulty} level)`,
      difficulty: mission.difficulty,
      passed: evalResult.passed,
    });

    // Update skill ELOs if passed
    if (evalResult.passed) {
      for (const ms of mission.missionSkills) {
        const skillEloGain = Math.round(evalResult.eloDelta * (ms.weight / 100));
        
        // Get or create user skill
        let userSkill = await db.query.userSkills.findFirst({
          where: and(
            eq(userSkills.userId, user.id),
            eq(userSkills.skillId, ms.skillId)
          ),
        });

        if (userSkill) {
          await db.update(userSkills).set({
            eloScore: Math.max(0, userSkill.eloScore + skillEloGain),
            evidenceCount: userSkill.evidenceCount + 1,
            lastDemonstratedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(userSkills.id, userSkill.id));
        } else {
          const [newSkill] = await db.insert(userSkills).values({
            userId: user.id,
            skillId: ms.skillId,
            eloScore: 1000 + skillEloGain,
            evidenceCount: 1,
            lastDemonstratedAt: new Date(),
          }).returning();
          userSkill = newSkill;
        }

        if (userSkill) {
          await db.insert(skillEvidence).values({
            userSkillId: userSkill.id,
            submissionId,
            eloDelta: skillEloGain,
            sourceType: 'mission_completion',
            notes: `"${mission.title}" — ${evalResult.totalScore}/100`,
          });
        }
      }
    }

    // Create portfolio item
    if (evalResult.passed) {
      const mappedSkills = (mission.missionSkills || []).map(ms => ({
        skillId: ms.skillId,
        skillName: ms.skill?.name || 'Software Engineering',
      }));

      await db.insert(portfolioItems).values({
        userId: user.id,
        submissionId,
        roleId: mission.roleId,
        title: mission.title,
        description: `Investigated and fixed a production issue in TechFlow's checkout platform. Achieved ${evalResult.totalScore}/100.`,
        missionTitle: mission.title,
        difficulty: mission.difficulty,
        score: evalResult.totalScore,
        skills: mappedSkills,
        artifactIds: [],
        visibility: 'public',
        isFeatured: true,
      });
    }

    return ok({
      evaluation: {
        id: evalRecord.id,
        totalScore: evalResult.totalScore,
        passed: evalResult.passed,
        deterministicScore: evalResult.deterministicScore,
        aiScore: evalResult.aiScore,
        testResults: evalResult.testResults,
        criteriaResults: evalResult.criteriaResults,
        aiFeedback: evalResult.aiFeedback,
        eloDelta: evalResult.eloDelta,
        newElo: evalResult.newElo,
      },
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    return serverError(`Submit error: ${error?.message || error}`);
  }
}
