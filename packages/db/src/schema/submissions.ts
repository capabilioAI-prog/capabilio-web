import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  integer,
  jsonb,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { missions } from './missions';

export const submissionStatusEnum = pgEnum('submission_status', [
  'in_progress', 'submitted', 'evaluated', 'failed'
]);

export const evaluationStatusEnum = pgEnum('evaluation_status', [
  'pending', 'running', 'completed', 'failed'
]);

// Submissions — a user's attempt at a mission
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  missionId: uuid('mission_id').references(() => missions.id).notNull(),
  status: submissionStatusEnum('status').default('in_progress').notNull(),

  // The entire workspace state at submission time
  workspaceSnapshot: jsonb('workspace_snapshot').$type<Record<string, unknown>>().default({}).notNull(),
  // Submitted files: filename -> content
  files: jsonb('files').$type<Record<string, string>>().default({}).notNull(),
  // Engineering notes / write-up
  notes: text('notes'),

  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  timeSpentMinutes: integer('time_spent_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('submissions_user_id_idx').on(table.userId),
  missionIdx: index('submissions_mission_id_idx').on(table.missionId),
  statusIdx: index('submissions_status_idx').on(table.status),
  userMissionIdx: index('submissions_user_mission_idx').on(table.userId, table.missionId),
}));

// Evaluations — the result of evaluating a submission
export const evaluations = pgTable('evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'cascade' }).notNull().unique(),
  status: evaluationStatusEnum('status').default('pending').notNull(),

  // Scores (0-100)
  deterministicScore: real('deterministic_score'),
  aiScore: real('ai_score'),
  totalScore: real('total_score'),
  passed: boolean('passed'),

  // Detailed results
  criteriaResults: jsonb('criteria_results').$type<Array<{
    criterionId: string;
    criterionName: string;
    passed: boolean;
    score: number;
    evidence: string;
    details: string | null;
  }>>().default([]).notNull(),

  testResults: jsonb('test_results').$type<Array<{
    name: string;
    status: 'pass' | 'fail' | 'skip';
    duration: number;
    error: string | null;
    expected: string | null;
    received: string | null;
  }>>(),

  codeExecutionResult: jsonb('code_execution_result').$type<{
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    memoryUsed: number;
    timedOut: boolean;
  }>(),

  aiFeedback: jsonb('ai_feedback').$type<{
    summary: string;
    strengths: string[];
    improvements: string[];
    mentorNote: string;
    skillInsights: Record<string, string>;
  }>(),

  eloDelta: integer('elo_delta'),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  submissionIdx: index('evaluations_submission_id_idx').on(table.submissionId),
}));

// Evaluation criterion results (normalized)
export const evaluationCriteriaResults = pgTable('evaluation_criteria_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  evaluationId: uuid('evaluation_id').references(() => evaluations.id, { onDelete: 'cascade' }).notNull(),
  criterionId: text('criterion_id').notNull(),
  criterionName: text('criterion_name').notNull(),
  passed: boolean('passed').notNull(),
  score: real('score').notNull(), // 0-100
  evidence: text('evidence').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  evalIdx: index('eval_criteria_evaluation_id_idx').on(table.evaluationId),
}));

// Relations
export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  mission: one(missions, { fields: [submissions.missionId], references: [missions.id] }),
  evaluation: one(evaluations, { fields: [submissions.id], references: [evaluations.submissionId] }),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  submission: one(submissions, { fields: [evaluations.submissionId], references: [submissions.id] }),
  criteriaResults: many(evaluationCriteriaResults),
}));
