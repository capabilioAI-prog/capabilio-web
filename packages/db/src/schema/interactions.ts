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

export const jobAppStatusEnum = pgEnum('job_app_status', [
  'applied',
  'under_review',
  'interview',
  'selected',
  'rejected'
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'assessment_complete',
  'mission_evaluated',
  'elo_update',
  'voucher_issued',
  'job_applied',
  'task_assigned',
  'like',
  'comment',
  'follow'
]);

// 1. Job Applications (Launchpad)
export const jobApplications = pgTable('job_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: text('job_id').notNull(),
  company: text('company').notNull(),
  roleTitle: text('role_title').notNull(),
  salaryRange: text('salary_range'),
  status: text('status').default('applied').notNull(), // 'saved' | 'applied' | 'assessment' | 'interview' | 'shortlisted' | 'rejected' | 'offer' | 'withdrawn'
  matchScore: integer('match_score').default(80).notNull(),
  evidenceAttached: jsonb('evidence_attached').$type<string[]>().default([]).notNull(),
  proofPackage: jsonb('proof_package').$type<Record<string, any>>().default({}).notNull(),
  notes: text('notes'),
  timeline: jsonb('timeline').$type<Array<{ status: string; date: string | Date; note?: string }>>().default([]).notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userJobIdx: uniqueIndex('job_apps_user_job_idx').on(table.userId, table.jobId),
  userIdIdx: index('job_apps_user_id_idx').on(table.userId),
}));

// 2. Saved Jobs
export const savedJobs = pgTable('saved_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  jobId: text('job_id').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userSavedJobIdx: uniqueIndex('saved_jobs_user_job_idx').on(table.userId, table.jobId),
  userIdIdx: index('saved_jobs_user_id_idx').on(table.userId),
}));

// 3. Persistent Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notificationTypeEnum('type').default('elo_update').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('notifications_user_id_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}));

// 4. Company Assigned Tasks & Proof
export const companyTasks = pgTable('company_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  companyName: text('company_name').notNull(),
  roleCategory: text('role_category').notNull(),
  difficulty: text('difficulty').default('Junior').notNull(),
  status: text('status').default('assigned').notNull(), // 'assigned' | 'in_review' | 'completed'
  submissionNote: text('submission_note'),
  proofHash: text('proof_hash'),
  dueDays: integer('due_days').default(3).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('company_tasks_user_id_idx').on(table.userId),
  statusIdx: index('company_tasks_status_idx').on(table.status),
}));

// Relations
export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  user: one(users, { fields: [jobApplications.userId], references: [users.id] }),
}));

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  user: one(users, { fields: [savedJobs.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const companyTasksRelations = relations(companyTasks, ({ one }) => ({
  user: one(users, { fields: [companyTasks.userId], references: [users.id] }),
}));
