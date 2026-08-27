export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, roles, careerGoals } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const StartInterviewSchema = z.object({
  interviewType: z.enum(['technical', 'behavioral', 'system_design', 'role_specific']).default('technical'),
  difficulty: z.enum(['entry', 'junior', 'mid', 'senior']).default('junior'),
});

const ROLE_QUESTIONS: Record<string, Array<{ question: string; hints: string[]; expectedCriteria: string[] }>> = {
  'Software Engineer': [
    {
      question: 'How do you prevent race conditions and cascading outages in high-throughput API rate limiters?',
      hints: ['Mention Redis token buckets', 'Discuss sliding windows and Retry-After HTTP 429 headers'],
      expectedCriteria: ['Token bucket or sliding window algorithm', 'HTTP 429 status code', 'Redis atomic operations (INCR / Lua scripts)']
    },
    {
      question: 'Explain the difference between optimistic UI updates and deterministic state reconciliations in React.',
      hints: ['Discuss useOptimistic hook', 'Mention error rollbacks and server action validations'],
      expectedCriteria: ['Optimistic rollback on error', 'Server synchronization', 'State machine invariants']
    },
    {
      question: 'How would you diagnose and fix a slow SQL query scanning 1.4 million rows in production?',
      hints: ['EXPLAIN ANALYZE', 'Composite indexes', 'Covering indexes'],
      expectedCriteria: ['EXPLAIN ANALYZE interpretation', 'Composite B-tree indexing', 'Elimination of sequential scans']
    }
  ],
  'ML / AI Engineer': [
    {
      question: 'How do you handle severe class imbalance when tuning customer churn prediction classifiers?',
      hints: ['F1-Score / PR-AUC vs Accuracy', 'Threshold moving', 'SMOTE / Class weighting'],
      expectedCriteria: ['Threshold optimization on Precision-Recall curve', 'Avoidance of pure Accuracy metric', 'Weighted cross-entropy']
    },
    {
      question: 'What is the architectural difference between RAG vector retrieval and parameter-efficient LoRA fine-tuning?',
      hints: ['Parametric vs non-parametric memory', 'Context window limits', 'Latency & retraining costs'],
      expectedCriteria: ['Dynamic knowledge lookup vs internalized weights', 'Low-Rank Adaptation mechanics', 'Inference latency tradeoffs']
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const parsed = StartInterviewSchema.safeParse(body);
    if (!parsed.success) return badRequest('Invalid interview parameters');

    const goal = await db.query.careerGoals.findFirst({
      where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
    });

    const role = await db.query.roles.findFirst({
      where: goal ? eq(roles.id, goal.targetRoleId) : eq(roles.slug, 'software-engineer'),
    });

    const roleName = role?.name || 'Software Engineer';
    const questions = ROLE_QUESTIONS[roleName] || ROLE_QUESTIONS['Software Engineer'];

    return ok({
      roleId: role?.id,
      roleName,
      interviewType: parsed.data.interviewType,
      difficulty: parsed.data.difficulty,
      questions,
    });
  } catch (error: any) {
    console.error('Start interview error:', error);
    return serverError(error.message);
  }
}
