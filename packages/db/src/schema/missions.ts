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
import { roles } from './roles';
import { skills } from './skills';
import { users } from './users';

export const missionDifficultyEnum = pgEnum('mission_difficulty', [
  'entry', 'mid', 'senior', 'lead'
]);

export const missionStatusEnum = pgEnum('mission_status', [
  'draft', 'published', 'archived'
]);

// Company context (virtual companies for missions)
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  size: text('size').notNull(), // startup, scaleup, enterprise
  description: text('description').notNull(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Missions — the core work units
export const missions = pgTable('missions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  companyId: uuid('company_id').references(() => companies.id),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  difficulty: missionDifficultyEnum('difficulty').notNull(),
  estimatedMinutes: integer('estimated_minutes').default(60).notNull(),
  status: missionStatusEnum('status').default('draft').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),

  // Mission context (manager assignment style)
  managerName: text('manager_name').notNull(),
  managerTitle: text('manager_title').notNull(),
  department: text('department').notNull(),
  sprint: text('sprint').notNull(),

  // Mission content
  businessContext: text('business_context').notNull(),
  problemStatement: text('problem_statement').notNull(),
  requirements: jsonb('requirements').$type<Array<{
    id: string;
    description: string;
    isRequired: boolean;
    weight: number;
  }>>().default([]).notNull(),
  acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>().default([]).notNull(),
  evaluationCriteria: jsonb('evaluation_criteria').$type<Array<{
    id: string;
    name: string;
    description: string;
    weight: number;
    evaluationType: 'deterministic' | 'ai_assisted' | 'artifact';
  }>>().default([]).notNull(),
  availableTools: jsonb('available_tools').$type<string[]>().default([]).notNull(),
  expectedDeliverable: text('expected_deliverable').notNull(),
  referenceDocumentation: text('reference_documentation'),
  starterCode: jsonb('starter_code').$type<Record<string, string>>().default({}).notNull(),
  starterFiles: jsonb('starter_files').$type<Record<string, string>>().default({}).notNull(),
  testCases: jsonb('test_cases').$type<Array<{
    id: string;
    name: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    weight: number;
  }>>().default([]).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('missions_slug_idx').on(table.slug),
  roleIdx: index('missions_role_id_idx').on(table.roleId),
  companyIdx: index('missions_company_id_idx').on(table.companyId),
}));

// Mission <-> Skill mapping
export const missionSkills = pgTable('mission_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  missionId: uuid('mission_id').references(() => missions.id, { onDelete: 'cascade' }).notNull(),
  skillId: uuid('skill_id').references(() => skills.id, { onDelete: 'cascade' }).notNull(),
  weight: integer('weight').default(50).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
}, (table) => ({
  missionSkillIdx: uniqueIndex('mission_skills_mission_skill_idx').on(table.missionId, table.skillId),
  missionIdx: index('mission_skills_mission_id_idx').on(table.missionId),
}));

// User Mission Attempts (Locks completed missions permanently)
export const userMissionAttempts = pgTable('user_mission_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  missionId: text('mission_id').notNull(),
  trackType: text('track_type').default('career').notNull(), // 'career' | 'stream'
  roleSlug: text('role_slug'),
  streamSlug: text('stream_slug'),
  title: text('title').notNull(),
  scenarioFamily: text('scenario_family'),
  score: integer('score').notNull(),
  eloBefore: integer('elo_before').notNull(),
  eloChange: integer('elo_change').notNull(),
  eloAfter: integer('elo_after').notNull(),
  passed: boolean('passed').notNull(),
  status: text('status').default('completed').notNull(), // 'completed' | 'regression'
  skills: jsonb('skills').$type<Array<{ name: string; score?: number }>>().default([]),
  deliverables: jsonb('deliverables').$type<Record<string, any>>().default({}),
  mentorFeedback: text('mentor_feedback'),
  verificationHash: text('verification_hash'),
  isLocked: boolean('is_locked').default(true).notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userMissionIdx: uniqueIndex('user_mission_attempts_user_mission_idx').on(table.userId, table.missionId),
  userIdx: index('user_mission_attempts_user_id_idx').on(table.userId),
  trackIdx: index('user_mission_attempts_track_idx').on(table.trackType),
}));

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  missions: many(missions),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  company: one(companies, { fields: [missions.companyId], references: [companies.id] }),
  role: one(roles, { fields: [missions.roleId], references: [roles.id] }),
  missionSkills: many(missionSkills),
  skills: many(missionSkills),
}));

export const missionSkillsRelations = relations(missionSkills, ({ one }) => ({
  mission: one(missions, { fields: [missionSkills.missionId], references: [missions.id] }),
  skill: one(skills, { fields: [missionSkills.skillId], references: [skills.id] }),
}));

export const userMissionAttemptsRelations = relations(userMissionAttempts, ({ one }) => ({
  user: one(users, { fields: [userMissionAttempts.userId], references: [users.id] }),
}));
