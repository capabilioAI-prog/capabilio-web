import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  real,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { submissions } from './submissions';
import { roles } from './roles';

export const portfolioVisibilityEnum = pgEnum('portfolio_visibility', [
  'public', 'private', 'link_only'
]);

export const artifactTypeEnum = pgEnum('artifact_type', [
  'code_submission', 'document', 'design', 'report', 'presentation', 'screenshot', 'certificate', 'resume'
]);

// Artifacts — uploaded/generated files
export const artifacts = pgTable('artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: artifactTypeEnum('type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  storagePath: text('storage_path').notNull(), // internal storage path
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('artifacts_user_id_idx').on(table.userId),
  typeIdx: index('artifacts_type_idx').on(table.type),
}));

// Portfolio items — curated collection of work
export const portfolioItems = pgTable('portfolio_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  submissionId: uuid('submission_id').references(() => submissions.id),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  missionTitle: text('mission_title'),
  difficulty: text('difficulty'),
  score: real('score'),
  skills: jsonb('skills').$type<Array<{ skillId: string; skillName: string }>>().default([]).notNull(),
  artifactIds: jsonb('artifact_ids').$type<string[]>().default([]).notNull(),
  visibility: portfolioVisibilityEnum('visibility').default('private').notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('portfolio_items_user_id_idx').on(table.userId),
  visibilityIdx: index('portfolio_items_visibility_idx').on(table.visibility),
}));

// Relations
export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  user: one(users, { fields: [portfolioItems.userId], references: [users.id] }),
  submission: one(submissions, { fields: [portfolioItems.submissionId], references: [submissions.id] }),
  role: one(roles, { fields: [portfolioItems.roleId], references: [roles.id] }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  user: one(users, { fields: [artifacts.userId], references: [users.id] }),
}));

// Portfolio Settings & Customization
export const portfolioSettings = pgTable('portfolio_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  headline: text('headline'),
  about: text('about'),
  theme: text('theme').default('editorial').notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  ctaText: text('cta_text').default('Contact Candidate'),
  ctaUrl: text('cta_url'),
  featuredItems: jsonb('featured_items').$type<Array<{ id: string; type: string; order: number }>>().default([]).notNull(),
  featuredSkillSlugs: jsonb('featured_skill_slugs').$type<string[]>().default([]).notNull(),
  enablePersonalBrand: boolean('enable_personal_brand').default(true).notNull(),
  enableVideo: boolean('enable_video').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('portfolio_settings_user_id_idx').on(table.userId),
}));

export const portfolioSettingsRelations = relations(portfolioSettings, ({ one }) => ({
  user: one(users, { fields: [portfolioSettings.userId], references: [users.id] }),
}));
