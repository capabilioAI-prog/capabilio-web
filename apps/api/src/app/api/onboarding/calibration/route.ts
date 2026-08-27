export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, notFound, serverError } from '@/lib/auth';
import { 
  db, 
  careerAssessmentQuestions, 
  careerAssessments, 
  roles, 
  profiles, 
  careerGoals, 
  eloRecords, 
  eloChanges, 
  userSkills,
  skills as skillsTable
} from '@capabilio/db';
import { eq, and, asc, desc } from 'drizzle-orm';
import { evaluateCareerAssessment } from '@capabilio/evaluation';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const roleSlug = searchParams.get('roleSlug') || 'data-analyst';

    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });

    if (!role) return notFound('Role');

    // Fetch questions for this role
    let questions = await db.query.careerAssessmentQuestions.findMany({
      where: eq(careerAssessmentQuestions.roleSlug, roleSlug),
      orderBy: [asc(careerAssessmentQuestions.orderIndex)],
    });

    // Fallback if role question bank not populated
    if (questions.length === 0) {
      questions = await db.query.careerAssessmentQuestions.findMany({
        where: eq(careerAssessmentQuestions.roleSlug, 'data-analyst'),
        orderBy: [asc(careerAssessmentQuestions.orderIndex)],
      });
    }

    // Return sanitized questions without answers for security
    const sanitizedQuestions = questions.map((q, idx) => ({
      id: q.id,
      orderIndex: idx + 1,
      roleSlug: q.roleSlug,
      skillSlug: q.skillSlug,
      skillName: q.skillName,
      difficulty: q.difficulty,
      questionType: q.questionType,
      question: q.question,
      scenario: q.scenario,
      codeSnippet: q.codeSnippet,
      options: q.options,
      timeLimitSeconds: q.timeLimitSeconds,
    }));

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    return ok({
      role: {
        id: role.id,
        name: role.name,
        slug: role.slug,
      },
      startingElo: 400,
      totalQuestions: sanitizedQuestions.length,
      collegeName: profile?.collegeName || 'University',
      stream: profile?.stream || 'Engineering',
      questions: sanitizedQuestions,
    });
  } catch (error: any) {
    console.error('Get calibration questions error:', error);
    return serverError(error.message);
  }
}

const SubmitCalibrationSchema = z.object({
  roleSlug: z.string(),
  answers: z.record(z.string(), z.string()), // questionId -> selectedOption
  timeSpentPerQuestion: z.record(z.string(), z.number()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = SubmitCalibrationSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid submission data', parsed.error.flatten());

    const { roleSlug, answers, timeSpentPerQuestion } = parsed.data;

    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });
    if (!role) return notFound('Role');

    // Fetch full question bank with correct answers
    const questions = await db.query.careerAssessmentQuestions.findMany({
      where: eq(careerAssessmentQuestions.roleSlug, roleSlug),
      orderBy: [asc(careerAssessmentQuestions.orderIndex)],
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Evaluate answers
    const evaluationInputs = [];
    const detailedAnswers: Record<string, any> = {};
    const reviewList = [];

    for (const q of questions) {
      const selected = answers[q.id] || '';
      const isCorrect = selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      const timeSpent = timeSpentPerQuestion ? timeSpentPerQuestion[q.id] || 30 : 30;

      evaluationInputs.push({
        questionId: q.id,
        difficulty: q.difficulty as any,
        skillSlug: q.skillSlug,
        skillName: q.skillName,
        isCorrect,
        timeSpentSeconds: timeSpent,
      });

      detailedAnswers[q.id] = {
        questionId: q.id,
        selectedOption: selected,
        correctOption: q.correctAnswer,
        isCorrect,
        timeSpentSeconds: timeSpent,
      };

      reviewList.push({
        id: q.id,
        orderIndex: q.orderIndex,
        skillSlug: q.skillSlug,
        skillName: q.skillName,
        difficulty: q.difficulty,
        questionType: q.questionType,
        question: q.question,
        scenario: q.scenario,
        codeSnippet: q.codeSnippet,
        options: q.options,
        userAnswer: selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      });
    }

    // Centralized Capabilio 1/3 Scoring Formula Engine
    const evalResult = evaluateCareerAssessment(role.name, evaluationInputs, 400);

    // 1. Save Assessment Record
    const [assessmentRecord] = await db.insert(careerAssessments).values({
      userId: user.id as any,
      roleId: role.id as any,
      startingElo: 400,
      finalElo: evalResult.finalElo,
      eloChange: evalResult.eloChange,
      score: evalResult.score,
      totalQuestions: evalResult.totalQuestions,
      accuracy: evalResult.accuracy,
      answers: detailedAnswers,
      skillScores: evalResult.skillScores,
      strengths: evalResult.strengths,
      weaknesses: evalResult.weaknesses,
      aiFeedback: evalResult.aiFeedback,
    }).returning();

    // 2. Update Active Career Goal
    const existingGoal = await db.query.careerGoals.findFirst({
      where: eq(careerGoals.userId, user.id as any),
    });
    if (existingGoal) {
      await db.update(careerGoals)
        .set({ targetRoleId: role.id, updatedAt: new Date() })
        .where(eq(careerGoals.id, existingGoal.id));
    } else {
      await db.insert(careerGoals).values({
        userId: user.id as any,
        targetRoleId: role.id,
        timeline: 'immediate',
        currentLevel: 'student',
        isActive: true,
      });
    }

    // 3. Update ELO Record & Log Delta
    await db.insert(eloRecords).values({
      userId: user.id as any,
      roleId: role.id,
      eloScore: evalResult.finalElo,
      totalMissions: 0,
      passedMissions: 0,
    }).onConflictDoUpdate({
      target: [eloRecords.userId, eloRecords.roleId],
      set: {
        eloScore: evalResult.finalElo,
      }
    });

    await db.insert(eloChanges).values({
      userId: user.id as any,
      roleId: role.id,
      submissionId: null as any,
      previousElo: 400,
      newElo: evalResult.finalElo,
      delta: evalResult.eloChange,
      reason: `Career Calibration Assessment: ${evalResult.score}/${evalResult.totalQuestions} (${evalResult.accuracy}%)`,
      difficulty: 'entry',
      passed: evalResult.accuracy >= 50,
    });

    // 4. Update Profile
    await db.update(profiles)
      .set({
        onboardingCompleted: true,
        hasCompletedCareerOnboarding: true,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, user.id as any));

    return ok({
      assessmentId: assessmentRecord?.id || 'assessment-calibrated',
      role: { id: role.id, name: role.name, slug: role.slug },
      startingElo: 400,
      finalElo: evalResult.finalElo,
      eloChange: evalResult.eloChange,
      score: evalResult.score,
      totalQuestions: evalResult.totalQuestions,
      accuracy: evalResult.accuracy,
      skillScores: evalResult.skillScores,
      strengths: evalResult.strengths,
      weaknesses: evalResult.weaknesses,
      aiFeedback: evalResult.aiFeedback,
      questionReview: reviewList,
    }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Submit calibration error:', error);
    return serverError(error.message);
  }
}
