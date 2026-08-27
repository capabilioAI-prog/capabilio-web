import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  badgeUrl: text('badge_url'),
  criteria: jsonb('criteria').$type<Record<string, unknown>>().default({}).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementId: uuid('achievement_id').references(() => achievements.id).notNull(),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('user_achievements_user_id_idx').on(table.userId),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));
