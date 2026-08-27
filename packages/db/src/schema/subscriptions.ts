import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'free', 'pro', 'elite', 'student', 'professional', 'enterprise'
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'canceled', 'past_due', 'trialing'
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  plan: subscriptionPlanEnum('plan').default('free').notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  billingCycle: text('billing_cycle').default('monthly').notNull(), // 'monthly' | 'annual'
  periodStart: timestamp('period_start', { withTimezone: true }),
  periodEnd: timestamp('period_end', { withTimezone: true }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  feature: text('feature').notNull(), // 'arena_task', 'ai_interview', 'skill_report', 'market_report'
  count: integer('count').default(1).notNull(),
  period: text('period').notNull(), // 'YYYY-MM-DD' for daily IST, 'YYYY-MM' for monthly IST
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userFeatureIdx: index('usage_logs_user_feature_idx').on(table.userId, table.feature, table.period),
}));

export const addonPurchases = pgTable('addon_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  addonType: text('addon_type').notNull(), // 'additional_interview', 'personal_branding_video', etc.
  priceInr: integer('price_inr').notNull(),
  status: text('status').default('completed').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('addon_purchases_user_id_idx').on(table.userId),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, { fields: [usageLogs.userId], references: [users.id] }),
}));
