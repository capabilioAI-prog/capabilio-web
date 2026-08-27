import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  integer,
  jsonb,
  varchar,
  index,
  uniqueIndex,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['student', 'professional', 'recruiter', 'admin']);
export const careerLevelEnum = pgEnum('career_level', ['student', 'entry', 'mid', 'senior', 'lead']);
export const careerTimelineEnum = pgEnum('career_timeline', [
  'immediate', '3_months', '6_months', '1_year', '2_plus_years'
]);

// Users table (extends Supabase auth.users)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // matches auth.users.id
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('student').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

// Profiles
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  headline: text('headline'),
  location: text('location'),
  website: text('website'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  collegeName: text('college_name'),
  stream: text('stream'),
  department: text('department'),
  universityName: text('university_name'),
  graduationYear: text('graduation_year'),
  hasCompletedCareerOnboarding: boolean('has_completed_career_onboarding').default(false).notNull(),
  username: text('username').unique(),
  profileVisibility: text('profile_visibility').default('public'),
  evidenceVisibility: jsonb('evidence_visibility').$type<Record<string, 'public' | 'recruiter_only' | 'private'>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('profiles_user_id_idx').on(table.userId),
}));

// Career Goals
export const careerGoals = pgTable('career_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetRoleId: uuid('target_role_id').notNull(), // references roles.id
  timeline: careerTimelineEnum('timeline').notNull(),
  currentLevel: careerLevelEnum('current_level').notNull(),
  motivation: text('motivation'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('career_goals_user_id_idx').on(table.userId),
}));

// Career History
export const careerHistory = pgTable('career_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  company: text('company').notNull(),
  title: text('title').notNull(),
  department: text('department'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  isCurrent: boolean('is_current').default(false).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('career_history_user_id_idx').on(table.userId),
}));

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  careerGoals: many(careerGoals),
  careerHistory: many(careerHistory),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));
