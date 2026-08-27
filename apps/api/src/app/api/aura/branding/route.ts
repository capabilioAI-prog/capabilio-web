export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getAuthenticatedUser, ok, unauthorized, badRequest, serverError } from '@/lib/auth';
import { db, personalBrandingProfiles, careerGoals, roles, profiles, submissions, userSkills } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const ROLE_BRANDING_TEMPLATES: Record<string, {
  scriptTemplate: (name: string, role: string, skills: string[], achievement: string) => string;
  defaultCapabilities: string[];
}> = {
  'Software Engineer': {
    scriptTemplate: (name, role, skills, achievement) =>
      `Hi, I'm ${name}, a ${role} specializing in reliable backend architectures, resilient APIs, and deterministic testing. Through Capabilio Arena, I've solved production regressions in distributed systems, built token-bucket rate limiters, and demonstrated high-confidence execution with zero flaky test tolerance. ${achievement}`,
    defaultCapabilities: ['API Architecture & Rate Limiting', 'Deterministic Testing & TDD', 'PostgreSQL Query Optimization', 'Distributed Error Handling'],
  },
  'Cybersecurity Analyst': {
    scriptTemplate: (name, role, skills, achievement) =>
      `Hi, I'm ${name}, a ${role} dedicated to proactive threat detection, SOC log telemetry triage, and rapid incident response. In simulated high-stakes environments, I've isolated brute-force attack vectors, correlated IOC signatures, and drafted zero-day remediation playbooks. ${achievement}`,
    defaultCapabilities: ['SOC Telemetry & Log Triage', 'IOC Correlation & Threat Hunting', 'Incident Containment & Firewall Rules', 'SIEM Rule Engineering'],
  },
  'Database Administrator': {
    scriptTemplate: (name, role, skills, achievement) =>
      `Hi, I'm ${name}, a ${role} focused on relational performance tuning, high-availability replication, and query execution plan optimization. I've eliminated sequential table scans on multi-million row datasets and implemented bulletproof automated backup recovery strategies. ${achievement}`,
    defaultCapabilities: ['EXPLAIN ANALYZE Cost Optimization', 'Composite B-Tree & GIN Indexing', 'WAL Streaming & Disaster Recovery', 'Transaction Isolation & Row Locks'],
  },
  'ML / AI Engineer': {
    scriptTemplate: (name, role, skills, achievement) =>
      `Hi, I'm ${name}, an ${role} bridging data transformations, model inference, and RAG pipelines. I focus on optimizing Precision-Recall curves under class imbalance, vectorized feature engineering, and robust LLM orchestration. ${achievement}`,
    defaultCapabilities: ['Vector Embeddings & RAG Architecture', 'Precision-Recall Threshold Optimization', 'Pandas/NumPy Data Pipelines', 'Scikit-Learn Classifier Tuning'],
  },
  'Frontend Developer': {
    scriptTemplate: (name, role, skills, achievement) =>
      `Hi, I'm ${name}, a ${role} focused on modern component architectures, Web Accessibility (a11y), and responsive design systems. I've debugged client state caching, resolved race conditions in form pipelines, and crafted accessible user experiences. ${achievement}`,
    defaultCapabilities: ['React Custom Hook Architecture', 'Tailwind Design System Tokens', 'Web Accessibility (ARIA / Keyboard Nav)', 'Client State Caching & Optimistic UI'],
  }
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    // Find active role
    const goal = await db.query.careerGoals.findFirst({
      where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
    });

    const activeRole = await db.query.roles.findFirst({
      where: goal ? eq(roles.id, goal.targetRoleId) : eq(roles.slug, 'software-engineer'),
    });

    const roleId = activeRole!.id;
    const roleName = activeRole!.name;

    let branding = await db.query.personalBrandingProfiles.findFirst({
      where: and(eq(personalBrandingProfiles.userId, user.id as any), eq(personalBrandingProfiles.roleId, roleId)),
    });

    if (!branding) {
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, user.id as any),
      });

      const fallbackTpl = ROLE_BRANDING_TEMPLATES['Software Engineer']!;
      const template = ROLE_BRANDING_TEMPLATES[roleName] || fallbackTpl;
      const displayName = profile?.displayName || user.email?.split('@')[0] || 'Venkata Kopuri';
      const initialScript = template.scriptTemplate(displayName, roleName, template.defaultCapabilities, "Ready to deliver impact on day one.");

      const [created] = await db.insert(personalBrandingProfiles).values({
        userId: user.id as any,
        roleId: roleId as any,
        targetRoleName: roleName,
        scriptText: initialScript,
        videoStatus: 'ready',
        durationSeconds: 45,
        topCapabilities: template.defaultCapabilities,
        achievements: ['Completed Arena Sprint Simulation with 100/100 deterministic pass', 'Verified 4 core competencies in Vault'],
        isPublished: true,
      }).returning();

      branding = created;
    }

    return ok({ branding });
  } catch (error: any) {
    console.error('Get branding error:', error);
    return serverError(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const goal = await db.query.careerGoals.findFirst({
      where: and(eq(careerGoals.userId, user.id as any), eq(careerGoals.isActive, true)),
    });

    const activeRole = await db.query.roles.findFirst({
      where: goal ? eq(roles.id, goal.targetRoleId) : eq(roles.slug, 'software-engineer'),
    });

    const roleId = activeRole!.id;
    const roleName = activeRole!.name;

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id as any),
    });

    const fallbackTpl = ROLE_BRANDING_TEMPLATES['Software Engineer']!;
    const template = ROLE_BRANDING_TEMPLATES[roleName] || fallbackTpl;
    const displayName = profile?.displayName || user.email?.split('@')[0] || 'Professional';
    const newScript = template.scriptTemplate(
      displayName,
      roleName,
      template.defaultCapabilities,
      `Demonstrated capability across ${template.defaultCapabilities.slice(0, 2).join(' and ')}.`
    );

    // Upsert
    await db.insert(personalBrandingProfiles).values({
      userId: user.id as any,
      roleId: roleId as any,
      targetRoleName: roleName,
      scriptText: newScript,
      videoStatus: 'ready',
      durationSeconds: 45,
      topCapabilities: template.defaultCapabilities,
      achievements: [`Top 10% ELO Performance in ${roleName} Simulations`, 'Verified Cryptographic Capability Voucher in Vault'],
      isPublished: true,
    }).onConflictDoUpdate({
      target: [personalBrandingProfiles.userId, personalBrandingProfiles.roleId],
      set: {
        scriptText: newScript,
        targetRoleName: roleName,
        topCapabilities: template.defaultCapabilities,
        videoStatus: 'ready',
        updatedAt: new Date(),
      }
    });

    const updated = await db.query.personalBrandingProfiles.findFirst({
      where: and(eq(personalBrandingProfiles.userId, user.id as any), eq(personalBrandingProfiles.roleId, roleId)),
    });

    return ok({ branding: updated }, { status: 201 } as Record<string, unknown>);
  } catch (error: any) {
    console.error('Generate branding error:', error);
    return serverError(error.message);
  }
}
