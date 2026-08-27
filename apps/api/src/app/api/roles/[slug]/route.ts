export const dynamic = 'force-dynamic';

import { ok, notFound, serverError } from '@/lib/auth';
import { db } from '@capabilio/db';
import { roles, roleSkills, skills } from '@capabilio/db';
import { eq, and } from 'drizzle-orm';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  try {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, params.slug), eq(roles.isActive, true)),
      with: { discipline: true, knowledge: true },
    });

    if (!role) return notFound('Role');

    // Get role skills
    const roleSkillsData = await db.query.roleSkills.findMany({
      where: eq(roleSkills.roleId, role.id),
      with: { skill: true },
      orderBy: (rs, { desc }) => [desc(rs.weight)],
    });

    return ok({ role, skills: roleSkillsData });
  } catch (error) {
    console.error('Get role error:', error);
    return serverError();
  }
}
