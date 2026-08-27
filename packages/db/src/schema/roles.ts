import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roleLevelEnum = pgEnum('role_level', [
  'intern', 'junior', 'mid', 'senior', 'lead', 'principal'
]);

// Disciplines (e.g., Software Engineering, Data Science, MBA)
export const disciplines = pgTable('disciplines', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  iconName: text('icon_name'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Roles (e.g., Frontend Engineer, Backend Engineer, ML Engineer)
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  disciplineId: uuid('discipline_id').references(() => disciplines.id).notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  level: roleLevelEnum('level').default('mid').notNull(),
  description: text('description').notNull(),
  iconName: text('icon_name'),
  color: text('color'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('roles_slug_idx').on(table.slug),
  disciplineIdx: index('roles_discipline_id_idx').on(table.disciplineId),
}));

// Role Knowledge Model — rich description of what the role actually does
export const roleKnowledge = pgTable('role_knowledge', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull().unique(),
  responsibilities: jsonb('responsibilities').$type<string[]>().default([]).notNull(),
  tools: jsonb('tools').$type<string[]>().default([]).notNull(),
  software: jsonb('software').$type<string[]>().default([]).notNull(),
  workflows: jsonb('workflows').$type<string[]>().default([]).notNull(),
  deliverables: jsonb('deliverables').$type<string[]>().default([]).notNull(),
  evaluationMethods: jsonb('evaluation_methods').$type<string[]>().default([]).notNull(),
  portfolioEvidenceTypes: jsonb('portfolio_evidence_types').$type<string[]>().default([]).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const disciplinesRelations = relations(disciplines, ({ many }) => ({
  roles: many(roles),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  discipline: one(disciplines, { fields: [roles.disciplineId], references: [disciplines.id] }),
  knowledge: one(roleKnowledge, { fields: [roles.id], references: [roleKnowledge.roleId] }),
}));
