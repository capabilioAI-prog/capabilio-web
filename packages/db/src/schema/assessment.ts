import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { roles } from './roles';

export const questionTypeEnum = pgEnum('assessment_question_type', [
  'MCQ',
  'SCENARIO',
  'DEBUGGING',
  'OUTPUT_PREDICTION',
  'SQL_QUERY',
  'DATA_INTERPRETATION'
]);

export const questionDifficultyEnum = pgEnum('assessment_question_difficulty', [
  'easy',
  'applied',
  'scenario',
  'challenging'
]);

// 1. Career Assessment Questions Master Bank
export const careerAssessmentQuestions = pgTable('career_assessment_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleSlug: text('role_slug').notNull(),
  skillSlug: text('skill_slug').notNull(),
  skillName: text('skill_name').notNull(),
  difficulty: questionDifficultyEnum('difficulty').default('applied').notNull(),
  questionType: questionTypeEnum('question_type').default('MCQ').notNull(),
  question: text('question').notNull(),
  scenario: text('scenario'),
  codeSnippet: text('code_snippet'),
  options: jsonb('options').$type<string[]>().notNull(),
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation').notNull(),
  timeLimitSeconds: integer('time_limit_seconds').default(60).notNull(),
  orderIndex: integer('order_index').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  roleSlugIdx: index('assessment_questions_role_slug_idx').on(table.roleSlug),
  skillSlugIdx: index('assessment_questions_skill_slug_idx').on(table.skillSlug),
}));

// 2. Career Assessment Results
export const careerAssessments = pgTable('career_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  startingElo: integer('starting_elo').default(400).notNull(),
  finalElo: integer('final_elo').notNull(),
  eloChange: integer('elo_change').notNull(),
  score: integer('score').notNull(), // e.g. 17
  totalQuestions: integer('total_questions').default(25).notNull(),
  accuracy: integer('accuracy').notNull(), // e.g. 68
  answers: jsonb('answers').$type<Record<string, {
    questionId: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    timeSpentSeconds?: number;
  }>>().default({}).notNull(),
  skillScores: jsonb('skill_scores').$type<Array<{
    skillSlug: string;
    skillName: string;
    score: number;
    questionsCount: number;
    correctCount: number;
    status: 'Strong' | 'Developing' | 'Needs Work';
  }>>().default([]).notNull(),
  strengths: jsonb('strengths').$type<string[]>().default([]).notNull(),
  weaknesses: jsonb('weaknesses').$type<string[]>().default([]).notNull(),
  aiFeedback: jsonb('ai_feedback').$type<{
    summary: string;
    strengthsNote: string;
    weaknessesNote: string;
    nextLearningAction: string;
  }>().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('career_assessments_user_id_idx').on(table.userId),
  roleIdIdx: index('career_assessments_role_id_idx').on(table.roleId),
}));

// Relations
export const careerAssessmentQuestionsRelations = relations(careerAssessmentQuestions, ({}) => ({}));

export const careerAssessmentsRelations = relations(careerAssessments, ({ one }) => ({
  user: one(users, { fields: [careerAssessments.userId], references: [users.id] }),
  role: one(roles, { fields: [careerAssessments.roleId], references: [roles.id] }),
}));
