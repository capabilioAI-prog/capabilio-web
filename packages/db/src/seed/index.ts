import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '../schema/index';
import { disciplinesData } from './data/disciplines';
import { allRolesData } from './data/all-roles';
import { allMissionsData } from './data/all-missions';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL required');
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.warn('Starting comprehensive database seed for all roles & missions...');

  // 1. Seed disciplines
  console.warn('Seeding disciplines...');
  const insertedDisciplines = await db
    .insert(schema.disciplines)
    .values(disciplinesData.map(d => ({ name: d.name, slug: d.slug, description: d.description, iconName: d.iconName })))
    .onConflictDoUpdate({ target: schema.disciplines.slug, set: { name: sql`excluded.name` } })
    .returning();

  const disciplineMap = new Map<string, string>();
  for (const d of insertedDisciplines) {
    disciplineMap.set(d.slug, d.id);
  }

  const defaultDisciplineId = insertedDisciplines[0]!.id;

  // 2. Seed all roles, knowledge, and skills
  const roleMap = new Map<string, string>();
  const skillMap = new Map<string, string>();

  for (const roleDef of allRolesData) {
    console.warn(`Seeding role: ${roleDef.name}...`);
    const discId = disciplineMap.get(roleDef.disciplineSlug) || defaultDisciplineId;

    const [role] = await db
      .insert(schema.roles)
      .values({
        disciplineId: discId,
        name: roleDef.name,
        slug: roleDef.slug,
        level: roleDef.level,
        description: roleDef.description,
        iconName: roleDef.iconName,
        color: roleDef.color,
      })
      .onConflictDoUpdate({ target: schema.roles.slug, set: { name: sql`excluded.name`, description: sql`excluded.description` } })
      .returning();

    if (role) {
      roleMap.set(role.slug, role.id);

      // Seed role knowledge
      await db
        .insert(schema.roleKnowledge)
        .values({
          roleId: role.id,
          responsibilities: roleDef.responsibilities,
          tools: roleDef.tools,
          software: roleDef.software,
          workflows: roleDef.workflows,
          deliverables: roleDef.deliverables,
          evaluationMethods: roleDef.evaluationMethods,
          portfolioEvidenceTypes: roleDef.portfolioEvidenceTypes,
        })
        .onConflictDoUpdate({ target: schema.roleKnowledge.roleId, set: { updatedAt: new Date() } });

      // Seed skills for role
      for (const skill of roleDef.skills) {
        const [insertedSkill] = await db
          .insert(schema.skills)
          .values({
            name: skill.name,
            slug: skill.slug,
            category: skill.category,
            description: skill.description,
            measurementMethod: skill.measurementMethod,
          })
          .onConflictDoUpdate({ target: schema.skills.slug, set: { name: sql`excluded.name`, description: sql`excluded.description` } })
          .returning();

        if (insertedSkill) {
          skillMap.set(skill.slug, insertedSkill.id);

          // Seed role_skills link
          await db
            .insert(schema.roleSkills)
            .values({
              roleId: role.id,
              skillId: insertedSkill.id,
              weight: skill.weight,
              isCore: skill.isCore,
            })
            .onConflictDoNothing();
        }
      }
    }
  }

  // 3. Seed missions and virtual companies
  for (const missionDef of allMissionsData) {
    console.warn(`Seeding mission: ${missionDef.title}...`);
    const roleId = roleMap.get(missionDef.roleSlug);
    if (!roleId) continue;

    // Seed company
    const [company] = await db
      .insert(schema.companies)
      .values({
        name: missionDef.company.name,
        industry: missionDef.company.industry,
        size: missionDef.company.size,
        description: missionDef.company.description,
      })
      .onConflictDoUpdate({ target: schema.companies.id, set: { name: sql`excluded.name` } })
      .returning();

    const [mission] = await db
      .insert(schema.missions)
      .values({
        roleId: roleId,
        companyId: company?.id,
        title: missionDef.title,
        slug: missionDef.slug,
        difficulty: missionDef.difficulty,
        estimatedMinutes: missionDef.estimatedMinutes,
        status: 'published',
        managerName: missionDef.managerName,
        managerTitle: missionDef.managerTitle,
        department: missionDef.department,
        sprint: missionDef.sprint,
        businessContext: missionDef.businessContext,
        problemStatement: missionDef.problemStatement,
        requirements: missionDef.requirements,
        acceptanceCriteria: missionDef.acceptanceCriteria,
        evaluationCriteria: missionDef.evaluationCriteria,
        availableTools: missionDef.availableTools,
        expectedDeliverable: missionDef.expectedDeliverable,
        referenceDocumentation: missionDef.referenceDocumentation,
        starterFiles: missionDef.starterFiles,
        testCases: missionDef.testCases,
        publishedAt: new Date(),
      })
      .onConflictDoUpdate({ target: schema.missions.slug, set: { status: 'published', starterFiles: missionDef.starterFiles, testCases: missionDef.testCases } })
      .returning();

    if (mission) {
      // Link mission skills
      for (const slug of missionDef.skillSlugs) {
        const skillId = skillMap.get(slug);
        if (!skillId) continue;

        await db
          .insert(schema.missionSkills)
          .values({
            missionId: mission.id,
            skillId: skillId,
            weight: 80,
            isPrimary: true,
          })
          .onConflictDoNothing();
      }
    }
  }

  // 4. Seed Pulse Topics & Posts
  console.warn('Seeding Pulse topics & posts...');
  const { pulseTopicsData, pulsePostsData } = await import('./data/pulse-data');

  for (const topic of pulseTopicsData) {
    await db
      .insert(schema.pulseTopics)
      .values({
        name: topic.name,
        slug: topic.slug,
        domain: topic.domain,
        trendingScore: topic.trendingScore,
        growthRate: topic.growthRate,
        description: topic.description,
        followersCount: topic.followersCount,
      })
      .onConflictDoUpdate({ target: schema.pulseTopics.slug, set: { trendingScore: topic.trendingScore, growthRate: topic.growthRate } });
  }

  // Get or create primary demo user for posts
  let defaultUser = await db.query.users.findFirst();
  if (!defaultUser) {
    const { randomUUID } = await import('node:crypto');
    const [createdUser] = await db.insert(schema.users).values({
      id: randomUUID() as any,
      email: 'alex.dev@capabilio.ai',
      role: 'student',
    }).returning();
    defaultUser = createdUser;
    if (defaultUser) {
      await db.insert(schema.profiles).values({
        userId: defaultUser.id,
        displayName: 'Alex Chen',
        headline: 'Aspiring Software Engineer • ELO 1,092',
      }).onConflictDoNothing();
    }
  }

  if (defaultUser) {
    // Clear old seeded pulse posts to keep fresh
    await db.delete(schema.pulsePosts);

    for (const p of pulsePostsData) {
      const [insertedPost] = await db.insert(schema.pulsePosts).values({
        userId: defaultUser.id,
        authorName: p.authorName,
        authorHeadline: p.authorHeadline,
        authorRole: p.authorRole,
        category: p.category,
        title: p.title ?? null,
        content: p.content,
        tags: p.tags,
        domain: p.domain,
        signalType: p.signalType ?? null,
        signalNote: p.signalNote ?? null,
        codeSnippet: p.codeSnippet ?? null,
        evidenceData: p.evidenceData ?? null,
        actionPrompt: p.actionPrompt ?? null,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
      }).returning();

      if (insertedPost && p.comments) {
        for (const c of p.comments) {
          await db.insert(schema.pulseComments).values({
            postId: insertedPost.id,
            userId: defaultUser.id,
            authorName: c.authorName,
            authorHeadline: c.authorHeadline,
            content: c.content,
          });
        }
      }
    }
  }

  console.warn('✅ All roles, skills, missions, and Pulse feed successfully seeded!');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
