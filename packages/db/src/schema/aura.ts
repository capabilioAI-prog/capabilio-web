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

export const interviewTypeEnum = pgEnum('aura_interview_type', [
  'technical',
  'behavioral',
  'system_design',
  'role_specific'
]);

export const documentCategoryEnum = pgEnum('aura_document_category', [
  'resume',
  'portfolio_artifact',
  'project',
  'certificate',
  'arena_proof',
  'interview_report',
  'document'
]);

// 1. AI Interviews Table
export const auraInterviews = pgTable('aura_interviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  interviewType: interviewTypeEnum('interview_type').default('technical').notNull(),
  difficulty: text('difficulty').default('junior').notNull(),
  durationMinutes: integer('duration_minutes').default(15).notNull(),
  status: text('status').default('completed').notNull(),
  score: integer('score').default(85).notNull(),
  communicationScore: integer('communication_score').default(80).notNull(),
  technicalDepthScore: integer('technical_depth_score').default(85).notNull(),
  problemSolvingScore: integer('problem_solving_score').default(90).notNull(),
  strengths: jsonb('strengths').$type<string[]>().default([]).notNull(),
  weaknesses: jsonb('weaknesses').$type<string[]>().default([]).notNull(),
  recommendedSkills: jsonb('recommended_skills').$type<string[]>().default([]).notNull(),
  transcript: jsonb('transcript').$type<Array<{
    question: string;
    answer: string;
    feedback?: string;
    score?: number;
  }>>().default([]).notNull(),
  summary: text('summary').notNull(),
  businessReasoningScore: integer('business_reasoning_score').default(85),
  roleRelevanceScore: integer('role_relevance_score').default(88),
  readinessScore: integer('readiness_score').default(72),
  verificationHash: text('verification_hash'),
  nextBestAction: text('next_best_action'),
  taskData: jsonb('task_data').$type<Record<string, any>>().default({}),
  feedback: text('feedback'),
  interviewMode: text('interview_mode').default('technical'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('aura_interviews_user_id_idx').on(table.userId),
  roleIdIdx: index('aura_interviews_role_id_idx').on(table.roleId),
}));


// 1b. Interview Skill Events
export const interviewSkillEvents = pgTable('interview_skill_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  interviewId: uuid('interview_id').references(() => auraInterviews.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  skillSlug: text('skill_slug').notNull(),
  skillName: text('skill_name').notNull(),
  source: text('source').default('AI_INTERVIEW').notNull(),
  scoreDelta: integer('score_delta').notNull(),
  proficiencyAfter: integer('proficiency_after').notNull(),
  evidenceNote: text('evidence_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('interview_skill_events_user_id_idx').on(table.userId),
  interviewIdx: index('interview_skill_events_interview_id_idx').on(table.interviewId),
}));

// 2. Vault / Documents Table
export const auraDocuments = pgTable('aura_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: documentCategoryEnum('category').default('document').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  fileName: text('file_name').notNull(),
  fileSizeBytes: integer('file_size_bytes').default(1024).notNull(),
  mimeType: text('mime_type').default('application/pdf').notNull(),
  fileUrl: text('file_url'),
  verified: boolean('verified').default(false).notNull(),
  verificationHash: text('verification_hash'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('aura_documents_user_id_idx').on(table.userId),
  categoryIdx: index('aura_documents_category_idx').on(table.category),
}));

// 3. Vouchers / Verified Credentials Table
export const auraVouchers = pgTable('aura_vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  verificationId: text('verification_id').notNull().unique(),
  title: text('title').notNull(),
  issuer: text('issuer').default('Capabilio Verified Capability Engine').notNull(),
  eloScore: integer('elo_score').default(1000).notNull(),
  skillsVerified: jsonb('skills_verified').$type<string[]>().default([]).notNull(),
  evidenceCount: integer('evidence_count').default(1).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('aura_vouchers_user_id_idx').on(table.userId),
  verificationIdx: uniqueIndex('aura_vouchers_verification_idx').on(table.verificationId),
}));

// 4. Personal Branding Profiles Table
export const personalBrandingProfiles = pgTable('personal_branding_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  videoStatus: text('video_status').default('draft').notNull(),
  scriptText: text('script_text').notNull(),
  videoUrl: text('video_url'),
  durationSeconds: integer('duration_seconds').default(45).notNull(),
  targetRoleName: text('target_role_name').notNull(),
  topCapabilities: jsonb('top_capabilities').$type<string[]>().default([]).notNull(),
  achievements: jsonb('achievements').$type<string[]>().default([]).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userRoleIdx: uniqueIndex('personal_branding_user_role_idx').on(table.userId, table.roleId),
  userIdIdx: index('personal_branding_user_id_idx').on(table.userId),
}));

// Relations
export const auraInterviewsRelations = relations(auraInterviews, ({ one }) => ({
  user: one(users, { fields: [auraInterviews.userId], references: [users.id] }),
  role: one(roles, { fields: [auraInterviews.roleId], references: [roles.id] }),
}));

export const auraDocumentsRelations = relations(auraDocuments, ({ one }) => ({
  user: one(users, { fields: [auraDocuments.userId], references: [users.id] }),
}));

export const auraVouchersRelations = relations(auraVouchers, ({ one }) => ({
  user: one(users, { fields: [auraVouchers.userId], references: [users.id] }),
  role: one(roles, { fields: [auraVouchers.roleId], references: [roles.id] }),
}));

export const personalBrandingProfilesRelations = relations(personalBrandingProfiles, ({ one }) => ({
  user: one(users, { fields: [personalBrandingProfiles.userId], references: [users.id] }),
  role: one(roles, { fields: [personalBrandingProfiles.roleId], references: [roles.id] }),
}));

