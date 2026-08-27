import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { roles } from './roles';
import { submissions } from './submissions';

// Current ELO per user per role
export const eloRecords = pgTable('elo_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  eloScore: integer('elo_score').default(400).notNull(),
  totalMissions: integer('total_missions').default(0).notNull(),
  passedMissions: integer('passed_missions').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userRoleIdx: uniqueIndex('elo_records_user_role_idx').on(table.userId, table.roleId),
  eloScoreIdx: index('elo_records_elo_score_idx').on(table.eloScore),
}));

// ELO change history
export const eloChanges = pgTable('elo_changes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  submissionId: uuid('submission_id').references(() => submissions.id),
  previousElo: integer('previous_elo').notNull(),
  newElo: integer('new_elo').notNull(),
  delta: integer('delta').notNull(),
  reason: text('reason').notNull(),
  difficulty: text('difficulty').notNull(),
  passed: boolean('passed').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('elo_changes_user_id_idx').on(table.userId),
  userRoleIdx: index('elo_changes_user_role_idx').on(table.userId, table.roleId),
}));

export const eloRecordsRelations = relations(eloRecords, ({ one }) => ({
  user: one(users, { fields: [eloRecords.userId], references: [users.id] }),
  role: one(roles, { fields: [eloRecords.roleId], references: [roles.id] }),
}));

export const eloChangesRelations = relations(eloChanges, ({ one }) => ({
  user: one(users, { fields: [eloChanges.userId], references: [users.id] }),
  role: one(roles, { fields: [eloChanges.roleId], references: [roles.id] }),
  submission: one(submissions, { fields: [eloChanges.submissionId], references: [submissions.id] }),
}));

// Stream Ratings (Separate from Career ELO)
export const streamRatings = pgTable('stream_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  streamSlug: text('stream_slug').notNull(),
  streamName: text('stream_name').notNull(),
  rating: integer('rating').default(500).notNull(),
  totalChallenges: integer('total_challenges').default(0).notNull(),
  passedChallenges: integer('passed_challenges').default(0).notNull(),
  streakDays: integer('streak_days').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userStreamIdx: uniqueIndex('stream_ratings_user_stream_idx').on(table.userId, table.streamSlug),
  userIdx: index('stream_ratings_user_id_idx').on(table.userId),
}));
