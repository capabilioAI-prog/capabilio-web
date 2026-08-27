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

export const postCategoryEnum = pgEnum('pulse_post_category', [
  'sparks',
  'architecture',
  'incident',
  'career_win',
  'technical_news',
  'evidence_share',
  'question',
  'insight'
]);

export const signalTypeEnum = pgEnum('pulse_signal_type', [
  'career_signal',
  'tech_signal',
  'trend_signal',
  'network_signal'
]);

export const followTargetTypeEnum = pgEnum('pulse_follow_target_type', [
  'user',
  'company',
  'topic'
]);

// Posts Table
export const pulsePosts = pgTable('pulse_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  authorName: text('author_name').notNull(),
  authorHeadline: text('author_headline').notNull(),
  authorAvatarUrl: text('author_avatar_url'),
  authorRole: text('author_role').notNull(),
  category: postCategoryEnum('category').default('insight').notNull(),
  title: text('title'),
  content: text('content').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  domain: text('domain').default('software_engineering').notNull(),
  signalType: signalTypeEnum('signal_type'),
  signalNote: text('signal_note'),
  codeSnippet: jsonb('code_snippet').$type<{ language: string; code: string; filename?: string }>(),
  evidenceData: jsonb('evidence_data').$type<{
    missionId?: string;
    missionTitle: string;
    roleName: string;
    eloDelta: number;
    score: number;
    skillName: string;
    proofHash?: string;
  }>(),
  actionPrompt: jsonb('action_prompt').$type<{
    type: 'arena' | 'skill_studio' | 'launchpad';
    label: string;
    linkUrl: string;
    badgeText?: string;
  }>(),
  likesCount: integer('likes_count').default(0).notNull(),
  commentsCount: integer('comments_count').default(0).notNull(),
  sharesCount: integer('shares_count').default(0).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('pulse_posts_user_id_idx').on(table.userId),
  domainIdx: index('pulse_posts_domain_idx').on(table.domain),
  categoryIdx: index('pulse_posts_category_idx').on(table.category),
  createdAtIdx: index('pulse_posts_created_at_idx').on(table.createdAt),
}));

// Comments Table
export const pulseComments = pgTable('pulse_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => pulsePosts.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  authorName: text('author_name').notNull(),
  authorHeadline: text('author_headline').notNull(),
  authorAvatarUrl: text('author_avatar_url'),
  content: text('content').notNull(),
  parentId: uuid('parent_id'),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  postIdIdx: index('pulse_comments_post_id_idx').on(table.postId),
  userIdIdx: index('pulse_comments_user_id_idx').on(table.userId),
}));

// Likes Table
export const pulseLikes = pgTable('pulse_likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid('post_id').references(() => pulsePosts.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPostUnique: uniqueIndex('pulse_likes_user_post_idx').on(table.userId, table.postId),
  postIdIdx: index('pulse_likes_post_id_idx').on(table.postId),
}));

// Saved Items Table
export const pulseSaved = pgTable('pulse_saved', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid('post_id').references(() => pulsePosts.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userPostSavedUnique: uniqueIndex('pulse_saved_user_post_idx').on(table.userId, table.postId),
  userIdIdx: index('pulse_saved_user_id_idx').on(table.userId),
}));

// Follows Table (People, Companies, Topics)
export const pulseFollows = pgTable('pulse_follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: followTargetTypeEnum('target_type').notNull(),
  targetId: text('target_id').notNull(), // Target user UUID, company name slug, or topic slug
  targetName: text('target_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userFollowUnique: uniqueIndex('pulse_follows_user_target_idx').on(table.userId, table.targetType, table.targetId),
  userIdIdx: index('pulse_follows_user_id_idx').on(table.userId),
}));

// Topics Master Table
export const pulseTopics = pgTable('pulse_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  domain: text('domain').notNull(),
  trendingScore: integer('trending_score').default(100).notNull(),
  growthRate: text('growth_rate').default('+15%').notNull(),
  description: text('description').notNull(),
  followersCount: integer('followers_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const pulsePostsRelations = relations(pulsePosts, ({ one, many }) => ({
  author: one(users, { fields: [pulsePosts.userId], references: [users.id] }),
  comments: many(pulseComments),
  likes: many(pulseLikes),
  savedBy: many(pulseSaved),
}));

export const pulseCommentsRelations = relations(pulseComments, ({ one }) => ({
  post: one(pulsePosts, { fields: [pulseComments.postId], references: [pulsePosts.id] }),
  author: one(users, { fields: [pulseComments.userId], references: [users.id] }),
}));

export const pulseLikesRelations = relations(pulseLikes, ({ one }) => ({
  post: one(pulsePosts, { fields: [pulseLikes.postId], references: [pulsePosts.id] }),
  user: one(users, { fields: [pulseLikes.userId], references: [users.id] }),
}));

export const pulseSavedRelations = relations(pulseSaved, ({ one }) => ({
  post: one(pulsePosts, { fields: [pulseSaved.postId], references: [pulsePosts.id] }),
  user: one(users, { fields: [pulseSaved.userId], references: [users.id] }),
}));

export const pulseFollowsRelations = relations(pulseFollows, ({ one }) => ({
  user: one(users, { fields: [pulseFollows.userId], references: [users.id] }),
}));
