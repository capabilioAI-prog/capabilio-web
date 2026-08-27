import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  integer,
  index,
  uniqueIndex,
  real,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { roles } from './roles';
import { users } from './users';

export const skillCategoryEnum = pgEnum('skill_category', [
  'technical', 'analytical', 'communication', 'leadership', 'domain', 'tooling'
]);

export const measurementMethodEnum = pgEnum('measurement_method', [
  'code_execution', 'test_cases', 'artifact_review', 'peer_review', 'ai_assessment', 'portfolio_evidence'
]);

export const skillEvidenceSourceEnum = pgEnum('skill_evidence_source', [
  'mission_completion', 'peer_review', 'certification', 'project'
]);

// Skills master list
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  category: skillCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  measurementMethod: measurementMethodEnum('measurement_method').notNull(),
  parentSkillId: uuid('parent_skill_id'), // self-reference for hierarchy
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('skills_slug_idx').on(table.slug),
}));

// Role <-> Skill mapping with weights
export const roleSkills = pgTable('role_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  skillId: uuid('skill_id').references(() => skills.id, { onDelete: 'cascade' }).notNull(),
  weight: integer('weight').default(50).notNull(), // 1-100
  isCore: boolean('is_core').default(false).notNull(),
}, (table) => ({
  roleSkillIdx: uniqueIndex('role_skills_role_skill_idx').on(table.roleId, table.skillId),
  roleIdx: index('role_skills_role_id_idx').on(table.roleId),
}));

// User skill scores — the heart of the skill graph
export const userSkills = pgTable('user_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  skillId: uuid('skill_id').references(() => skills.id, { onDelete: 'cascade' }).notNull(),
  eloScore: integer('elo_score').default(1000).notNull(), // starts at 1000
  evidenceCount: integer('evidence_count').default(0).notNull(),
  lastDemonstratedAt: timestamp('last_demonstrated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userSkillIdx: uniqueIndex('user_skills_user_skill_idx').on(table.userId, table.skillId),
  userIdx: index('user_skills_user_id_idx').on(table.userId),
}));

// Skill evidence — every ELO change must have evidence
export const skillEvidence = pgTable('skill_evidence', {
  id: uuid('id').primaryKey().defaultRandom(),
  userSkillId: uuid('user_skill_id').references(() => userSkills.id, { onDelete: 'cascade' }).notNull(),
  submissionId: uuid('submission_id'), // references submissions.id
  eloDelta: integer('elo_delta').notNull(),
  sourceType: skillEvidenceSourceEnum('source_type').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userSkillIdx: index('skill_evidence_user_skill_idx').on(table.userSkillId),
}));

// Relations
export const skillsRelations = relations(skills, ({ many, one }) => ({
  roleSkills: many(roleSkills),
  userSkills: many(userSkills),
  parent: one(skills, { fields: [skills.parentSkillId], references: [skills.id], relationName: 'skillHierarchy' }),
  children: many(skills, { relationName: 'skillHierarchy' }),
}));

export const userSkillsRelations = relations(userSkills, ({ one, many }) => ({
  user: one(users, { fields: [userSkills.userId], references: [users.id] }),
  skill: one(skills, { fields: [userSkills.skillId], references: [skills.id] }),
  evidence: many(skillEvidence),
}));

export const roleSkillsRelations = relations(roleSkills, ({ one }) => ({
  role: one(roles, { fields: [roleSkills.roleId], references: [roles.id] }),
  skill: one(skills, { fields: [roleSkills.skillId], references: [skills.id] }),
}));

export const skillEvidenceRelations = relations(skillEvidence, ({ one }) => ({
  userSkill: one(userSkills, { fields: [skillEvidence.userSkillId], references: [userSkills.id] }),
}));

